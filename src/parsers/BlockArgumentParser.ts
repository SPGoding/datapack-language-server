import { arrayToCompletions } from '../utils/utils'
import { ArgumentParserResult, combineArgumentParserResult } from '../types/Parser'
import { nbtDocs } from 'mc-nbt-paths'
import { NbtCompoundTag } from '../types/NbtTag'
import ArgumentParser from './ArgumentParser'
import Block from '../types/Block'
import Config from '../types/Config'
import Identity from '../types/Identity'
import Manager from '../types/Manager'
import ParsingError from '../types/ParsingError'
import StringReader from '../utils/StringReader'
import Time from '../types/Time'
import VanillaBlockDefinitions from '../types/VanillaBlockDefinitions'
import VanillaRegistries from '../types/VanillaRegistries'
import Vector from '../types/Vector'
import { GlobalCache } from '../types/Cache'

export default class BlockArgumentParser extends ArgumentParser<Block> {
    readonly identity = 'block'

    // istanbul ignore next
    constructor(
        private readonly allowTag = false,
        private readonly blockDefinitions = VanillaBlockDefinitions,
        private readonly registries = VanillaRegistries,
        private readonly nbtSchema = nbtDocs
    ) {
        super()
    }

    private config: Config | undefined
    private cache: GlobalCache | undefined
    private manager: Manager<ArgumentParser<any>>

    parse(reader: StringReader, cursor = -1, manager: Manager<ArgumentParser<any>>, config?: Config, cache?: GlobalCache): ArgumentParserResult<Block> {
        const ans: ArgumentParserResult<Block> = {
            data: new Block(new Identity()),
            errors: [],
            cache: {},
            completions: []
        }
        this.manager = manager
        this.config = config
        this.cache = cache

        const idResult = this.manager.get('NamespacedID', ['minecraft:block', this.registries, this.allowTag]).parse(reader, cursor, this.manager, this.config, this.cache)
        const id = idResult.data as Identity
        combineArgumentParserResult(ans, idResult)
        ans.data.id = id

        this.parseStates(reader, cursor, ans, id)
        this.parseTag(reader, cursor, ans, id)

        return ans
    }

    private parseStates(reader: StringReader, cursor: number, ans: ArgumentParserResult<Block>, id: Identity): void {
        if (reader.peek() === Block.StatesBeginSymbol) {
            reader
                .skip()
                .skipWhiteSpace()
            // FIXME: Completions for block tags.
            // FIXME: Do not provide completions for existing keys.
            const definition = this.blockDefinitions[id.toString()]
            let properties = definition ? definition.properties : {}
            properties = properties || {}
            try {
                do {
                    const keyResult = this.manager.get('Literal', Object.keys(properties)).parse(reader, cursor, this.manager, this.config, this.cache)
                    const key = keyResult.data as string
                    ans.completions.push(...keyResult.completions)
                    if (!reader.canRead() || reader.peek() === Block.StatesEndSymbol) {
                        break
                    }
                    keyResult.completions = []
                    combineArgumentParserResult(ans, keyResult)

                    reader
                        .skipWhiteSpace()
                        .expect('=')
                        .skip()
                        .skipWhiteSpace()

                    if (key) {
                        const valueResult = this.manager.get('Literal', properties[key]).parse(reader, cursor, this.manager, this.config, this.cache)
                        const value = valueResult.data as string
                        combineArgumentParserResult(ans, valueResult)
                        reader.skipWhiteSpace()

                        ans.data.states[key] = value
                    }

                    if (reader.peek() === ',') {
                        reader
                            .skip()
                            .skipWhiteSpace()
                    }
                } while (reader.canRead() && reader.peek() !== Block.StatesEndSymbol)

                reader
                    .expect(Block.StatesEndSymbol)
                    .skip()
            } catch (p) {
                ans.errors.push(p)
            }
        }
    }

    private parseTag(reader: StringReader, cursor: number, ans: ArgumentParserResult<Block>, id: Identity): void {
        if (reader.peek() === '{') {
            // FIXME: NBT schema for block tags.
            const tagResult = this.manager.get('NbtTag', ['compound', 'blocks', id.toString(), this.nbtSchema]).parse(reader, cursor, this.manager, this.config, this.cache)
            const tag = tagResult.data as NbtCompoundTag
            combineArgumentParserResult(ans, tagResult)
            ans.data.nbt = tag
        }
    }

    getExamples(): string[] {
        return ['stone', 'minecraft:stone', 'stone[foo=bar]', 'stone{bar:baz}']
    }
}
