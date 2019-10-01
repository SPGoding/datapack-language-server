import ArgumentParser from './ArgumentParser'
import Config from '../types/Config'
import GlobalCache from '../types/GlobalCache'
import { NbtTag, NbtTagName, NbtContentTagTypeSymbol, NbtTagTypeSymbol, getNbtByteTag, getNbtShortTag, getNbtIntTag, getNbtLongTag, getNbtFloatTag, getNbtDoubleTag, getNbtStringTag, NbtCompoundTag, getNbtCompoundTag, getNbtListTag, NbtByteArrayTag, NbtIntArrayTag, NbtLongArrayTag, NbtListTag, getNbtByteArrayTag, getNbtLongArrayTag, getNbtIntArrayTag, isNbtByteArrayTag, isNbtByteTag, isNbtIntArrayTag, isNbtLongArrayTag, isNbtIntTag, isNbtLongTag } from '../types/NbtTag'
import ParsingError from '../types/ParsingError'
import StringReader from '../utils/StringReader'
import { ArgumentParserResult, combineArgumentParserResult } from '../types/Parser'
import { CompletionItemKind, DiagnosticSeverity } from 'vscode-languageserver'
import { posix } from 'path'
import { ValueList, NBTNode } from 'mc-nbt-paths'
import NbtSchemaWalker from '../utils/NbtSchemaWalker'
import { checkNamingConvention } from '../types/NamingConventionConfig'
import BigNumber from 'bignumber.js'

export default class NbtTagArgumentParser extends ArgumentParser<NbtTag> {
    /**
     * @throws {string}
     */
    private static parseNumber<T = number>(
        str: string,
        range: string[],
        getter: (str: string) => T,
        checker: (value: T) => boolean = _ => true
    ) {
        const value = getter(str)
        if (!checker(value)) {
            throw `expected a number between ${range[0]} and ${range[1]} but got ‘${value}’`
        }
        return value
    }

    private static readonly Patterns: { [type: string]: [RegExp, /** @throws {string} */(value: string) => NbtTag] } = {
        byte: [
            /^[-+]?(?:0|[1-9][0-9]*)b$/i,
            value => getNbtByteTag(NbtTagArgumentParser.parseNumber(
                value.slice(0, -1),
                ['-128', '127'],
                Number,
                (value: number) => -(2 ** 7) <= value && value <= 2 ** 7 - 1
            ))
        ],
        short: [
            /^[-+]?(?:0|[1-9][0-9]*)s$/i,
            value => getNbtShortTag(NbtTagArgumentParser.parseNumber(
                value.slice(0, -1),
                ['-32,768', '32,767'],
                Number,
                (value: number) => -(2 ** 15) <= value && value <= 2 ** 15 - 1
            ))
        ],
        int: [
            /^[-+]?(?:0|[1-9][0-9]*)$/i,
            value => getNbtIntTag(NbtTagArgumentParser.parseNumber(
                value,
                ['-2,147,483,648', '2,147,483,647'],
                Number,
                (value: number) => -(2 ** 31) <= value && value <= 2 ** 31 - 1
            ))
        ],
        long: [
            /^[-+]?(?:0|[1-9][0-9]*)l$/i,
            value => getNbtLongTag(NbtTagArgumentParser.parseNumber<BigNumber>(
                value.slice(0, -1),
                ['-9,223,372,036,854,775,808', '9,223,372,036,854,775,807'],
                (str: string) => new BigNumber(str),
                (value: BigNumber) =>
                    value.isGreaterThanOrEqualTo(new BigNumber('-9223372036854775808')) &&
                    value.isLessThanOrEqualTo(new BigNumber('9223372036854775807'))
            ))
        ],
        float: [
            /^[-+]?(?:[0-9]+[.]?|[0-9]*[.][0-9]+)(?:e[-+]?[0-9]+)?f$/i,
            value => getNbtFloatTag(NbtTagArgumentParser.parseNumber(
                value.slice(0, -1),
                [],
                Number
            ))
        ],
        double: [
            /^[-+]?(?:[0-9]+[.]?|[0-9]*[.][0-9]+)(?:e[-+]?[0-9]+)?d$/i,
            value => getNbtDoubleTag(NbtTagArgumentParser.parseNumber(
                value.slice(0, -1),
                [],
                Number
            ))
        ],
        doubleImplicit: [
            /^[-+]?(?:[0-9]+[.]|[0-9]*[.][0-9]+)(?:e[-+]?[0-9]+)?$/i,
            value => getNbtDoubleTag(NbtTagArgumentParser.parseNumber(
                value,
                [],
                Number
            ))
        ],
        false: [/^false$/i, _ => getNbtByteTag(0)],
        true: [/^true$/i, _ => getNbtByteTag(1)]
    }

    private readonly walker = new NbtSchemaWalker()

    private readonly type: NbtTagName[]

    private config: Config
    private cache: GlobalCache

    private currentSchema: NBTNode | ValueList | undefined

    readonly identity = 'nbtTag'

