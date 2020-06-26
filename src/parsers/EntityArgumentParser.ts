import { locale } from '../locales'
import { NodeRange } from '../nodes/ArgumentNode'
import { EntityNode } from '../nodes/EntityNode'
import { IdentityNode } from '../nodes/IdentityNode'
import { IsMapSorted, Keys, UnsortedKeys } from '../nodes/MapNode'
import { NumberNode } from '../nodes/NumberNode'
import { NumberRangeNode } from '../nodes/NumberRangeNode'
import { EntitySelectorNodeChars, SelectorAdvancementsNode, SelectorArgumentKey, SelectorArgumentKeys, SelectorArgumentNodeChars, SelectorArgumentsNode, SelectorCriteriaNode, SelectorScoresNode, SelectorSortMethod } from '../nodes/SelectorArgumentsNode'
import { StringNode } from '../nodes/StringNode'
import { getCompletions, getSafeCategory } from '../types/ClientCache'
import { ArgumentParserResult, combineArgumentParserResult } from '../types/Parser'
import { ParsingContext } from '../types/ParsingContext'
import { ErrorCode, ParsingError } from '../types/ParsingError'
import { getDiagnosticSeverity } from '../types/StylisticConfig'
import { Token, TokenType } from '../types/Token'
import { arrayToCompletions } from '../utils'
import { StringReader } from '../utils/StringReader'
import { ArgumentParser } from './ArgumentParser'
import { MapParser } from './MapParser'
import { StringType } from './StringArgumentParser'

export class EntityArgumentParser extends ArgumentParser<EntityNode> {
    static identity = 'Entity'
    readonly identity = 'entity'
    private static readonly UuidPattern = /^[A-F0-9]{1,8}-[A-F0-9]{1,4}-[A-F0-9]{1,4}-[A-F0-9]{1,4}-[A-F0-9]{1,12}$/i

    constructor(
        private readonly amount: 'single' | 'multiple',
        private readonly type: 'players' | 'entities',
        private readonly isScoreHolder = false
    ) { super() }

    parse(reader: StringReader, ctx: ParsingContext): ArgumentParserResult<EntityNode> {
        if (reader.peek() === '@') {
            return this.parseSelector(reader, ctx)
        } else {
            return this.parsePlainOrUuid(reader, ctx)
        }
    }

    private parsePlainOrUuid(reader: StringReader, ctx: ParsingContext) {
        const ans: ArgumentParserResult<EntityNode> = {
            data: new EntityNode(),
            tokens: [],
            errors: [],
            cache: {},
            completions: []
        }
        const start = reader.cursor

        // Completions
        if (ctx.cursor === start) {
            ans.completions.push(...getCompletions(ctx.cache, 'entities'))
            if (this.isScoreHolder) {
                ans.completions.push(...getCompletions(ctx.cache, 'score_holders'))
            }
            ans.completions.push(...arrayToCompletions(['@a', '@e', '@p', '@r', '@s']))
        }

        // Data
        let plain
        if (this.isScoreHolder) {
            plain = reader.readUntilOrEnd(' ')
        } else {
            plain = reader.readUnquotedString()
        }
        if (plain) {
            ans.data.plain = plain
            ans.tokens.push(Token.from(start, reader, TokenType.entity))
        }

        // Errors
        if (!plain) {
            ans.errors.push(new ParsingError({ start, end: start + 1 },
                locale('expected-got',
                    locale('entity'),
                    locale('nothing')
                ),
                false
            ))
        }
        if (this.isScoreHolder && plain.length > 40) {
            ans.errors.push(
                new ParsingError(
                    { start, end: start + plain.length },
                    locale('too-long', locale('punc.quote', plain), locale('score-holder'), 40)
                )
            )
        } else if (!this.isScoreHolder && plain.length > 16 && !EntityArgumentParser.UuidPattern.test(plain)) {
            ans.errors.push(
                new ParsingError(
                    { start, end: start + plain.length },
                    locale('too-long', locale('punc.quote', plain), locale('entity'), 16)
                )
            )
        }

        // Cache
        const category = getSafeCategory(ctx.cache, 'entities')
        if (Object.keys(category).includes(plain)) {
            ans.cache = {
                entities: {
                    [plain]: {
                        def: [],
                        ref: [{ start, end: start + plain.length }]
                    }
                }
            }
        }

        ans.data[NodeRange] = { start, end: reader.cursor }

        return ans
    }

