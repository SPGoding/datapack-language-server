import { TextDocument } from 'vscode-json-languageservice'
import { NodeRange } from '../nodes/ArgumentNode'
import { TextComponentNode } from '../nodes/TextComponent'
import { parseJsonNode } from '../services/common'
import { ArgumentParserResult, combineArgumentParserResult } from '../types/Parser'
import { ParsingContext } from '../types/ParsingContext'
import { ParsingError } from '../types/ParsingError'
import { JsonSchemaHelper } from '../utils/JsonSchemaHelper'
import { StringReader } from '../utils/StringReader'
import { ArgumentParser } from './ArgumentParser'

export class TextComponentArgumentParser extends ArgumentParser<TextComponentNode> {
    static identity = 'TextComponent'
    readonly identity = 'textComponent'

    /* istanbul ignore next */
    parse(reader: StringReader, ctx: ParsingContext): ArgumentParserResult<TextComponentNode> {
        const start = reader.cursor
        const raw = reader.readRemaining()
        const end = reader.cursor
        const ans: ArgumentParserResult<TextComponentNode> = {
            data: new TextComponentNode(raw),
            tokens: [], errors: [], cache: {}, completions: []
        }

        const text = ' '.repeat(start) + raw
        const textDoc = TextDocument.create('dhp:///text_component.json', 'json', 0, text)
        const schema = ctx.jsonSchemas.get('text_component')
        const jsonDocument = parseJsonNode({
            cache: ctx.cache,
            config: ctx.config,
            document: textDoc,
            jsonSchemas: ctx.jsonSchemas,
            roots: ctx.roots,
            schema,
            schemaType: 'text_component',
            service: ctx.service,
            uri: ctx.service.parseUri(ctx.textDoc.uri),
            vanillaData: {
                BlockDefinition: ctx.blockDefinition,
                NamespaceSummary: ctx.namespaceSummary,
                Nbtdoc: ctx.nbtdoc,
                Registry: ctx.registry
            }
        })

        //#region Data.
        ans.data.document = textDoc
        // ans.data.jsonDocument = jsonDocument
        ans.data[NodeRange] = { start, end }
        //#endregion

        //#region Errors.
        ctx.service.jsonService.doValidation(textDoc, jsonDocument.json).then(diagnostics => {
            for (const diag of diagnostics) {
                ans.errors.push(new ParsingError(
                    { start: diag.range.start.character, end: diag.range.end.character },
                    diag.message.endsWith('.') ? diag.message.slice(0, -1) : diag.message,
                    undefined,
                    diag.severity
                ))
            }
        })
        combineArgumentParserResult(ans, jsonDocument)
        //#endregion

        //#region Completions.
        JsonSchemaHelper.suggest(ans.completions, jsonDocument.json.root, schema, ctx)
        //#endregion

        return ans
    }

    /* istanbul ignore next */
    getExamples(): string[] {
        return ['"hello world"', '""', '{"text":"hello world"}', '[""]']
    }
}
