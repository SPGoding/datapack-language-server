import * as assert from 'power-assert'
import { describe, it } from 'mocha'
import StringReader from '../../utils/StringReader'
import NumberArgumentParser from '../../parsers/NumberArgumentParser'
import ParsingError from '../../types/ParsingError'

describe('NumberArgumentParser Tests', () => {
    describe('parse() Tests', () => {
        it('Should parse integer', () => {
            const reader = new StringReader('114514')
            const parser = new NumberArgumentParser('integer')
            const { data } = parser.parse(reader)
            assert(data === 114514)
        })
        it('Should parse float', () => {
            const reader = new StringReader('-.10')
            const parser = new NumberArgumentParser('float')
            const { data } = parser.parse(reader)
            assert(data === -0.1)
        })
        it('Should return error when it expectes an integer but gets a float', () => {
            const reader = new StringReader('114.514')
            const parser = new NumberArgumentParser('integer')
            const { data, errors } = parser.parse(reader)
            assert(isNaN(data))
            assert.deepStrictEqual(errors, [
                new ParsingError({ start: 0, end: 7 }, 'expected an integer but got 114.514')
            ])
        })
    })
    describe('getExamples() Tests', () => {
        it('Should return for integer', () => {
            const parser = new NumberArgumentParser('integer')
            const actual = parser.getExamples()
            assert.deepStrictEqual(actual, ['0', '-123', '123'])
        })
        it('Should return for float', () => {
            const parser = new NumberArgumentParser('float')
            const actual = parser.getExamples()
            assert.deepStrictEqual(actual, ['0', '1.2', '.5', '-1', '-.5', '-1234.56'])
        })
    })
})
