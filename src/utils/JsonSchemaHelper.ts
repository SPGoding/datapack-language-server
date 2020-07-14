import { DataModel, INode, LOCALES as JsonLocales, Path, PathElement, PathError, RelativePath, SchemaRegistry, ValidationOption } from '@mcschema/core'
import deepEqual from 'deep-equal'
import { ArrayASTNode, ASTNode, CompletionItem, InsertTextFormat, ObjectASTNode, StringASTNode } from 'vscode-json-languageservice'
import { arrayToCompletions, handleCompletionText, quoteString, remapParserSuggestion } from '.'
import { resolveLocalePlaceholders } from '../locales'
import { LineParser } from '../parsers/LineParser'
import { combineCache, downgradeParsingError, getInnerIndex, IndexMapping, isInRange, LegacyValidateResult, ParserSuggestion, ParsingContext, ParsingError, remapCachePosition, remapParsingErrors, remapTokens, TextRange, ValidateResult } from '../types'
import { StringReader } from './StringReader'

export class JsonSchemaHelper {
    private static readonly Replacers = {
        EmptyObject: 'a6CJ_fNaoTKc1J7SavcrSMGmQjW6HEuk',
        EmptyList: '09v6na643Rr0jeIcBFRGwXJFUvvB_773',
        StringStart: 'WcfESEXkwL5a0nDMC7ZMib6RftqJyvQP',
        StringEnd: 'NR9lafzlCwHbjOIrzXcpZFgNQVpn7kpY',
        LiteralStart: 'gJK7ZIGIpFJlAal2UduKc93rHAOb5K3z',
        LiteralEnd: '1xs2m6JwQaNtXzexThOAwmpTFCIRftZi'
    }

    static validate(ans: ValidateResult, node: ASTNode | undefined, schema: INode, options: JsonSchemaHelperOptions) {
        const model = new DataModel(schema, { historyMax: 1 })
        model.reset(this.restoreValueFromNode(node))

        for (const err of model.errors) {
            ans.errors.push(this.convertSchemaError(err, node))
        }

        if (!node) {
            return
        }

        const path = new Path([], [], model)
        this.walkAstNode(
            node, path, schema,
            (node, path, schema) => {
                const selectedSchema = schema.navigate(path, -1)
                const validationOption = selectedSchema?.validationOption()
                if (validationOption) {
                    this.doDetailedValidate(ans, node, validationOption, options)
                }
            }
        )
    }

    static suggest(ans: CompletionItem[], node: ASTNode | undefined, schema: INode, options: JsonSchemaHelperOptions) {
        if (!node) {
            return
        }
        try {
            const { ctx } = options
            const model = new DataModel(schema, { historyMax: 1 })
            model.reset(this.restoreValueFromNode(node))
            const path = new Path([], [], model)

            const { node: selectedNode, path: selectedPath, type: selectedType } = this.selectNode(node, ctx.cursor, path)
            if (!selectedNode) {
                return
            }
            let result: Partial<LegacyValidateResult> | undefined = undefined
            const out: { mapping: IndexMapping } = { mapping: {} }
            const selectedRange = { start: selectedNode.offset, end: selectedNode.offset + selectedNode.length }
            const selectedSchema = schema.navigate(selectedPath, -1)
            const validationOption = selectedSchema?.validationOption()
            if (selectedType === 'value') {
                if (validationOption && selectedNode.type === 'string') {
                    // Detailed suggestions for the selected string value.
                    const rawReader = new StringReader(ctx.document.getText(), selectedRange.start, selectedRange.end)
                    const value = rawReader.readString(out)
                    const valueReader = new StringReader(value)
                    result = this.doDetailedStringLegacyValidate(
                        valueReader, { ...ctx, cursor: getInnerIndex(out.mapping, ctx.cursor) }, selectedNode, validationOption
                    )
                    if (result.completions) {
                        result.completions = result.completions.map(this.escapeCompletion)
                    }
                } else {
                    // Regular suggestions for selected value.
                    if (selectedNode.type === 'object') {
                        // Regular key suggestions for selected object.
                        if (
                            // The cursor isn't out of the curly braces.
                            selectedRange.start < ctx.cursor && ctx.cursor < selectedRange.end &&
                            // The cursor is not in any properties.
                            selectedNode.properties.reduce<boolean>((p, c) => p && !isInRange(ctx.cursor, this.getNodeRange(c)), true)
                        ) {
                            result = { completions: this.doRegularSuggest(selectedPath, selectedNode, undefined, schema, options) }
                        }
                    } else if (selectedNode.type === 'property') {
                        // Regular value suggestions for selected property
                        result = { completions: this.doRegularSuggest(selectedPath, selectedNode, undefined, schema, options, true) }
                    } else {
                        // Regular value suggestions for selected value
                        result = { completions: this.doRegularSuggest(selectedPath, selectedNode, selectedNode, schema, options) }
                    }
                }
            } else {
                // Regular key suggestions for selected key.
                const objectPath = selectedPath.pop()
                const keyNode = selectedNode as StringASTNode
                const objectNode = selectedNode.parent!.parent as ObjectASTNode
                result = { completions: this.doRegularSuggest(objectPath, objectNode, keyNode, schema, options) }
            }
            if (result?.completions) {
                ans.push(...result.completions.map(v => this.parserSuggestionToCompletionItem(v, out.mapping, ctx)))
            }
        } catch (e) {
            console.error('JsonSchemaHelper#suggest', e)
        }
    }