    constructor(type: NbtTagName | NbtTagName[], private readonly category: 'blocks' | 'entities' | 'items') {
        super()
        if (type instanceof Array) {
            this.type = type
        } else {
            this.type = [type]
        }
    }

    parse(reader: StringReader, _parsedArgs: undefined, config: Config, cache: GlobalCache, id?: string): ArgumentParserResult<NbtTag> {
        this.config = config
        this.cache = cache
        if (id) {
            const nbtSchemaPath = `roots/${this.category}.json#${id}`
            this.currentSchema = this.walker.read(undefined, nbtSchemaPath)
        }
        return this.parseTag(reader)
    }

    private parseTag(reader: StringReader): ArgumentParserResult<NbtTag> {
        switch (reader.peek()) {
            case '{':
                return this.parseCompoundTag(reader)
            case '[':
                return this.parseListOrArray(reader)
            default:
                return this.parsePrimitiveTag(reader)
        }
    }

    private parseCompoundTag(reader: StringReader): ArgumentParserResult<NbtCompoundTag> {
        const ans: ArgumentParserResult<NbtCompoundTag> = {
            data: getNbtCompoundTag({}),
            errors: [],
            cache: { def: {}, ref: {} },
            completions: []
        }
        ans.errors = []
        try {
            reader
                .expect('{')
                .skip()
                .skipWhiteSpace()
            if (reader.peek() === '}') {
                reader.skip()
            } else {
                while (reader.canRead() && reader.peek() !== '}') {
                    const start = reader.cursor
                    const key = reader.readString()
                    if (!checkNamingConvention(key, this.config.lint.nameOfSnbtCompoundTagKeys)) {
                        ans.errors.push(
                            new ParsingError({ start, end: start + key.length + 1 }, `found invalid key ‘${key}’ which doesn't follow ${this.config.lint.nameOfSnbtCompoundTagKeys}`, true, DiagnosticSeverity.Warning)
                        )
                    }
                    reader
                        .skipWhiteSpace()
                        .expect(':')
                        .skip()
                        .skipWhiteSpace()
                    const result = this.parseTag(reader)
                    reader.skipWhiteSpace()
                    if (reader.peek() === ',') {
                        reader
                            .skip()
                            .skipWhiteSpace()
                    }
                    if (ans.data[key] !== undefined) {
                        ans.errors.push(
                            new ParsingError({ start, end: start + key.length + 1 }, `duplicate compound key ‘${key}’`)
                        )
                    }
                    ans.data[key] = result.data
                    combineArgumentParserResult(ans, result)
                }
                reader
                    .expect('}')
                    .skip()
            }
        } catch (p) {
            ans.errors.push(p)
        } finally {
            return ans
        }
    }

    private parseListOrArray(reader: StringReader): ArgumentParserResult<NbtTag> {
        const ans: ArgumentParserResult<NbtTag> = {
            data: getNbtListTag([]),
            errors: [],
            cache: { def: {}, ref: {} },
            completions: []
        }
        ans.errors = []
        try {
            reader.expect('[')
            let result: ArgumentParserResult<NbtByteArrayTag | NbtIntArrayTag | NbtLongArrayTag | NbtListTag>
            if (reader.canRead(3) && /^[BIL]$/.test(reader.peek(1)) && reader.peek(2) === ';') {
                // Parse as an array.
                result = this.parseArray(reader)
            } else {
                // Parse as a list.
                result = this.parseList(reader)
            }
            ans.data = result.data
            combineArgumentParserResult(ans, result)
        } catch (p) {
            ans.errors.push(p)
        } finally {
            return ans
        }
    }

    /**
     * @throws {ParsingError}
     */
    private parseArray(reader: StringReader): ArgumentParserResult<NbtByteArrayTag | NbtIntArrayTag | NbtLongArrayTag> {
        const ans: ArgumentParserResult<NbtByteArrayTag | NbtIntArrayTag | NbtLongArrayTag> = {
            data: getNbtByteArrayTag([]),
            errors: [],
            cache: { def: {}, ref: {} },
            completions: []
        }
        ans.errors = []
        try {
            reader
                .expect('[')
                .skip()
            const start = reader.cursor
            const type = reader.read()
            switch (type) {
                case 'B':
                    ans.data = getNbtByteArrayTag([])
                    break
                case 'I':
                    ans.data = getNbtIntArrayTag([])
                    break
                case 'L':
                    ans.data = getNbtLongArrayTag([])
                    break
                default:
                    throw new ParsingError({ start, end: start + 1 }, `invalid array type ‘${type}’. should be one of ‘B’, ‘I’ and ‘L’`)
            }
            reader
                .expect(';')
                .skip()
                .skipWhiteSpace()
            while (reader.canRead() && reader.peek() !== ']') {
                const start = reader.cursor
                const result = this.parsePrimitiveTag(reader)
                combineArgumentParserResult(ans, result)
                reader.skipWhiteSpace()
                if (reader.peek() === ',') {
                    reader
                        .skip()
                        .skipWhiteSpace()
                }
                if (isNbtByteArrayTag(ans.data)) {
                    if (isNbtByteTag(result.data)) {
                        ans.data.push(result.data)
                    } else {
                        ans.errors.push(
                            new ParsingError({ start, end: reader.cursor }, 'expected a byte tag')
                        )
                    }
                } else if (isNbtIntArrayTag(ans.data)) {
                    if (isNbtIntTag(result.data)) {
                        ans.data.push(result.data)
                    } else {
                        ans.errors.push(
                            new ParsingError({ start, end: reader.cursor }, 'expected an int tag')
                        )
                    }
                } else if (isNbtLongArrayTag(ans.data)) {
                    if (isNbtLongTag(result.data)) {
                        ans.data.push(result.data)
                    } else {
                        ans.errors.push(
                            new ParsingError({ start, end: reader.cursor }, 'expected a long tag')
                        )
                    }
                }
            }
            reader
                .expect(']')
                .skip()
        } catch (p) {
            ans.errors.push(p)
        } finally {
            return ans
        }
    }