    private parseSelector(reader: StringReader, ctx: ParsingContext) {
        const ans: ArgumentParserResult<EntityNode> = {
            data: new EntityNode(),
            tokens: [],
            errors: [],
            cache: {},
            completions: []
        }
        const start = reader.cursor
        let isMultiple = false
        let containsNonPlayer = false

        //#region Completions
        if (ctx.cursor === start + 1) {
            ans.completions.push(...arrayToCompletions(['a', 'e', 'p', 'r', 's']))
        }
        //#endregion

        //#region Data
        const excludedArguments: SelectorArgumentKey[] = []
        /// Variable
        reader
            .expect('@')
            .skip()
        const variable = reader.read()
        if (EntityArgumentParser.isVariable(variable)) {
            ans.data.variable = variable
            switch (variable) {
                case 'a':
                    excludedArguments.push('type')
                    isMultiple = true
                    break
                case 'e':
                    isMultiple = true
                    containsNonPlayer = true
                    break
                case 'p':
                case 'r':
                    excludedArguments.push('type')
                    break
                case 's':
                default:
                    excludedArguments.push('limit', 'sort')
                    break
            }
        } else {
            ans.errors.push(new ParsingError(
                { start: start + 1, end: start + 2 },
                locale('unexpected-selector-variable', locale('punc.quote', variable))
            ))
        }
        //#region Tokens
        ans.tokens.push(Token.from(start, reader, TokenType.entity))
        //#endregion
        /// Arguments
        if (reader.peek() === '[') {
            const pushSafely = (ans: ArgumentParserResult<SelectorArgumentsNode>, key: any, result: any) => {
                ans.data[key] = ans.data[key] || []
                ans.data[key].push(result.data)
                ans.data[UnsortedKeys].pop()
                ans.data[UnsortedKeys].push(key)
            }
            const dealWithNegativableArray = (ans: ArgumentParserResult<SelectorArgumentsNode>, parser: ArgumentParser<any>, key: string) => {
                const keyNeg = `${key}Neg`
                if (ctx.cursor === reader.cursor) {
                    ans.completions.push({ label: '!' })
                }
                const isNegative = reader.peek() === '!'
                if (isNegative) {
                    reader
                        .skip()
                        .skipWhiteSpace()
                }
                let isValueEmpty = false
                if (reader.peek() === ',' || reader.peek() === ']') {
                    isValueEmpty = true
                }
                const result = parser.parse(reader, ctx)
                if (isValueEmpty) {
                    result.errors = []
                }
                if (isNegative) {
                    pushSafely(ans, keyNeg, result)
                } else {
                    pushSafely(ans, key, result)
                    if (key === 'type') {
                        const id = (result.data as IdentityNode).toString()
                        if (id === 'minecraft:player') {
                            containsNonPlayer = false
                        } else {
                            containsNonPlayer = true
                        }
                    }
                }
                combineArgumentParserResult(ans, result)
            }

            const argumentAns: ArgumentParserResult<SelectorArgumentsNode> = {
                data: new SelectorArgumentsNode(),
                tokens: [], errors: [], cache: {}, completions: []
            }
            // We assign `argumentAns.data` to `ans.data.argument` first so that we can use
            // `ans.data.argument` to access it while parsing.
            ans.data.argument = argumentAns.data
            new MapParser<SelectorArgumentsNode>(
                EntitySelectorNodeChars,
                (argumentAns, reader, ctx) => {
                    const start = reader.cursor
                    const result = ctx.parsers
                        .get('String', [
                            StringType.String,
                            SelectorArgumentKeys.filter(v => !excludedArguments.includes(v)),
                            'selectorKeyQuote', 'selectorKeyQuoteType'
                        ])
                        .parse(reader, ctx) as ArgumentParserResult<StringNode>
                    const key = result.data.value
                    /* istanbul ignore else */
                    if (key) {
                        argumentAns.data[Keys][key] = result.data
                    }
                    result.tokens = [Token.from(start, reader, TokenType.property)]
                    return { ...result, data: key }
                },
                (argumentAns, reader, ctx, key) => {
                    if (key === 'sort') {
                        const start = reader.cursor
                        const result = ctx.parsers.get('Literal', ['arbitrary', 'furthest', 'nearest', 'random']).parse(reader, ctx)
                        if (result.data) {
                            argumentAns.data.sort = result.data as SelectorSortMethod
                        }
                        result.tokens = [Token.from(start, reader, TokenType.string)]
                        combineArgumentParserResult(argumentAns, result)
                    } else if (key === 'x' || key === 'y' || key === 'z' || key === 'dx' || key === 'dy' || key === 'dz') {
                        const result: ArgumentParserResult<NumberNode> = ctx.parsers.get('Number', ['float']).parse(reader, ctx)
                        argumentAns.data[key] = result.data
                        combineArgumentParserResult(argumentAns, result)
                    } else if (key === 'limit') {
                        const result: ArgumentParserResult<NumberNode> = ctx.parsers.get('Number', ['integer', 1]).parse(reader, ctx)
                        argumentAns.data.limit = result.data
                        if (argumentAns.data.limit.valueOf() === 1) {
                            isMultiple = false
                        } else {
                            isMultiple = true
                        }
                        combineArgumentParserResult(argumentAns, result)
                    } else if (key === 'gamemode') {
                        dealWithNegativableArray(argumentAns, ctx.parsers.get('Literal', ['adventure', 'creative', 'spectator', 'survival']), key)
                    } else if (key === 'name') {
                        dealWithNegativableArray(argumentAns, ctx.parsers.get('String', [StringType.String, null, 'stringQuote', 'stringQuoteType']), key)
                    } else if (key === 'nbt') {
                        dealWithNegativableArray(argumentAns, ctx.parsers.get('Nbt', [
                            'Compound', 'minecraft:entity', getNbtdocRegistryId(ans.data), true
                        ]), key)
                    } else if (key === 'predicate') {
                        dealWithNegativableArray(argumentAns, ctx.parsers.get('Identity', ['$predicates']), key)
                    } else if (key === 'tag') {
                        dealWithNegativableArray(argumentAns, ctx.parsers.get('Tag'), key)
                    } else if (key === 'team') {
                        dealWithNegativableArray(argumentAns, ctx.parsers.get('Team'), key)
                    } else if (key === 'type') {
                        dealWithNegativableArray(argumentAns, ctx.parsers.get('Identity', ['minecraft:entity_type', true]), key)
                    } else if (key === 'distance') {
                        const result = ctx.parsers.get('NumberRange', ['float']).parse(reader, ctx)
                        argumentAns.data[key] = result.data
                        combineArgumentParserResult(argumentAns, result)
                    } else if (key === 'x_rotation' || key === 'y_rotation') {
                        const result = ctx.parsers.get('NumberRange', ['float', true]).parse(reader, ctx)
                        argumentAns.data[key] = result.data
                        combineArgumentParserResult(argumentAns, result)
                    } else if (key === 'level') {
                        const result = ctx.parsers.get('NumberRange', ['integer']).parse(reader, ctx)
                        argumentAns.data[key] = result.data
                        combineArgumentParserResult(argumentAns, result)
                    } else if (key === 'advancements') {
                        const advancementsAns: ArgumentParserResult<SelectorAdvancementsNode> = {
                            data: new SelectorAdvancementsNode(),
                            tokens: [], errors: [], cache: {}, completions: []
                        }
                        new MapParser<SelectorAdvancementsNode>(
                            SelectorArgumentNodeChars,
                            (ans, reader, ctx) => {
                                const result: ArgumentParserResult<IdentityNode> = ctx.parsers
                                    .get('Identity', ['$advancements'])
                                    .parse(reader, ctx)
                                const adv = result.data.toString()
                                /* istanbul ignore else */
                                if (adv) {
                                    ans.data[Keys][adv] = result.data
                                }
                                return { ...result, data: adv }
                            },
                            (ans, reader, ctx, adv) => {
                                if (reader.peek() === '{') {
                                    const criteriaAns: ArgumentParserResult<SelectorCriteriaNode> = {
                                        data: new SelectorCriteriaNode(),
                                        tokens: [], errors: [], cache: {}, completions: []
                                    }
                                    ans.data[adv] = criteriaAns.data
                                    new MapParser<SelectorCriteriaNode>(
                                        SelectorArgumentNodeChars,
                                        (criteriaAns, reader, ctx) => {
                                            const start = reader.cursor
                                            const result: ArgumentParserResult<StringNode> = ctx.parsers
                                                .get('String', [StringType.String, null, 'selectorKeyQuote', 'selectorKeyQuoteType'])
                                                .parse(reader, ctx)
                                            result.tokens = [Token.from(start, reader, TokenType.property)]
                                            const crit = result.data.value
                                            /* istanbul ignore else */
                                            if (crit) {
                                                criteriaAns.data[Keys][crit] = result.data
                                            }
                                            return { ...result, data: crit }
                                        },
                                        (criteriaAns, reader, ctx, crit) => {
                                            const start = reader.cursor
                                            const boolResult: ArgumentParserResult<string> = ctx.parsers.get('Literal', ['false', 'true']).parse(reader, ctx)
                                            const bool = boolResult.data.toLowerCase() === 'true'
                                            boolResult.tokens = [Token.from(start, reader, TokenType.boolean)]
                                            criteriaAns.data[crit] = bool
                                            combineArgumentParserResult(criteriaAns, boolResult)
                                        }
                                    ).parse(criteriaAns, reader, ctx)
                                    combineArgumentParserResult(ans, criteriaAns)
                                } else {
                                    const start = reader.cursor
                                    const boolResult: ArgumentParserResult<string> = ctx.parsers.get('Literal', ['false', 'true']).parse(reader, ctx)
                                    const bool = boolResult.data.toLowerCase() === 'true'
                                    boolResult.tokens = [Token.from(start, reader, TokenType.boolean)]
                                    ans.data[adv] = bool
                                    combineArgumentParserResult(ans, boolResult)
                                }
                            }
                        ).parse(advancementsAns, reader, ctx)
                        argumentAns.data.advancements = advancementsAns.data
                        combineArgumentParserResult(argumentAns, advancementsAns)
                    } else if (key === 'scores') {
                        const scoresAns: ArgumentParserResult<SelectorScoresNode> = {
                            data: new SelectorScoresNode(),
                            tokens: [], errors: [], cache: {}, completions: []
                        }
                        argumentAns.data.scores = scoresAns.data
                        new MapParser<SelectorScoresNode>(
                            SelectorArgumentNodeChars,
                            (_scoresAns, reader, ctx) => {
                                return ctx.parsers
                                    .get('Objective')
                                    .parse(reader, ctx)
                            },
                            (scoresAns, reader, ctx, objective) => {
                                const rangeResult: ArgumentParserResult<NumberRangeNode> = ctx.parsers.get('NumberRange', ['integer']).parse(reader, ctx)
                                scoresAns.data[objective] = rangeResult.data
                                combineArgumentParserResult(scoresAns, rangeResult)
                            }
                        ).parse(scoresAns, reader, ctx)
                        combineArgumentParserResult(argumentAns, scoresAns)
                    }
                }
            ).parse(argumentAns, reader, ctx)
            combineArgumentParserResult(ans, argumentAns)

            if (ctx.config.lint.selectorSortKeys && !ans.data.argument[IsMapSorted](ctx.config.lint)) {
                ans.errors.push(new ParsingError(
                    ans.data.argument[NodeRange],
                    locale('diagnostic-rule',
                        locale('unsorted-keys'),
                        locale('punc.quote', 'datapack.lint.selectorSortKeys')
                    ),
                    undefined, getDiagnosticSeverity(ctx.config.lint.selectorSortKeys[0]),
                    ErrorCode.SelectorSortKeys
                ))
            }
        }
        //#endregion

        if (this.amount === 'single' && isMultiple) {
            ans.errors.push(new ParsingError(
                { start, end: reader.cursor },
                locale('unexpected-multiple-selector')
            ))
        }

        if (this.type === 'players' && containsNonPlayer) {
            ans.errors.push(new ParsingError(
                { start, end: reader.cursor },
                locale('unexpected-non-player-selector')
            ))
        }

        ans.data[NodeRange] = { start, end: reader.cursor }

        return ans
    }

    private static isVariable(value: string): value is 'p' | 'a' | 'r' | 's' | 'e' {
        return (value === 'p' || value === 'a' || value === 'r' || value === 's' || value === 'e')
    }

    getExamples(): string[] {
        return ['Player', '0123', '@e', '@e[type=foo]', 'dd12be42-52a9-4a91-a8a1-11c01849e498']
    }
}

export function getNbtdocRegistryId(entity: EntityNode): null | string {
    if (entity.variable === 'a' || entity.variable === 'p' || entity.variable === 'r') {
        return 'minecraft:player'
    }
    const firstID = entity.argument.type?.[0]
    if (firstID && !firstID.isTag) {
        return firstID.toString()
    }
    return null
}