    private static doRegularSuggest(valuePath: Path, valueNode: ASTNode, replacingNode: ASTNode | undefined, schema: INode, { ctx }: JsonSchemaHelperOptions, atEmptyValue = false): ParserSuggestion[] {
        const replacingRange = replacingNode ? this.getNodeRange(replacingNode) : { start: ctx.cursor, end: ctx.cursor }
        const valueSchema = schema.navigate(valuePath, -1)
        const value: any = {}
        if (valueNode.type === 'object') {
            for (const { keyNode: { value: key } } of valueNode.properties) {
                if (key !== replacingNode?.value) {
                    value[key] = 'exist'
                }
            }
        }
        if (atEmptyValue && valueSchema) {
            const defaultValue = valueSchema.default()
            return [{ ...replacingRange, label: JSON.stringify(defaultValue), insertText: this.getDefaultValueSnippet(defaultValue), insertTextFormat: InsertTextFormat.Snippet }]
        }
        const suggestions = valueSchema?.suggest(valuePath, value) ?? []
        return arrayToCompletions(
            suggestions, replacingRange.start, replacingRange.end,
            valueNode.type === 'object' ? c => {
                // Operations to object keys.
                const key = c.label.slice(1, -1)
                const filterText = c.label
                const childValuePath = valuePath.push(key)
                const childValueSchema = schema.navigate(childValuePath, -1)
                const preselect = childValueSchema?.force()
                const defaultValueSnippet = this.getDefaultValueSnippet(childValueSchema?.default())
                const detail = childValuePath.locale()
                const insertText = `${c.label}: ${defaultValueSnippet}`
                return { ...c, preselect,detail, label: key, filterText, insertText,  insertTextFormat: InsertTextFormat.Snippet }
            } : c => {
                // Operations to other value suggestions.
                if (c.label.startsWith('"')) {
                    return { ...c, label: c.label.slice(1, -1), filterText: c.label, insertText: c.label }
                }
                return c
            }
        )
    }

    private static getDefaultValueSnippet(defaultValue: any) {
        const defaultValueJson = JSON.stringify(defaultValue, this.jsonSnippetReplacer, 4) ?? ''
        return this.resolveJsonSnippetMagicStrings(defaultValueJson)
    }

    /**
     * Replaces some values that require snippet insert positions with some magic strings.
     */
    private static jsonSnippetReplacer(this: any, _key: string, value: any): any {
        if (deepEqual(value, {})) {
            return JsonSchemaHelper.Replacers.EmptyObject
        } else if (deepEqual(value, [])) {
            return JsonSchemaHelper.Replacers.EmptyList
        } else if (typeof value === 'string') {
            return `${JsonSchemaHelper.Replacers.StringStart} ${value} ${JsonSchemaHelper.Replacers.StringEnd}`
        } else if (typeof value === 'boolean' || typeof value === 'number' || value === null) {
            return `${JsonSchemaHelper.Replacers.LiteralStart} ${value} ${JsonSchemaHelper.Replacers.LiteralEnd}`
        } else {
            return value
        }
    }

    /**
     * Resolve the magic strings provided from `jsonSnippetReplacer` function with the actual TextMate syntax.
     */
    private static resolveJsonSnippetMagicStrings(value: string) {
        let insertIndex = 1
        const replaceOneTurn = (value: string) => value
            .replace(`"${this.Replacers.EmptyObject}"`, `{$${insertIndex++}}`)
            .replace(`"${this.Replacers.EmptyList}"`, `[$${insertIndex++}]`)
            .replace(new RegExp(`"${this.Replacers.StringStart} (.*?) ${this.Replacers.StringEnd}"`), `"$\${${insertIndex++}:$1}"`)
            .replace(new RegExp(`"${this.Replacers.LiteralStart} (.*?) ${this.Replacers.LiteralEnd}"`), `$\${${insertIndex++}:$1}`)
        while (true) {
            const newValue = replaceOneTurn(value)
            if (newValue === value) {
                return newValue
            } else {
                value = newValue
            }
        }
    }

