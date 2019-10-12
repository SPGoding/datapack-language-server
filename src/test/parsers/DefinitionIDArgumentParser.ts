import * as assert from 'power-assert'
import DefinitionIDArgumentParser from '../../parsers/DefinitionIDArgumentParser'
import LocalCache, { DescriptionsOfIDs } from '../../types/LocalCache'
import ParsingError from '../../types/ParsingError'
import StringReader from '../../utils/StringReader'
import { describe, it } from 'mocha'

describe('DefinitionIDArgumentParser Tests', () => {
    describe('getExamples() Tests', () => {
        it('Should return correctly', () => {
            const parser = new DefinitionIDArgumentParser('tag')
            const [actual] = parser.getExamples()
            assert(actual === '$foo')
        })
    })
    describe('parse() Tests', () => {
        it('Should return data', () => {
            const parser = new DefinitionIDArgumentParser('tag')
            const reader = new StringReader('foo')
            const { data } = parser.parse(reader)
            assert(data === 'foo')
            assert(reader.cursor === 3)
        })
        it('Should return data even if it is empty', () => {
            const parser = new DefinitionIDArgumentParser('tag')
            const reader = new StringReader(' ')
            const { data } = parser.parse(reader)
            assert(data === '')
            assert(reader.cursor === 0)
        })
        it('Should return errors for empty id', () => {
            const parser = new DefinitionIDArgumentParser('tag')
            const reader = new StringReader(' ')
            const [actual] = parser.parse(reader).errors as ParsingError[]
            assert(actual.range.start === 0)
            assert(actual.range.end === 1)
            assert(actual.message === 'expected a string but got nothing')
            assert(actual.tolerable === true)
        })
        it('Should return cache correctly', () => {
            const parser = new DefinitionIDArgumentParser('tag')
            const reader = new StringReader('foo ')
            const actual = ((parser.parse(reader).cache as LocalCache).def.tags as DescriptionsOfIDs)
            assert.deepStrictEqual(actual, { foo: undefined })
        })
        it('Should not return cache for wrong definition types', () => {
            const parser = new DefinitionIDArgumentParser('wrongType')
            const reader = new StringReader('foo ')
            const { cache } = parser.parse(reader)
            assert.deepStrictEqual(cache, { def: {}, ref: {} })
        })
    })
})