    private parseList(reader: StringReader): ArgumentParserResult<NbtListTag> {
        const ans: ArgumentParserResult<NbtListTag> = {
            data: getNbtListTag([]),
            errors: [],
            cache: { def: {}, ref: {} },
            completions: []
        }
        ans.errors = []
        try {
            reader
                .expect('[')
                .skip()
                .skipWhiteSpace()
            while (reader.canRead() && reader.peek() !== ']') {
                const start = reader.cursor
                const result = this.parseTag(reader)
                const end = reader.cursor
                combineArgumentParserResult(ans, result)
                reader.skipWhiteSpace()
                if (reader.peek() === ',') {
                    reader
                        .skip()
                        .skipWhiteSpace()
                }
                if (!ans.data[NbtContentTagTypeSymbol]) {
                    ans.data[NbtContentTagTypeSymbol] = result.data[NbtTagTypeSymbol]
                } else if (ans.data[NbtContentTagTypeSymbol] === result.data[NbtTagTypeSymbol]) {
                    ans.data.push(result.data)
                } else {
                    ans.errors.push(
                        new ParsingError(
                            { start, end },
                            `expected a(n) ‘${ans.data[NbtContentTagTypeSymbol]}’ tag but got a(n) ‘${result.data[NbtTagTypeSymbol]}’ tag`
                        )
                    )
                }
            }
            reader
                .expect(']')
                .skip()
        } catch (p) {
            ans.errors.push(p)
        } finally {
            return ans
        }
    }

    private parsePrimitiveTag(reader: StringReader): ArgumentParserResult<NbtTag> {
        if (StringReader.isQuote(reader.peek())) {
            // Parse as a quoted string.
            try {
                const value = reader.readQuotedString()
                return {
                    data: getNbtStringTag(value),
                    errors: [],
                    cache: { def: {}, ref: {} },
                    completions: []
                }
            } catch (p) {
                return {
                    data: getNbtStringTag(''),
                    errors: [p as ParsingError],
                    cache: { def: {}, ref: {} },
                    completions: []
                }
            }
        } else {
            // Parse as an unquoted string or number.
            const start = reader.cursor
            const value = reader.readUnquotedString()
            if (value.length === 0) {
                return {
                    data: getNbtStringTag(''),
                    errors: [new ParsingError({ start, end: start + 1 }, 'expected a tag but got nothing')],
                    cache: { def: {}, ref: {} },
                    completions: []
                }
            } else {
                try {
                    // Try parsing as a number.
                    for (const type in NbtTagArgumentParser.Patterns) {
                        if (NbtTagArgumentParser.Patterns.hasOwnProperty(type)) {
                            const [pattern, func] = NbtTagArgumentParser.Patterns[type]
                            if (pattern.test(value)) {
                                return {
                                    data: func(value),
                                    errors: [],
                                    cache: { def: {}, ref: {} },
                                    completions: []
                                }
                            }
                        }
                    }
                    throw 'failed to match all patterns'
                } catch (s) {
                    // Parse as an unquoted string.
                    if (s === 'failed to match all patterns') {
                        // Ignore `s`.
                        return {
                            data: getNbtStringTag(value),
                            errors: [],
                            cache: { def: {}, ref: {} },
                            completions: []
                        }
                    } else {
                        return {
                            data: getNbtStringTag(value),
                            errors: [new ParsingError({ start, end: reader.cursor }, s, true, DiagnosticSeverity.Warning)],
                            cache: { def: {}, ref: {} },
                            completions: []
                        }
                    }
                }
            }
        }
    }

    getExamples(): string[] {
        const ans: string[] = []
        const examplesOfNames: { [name in NbtTagName]: string[] } = {
            byte: ['0b'],
            byte_array: ['[B; 0b],'],
            compound: ['{}', '{foo: bar}'],
            double: ['0.0d'],
            float: ['0.0f'],
            int: ['0'],
            int_array: ['[I; 0]'],
            list: ['[]', '[foo, "bar"]'],
            long: ['0L'],
            long_array: ['[L; 0L]'],
            short: ['0s'],
            string: ['"foo"', 'foo', "'foo'"]
        }
        for (const name of this.type) {
            const examples = examplesOfNames[name]
            ans.push(...examples)
        }

        return ans
    }
}