    /**
     * @param cb A callback that is called on every node.
     */
    private static walkAstNode(node: ASTNode, path: Path, schema: INode, cb: (node: ASTNode, path: Path, schema: INode) => any) {
        cb(node, path, schema)
        if (node.type === 'object') {
            for (const { keyNode, valueNode } of node.properties) {
                if (valueNode) {
                    const childPath = path.push(keyNode.value)
                    this.walkAstNode(valueNode, childPath, schema, cb)
                }
            }
        } else if (node.type === 'array') {
            for (const [i, childNode] of node.items.entries()) {
                const childPath = path.push(i)
                this.walkAstNode(childNode, childPath, schema, cb)
            }
        }
    }

    private static doDetailedValidate(ans: ValidateResult, node: ASTNode, option: ValidationOption, { ctx }: JsonSchemaHelperOptions) {
        const valueRange = this.getNodeRange(node)
        if (option.validator === 'block_state_map') {
            // TODO: JSON block_state_map validation
        } else {
            const out: { mapping: IndexMapping } = { mapping: {} }
            const rawReader = new StringReader(ctx.document.getText(), valueRange.start, valueRange.end)
            const value = rawReader.readString(out)
            const valueReader = new StringReader(value)
            const result = this.doDetailedStringLegacyValidate(valueReader, ctx, node, option)
            this.combineResult(ans, result, out.mapping)
        }
    }

    private static doDetailedStringLegacyValidate(reader: StringReader, ctx: ParsingContext, node: ASTNode, option: ValidationOption): Partial<LegacyValidateResult> {
        let ans: Partial<LegacyValidateResult> = {}
        switch (option.validator) {
            case 'block_state_key': {
                const id = this.navigateRelativePath(node, option.params.id)?.value?.toString() ?? ''
                const keys = Object.keys(ctx.blockDefinition[id]?.properties ?? {})
                ans = new ctx.parsers.Literal(...keys).parse(reader, ctx)
                break
            }
            case 'command':
                ans = new LineParser(
                    option.params.leadingSlash, 'commands', option.params.allowPartial
                ).parse(reader, ctx).data
                break
            case 'entity':
                ans = new ctx.parsers.Entity(
                    option.params.amount, option.params.type, option.params.isScoreHolder
                ).parse(reader, ctx)
                break
            case 'nbt':
                if (option.params.registry) {
                    const id = this.navigateRelativePath(node, option.params.registry.id)?.value?.toString() ?? null
                    ans = new ctx.parsers.Nbt(
                        'Compound', option.params.registry.category, id, option.params.isPredicate
                    ).parse(reader, ctx)
                } else if (option.params.module) {
                    ans = new ctx.parsers.Nbt(
                        'Compound', 'minecraft:block', undefined, option.params.isPredicate, null, option.params.module
                    ).parse(reader, ctx)
                }
                break
            case 'nbt_path':
                ans = new ctx.parsers.NbtPath(
                    option.params?.category ?? 'minecraft:block', option.params?.category ? (option.params.id ?? null) : undefined
                ).parse(reader, ctx)
                break
            case 'objective':
                ans = new ctx.parsers.Objective().parse(reader, ctx)
                break
            case 'resource':
                ans = new ctx.parsers.Identity(
                    option.params.pool, option.params.allowTag, undefined, option.params.allowUnknown
                ).parse(reader, ctx)
                break
            case 'team':
                ans = new ctx.parsers.Team().parse(reader, ctx)
                break
            case 'uuid':
                ans = new ctx.parsers.Uuid().parse(reader, ctx)
                break
            case 'vector':
                ans = new ctx.parsers.Vector(
                    option.params.dimension, option.params.isInteger ? 'integer' : 'float', !option.params.disableLocal, !option.params.disableRelative, option.params.min, option.params.max
                ).parse(reader, ctx)
                break
            default:
                /* istanbul ignore next */
                console.error('doDetailedValidate', new Error(`Unknown validator ${(option as any).validator}`))
                break
        }
        ans.completions = ans?.completions?.map(this.escapeCompletion)
        return ans
    }

    private static escapeCompletion(origin: ParserSuggestion) {
        return handleCompletionText(origin, str => quoteString(str, 'always double', true).slice(1, -1))
    }

    private static parserSuggestionToCompletionItem(origin: ParserSuggestion, mapping: IndexMapping, ctx: ParsingContext) {
        const ans = remapParserSuggestion(origin, mapping)
        ans.textEdit = ans.textEdit ?? { newText: ans.insertText ?? ans.label, range: { start: ctx.document.positionAt(ans.start), end: ctx.document.positionAt(ans.end) } }
        delete ans.start; delete ans.end
        return ans
    }

    private static combineResult(ans: ValidateResult, result: Partial<LegacyValidateResult> | undefined, mapping: IndexMapping) {
        if (result) {
            if (result.cache) {
                remapCachePosition(result.cache, mapping)
                combineCache(ans.cache, result.cache)
            }
            if (result.errors) {
                const downgradedErrors = downgradeParsingError(result.errors)
                remapParsingErrors(downgradedErrors, mapping)
                ans.errors.push(...downgradedErrors)
            }
            if (result.tokens) {
                ans.tokens.push(...remapTokens(result.tokens, mapping, false))
            }
        }
    }

    private static convertSchemaError({ path, params, error }: PathError, node: ASTNode | undefined) {
        const pathElements = path.getArray()
        const range = node ? this.getNodeRange(this.navigateNodes(node, pathElements)) : { start: 0, end: Infinity }
        let message = resolveLocalePlaceholders(JsonLocales.getLocale(error), params) ?? (
            console.error(new Error(`Unknown JSON schema error ‘${error}’`)),
            ''
        )
        if (pathElements.length > 0) {
            message = `${pathElements.join('.')} - ${message}`
        }
        return new ParsingError(range, message)
    }

    /**
     * @param path Will be changed with the remaining elements after navigation.
     */
    private static navigateNodes(node: ASTNode, path: PathElement[]): ASTNode {
        if (path.length === 0) {
            return node
        }
        let childNode: ASTNode | undefined
        const ele = path[0]
        if (typeof ele === 'number') {
            childNode = (node as ArrayASTNode).items[ele]
        } else {
            childNode = (node as ObjectASTNode).properties.find(prop => prop.keyNode.value === ele)?.valueNode
        }
        if (childNode) {
            return this.navigateNodes(childNode, (path.shift(), path))
        } else {
            return node
        }
    }

    /**
     * This function won't work if the path contains any `pop` after `push`, which should be fine.
     * @param path Won't be changed.
     */
    private static navigateRelativePath(node: ASTNode | undefined, path: RelativePath | undefined): ASTNode | undefined {
        if (!path) {
            return undefined
        }
        if (path.length === 0) {
            return node
        }
        let nextNode: ASTNode | undefined
        const ele = path[0]
        if (ele === 'pop') {
            nextNode = node?.parent
            if (nextNode?.type === 'property') {
                nextNode = nextNode.parent
            }
        } else {
            nextNode = node?.type === 'object' ? node.properties.find(prop => prop.keyNode.value === ele.push)?.valueNode : undefined
        }
        return this.navigateRelativePath(nextNode, path.slice(1))
    }

    private static selectNode(node: ASTNode, cursor: number, path: Path, type: 'key' | 'value' = 'value'): SelectNodeResult {
        let ans: SelectNodeResult = { node: undefined, path, type }
        if (!isInRange(cursor, this.getNodeRange(node))) {
            return ans
        }
        const set = (result: SelectNodeResult) => {
            if (result.node) {
                ans = result
            }
        }
        switch (node.type) {
            case 'array':
                for (const [i, item] of node.items.entries()) {
                    set(this.selectNode(item, cursor, path.push(i), 'value'))
                    if (ans.node) {
                        break
                    }
                }
                break
            case 'object':
                for (const property of node.properties) {
                    set(this.selectNode(property, cursor, path, 'value'))
                    if (ans.node) {
                        break
                    }
                }
                break
            case 'property':
                set(this.selectNode(node.keyNode, cursor, path.push(node.keyNode.value), 'key'))
                if (!ans.node) {
                    // Key isn't selected.
                    if (node.valueNode) {
                        set(this.selectNode(node.valueNode, cursor, path.push(node.keyNode.value), 'value'))
                    } else {
                        set({ node, path: path.push(node.keyNode.value), type: 'value' })
                    }
                }
                break
            default:
                break
        }
        if (!ans.node) {
            ans = { node, path, type }
        }
        return ans
    }

    private static restoreValueFromNode(node: ASTNode | undefined): any {
        switch (node?.type) {
            case 'object': {
                const ans: any = {}
                for (const { keyNode, valueNode } of node.properties) {
                    if (valueNode) {
                        ans[JsonSchemaHelper.restoreValueFromNode(keyNode)] = JsonSchemaHelper.restoreValueFromNode(valueNode)
                    }
                }
                return ans
            }
            case 'array':
                return node.items.map(JsonSchemaHelper.restoreValueFromNode)
            case 'boolean':
            case 'null':
            case 'number':
            case 'string':
            default:
                return node?.value
        }
    }

    private static getNodeRange(node: ASTNode): TextRange {
        return { start: node.offset, end: node.offset + node.length }
    }
}

type SelectNodeResult = {
    node: ASTNode | undefined,
    path: Path,
    type: 'key' | 'value'
}

export interface JsonSchemaHelperOptions {
    ctx: ParsingContext,
    schemas: SchemaRegistry
}
