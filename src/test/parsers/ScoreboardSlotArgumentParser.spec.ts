import assert = require('power-assert')
import ArgumentParserManager from '../../parsers/ArgumentParserManager'
import ParsingError from '../../types/ParsingError'
import ScoreboardSlotArgumentParser from '../../parsers/ScoreboardSlotArgumentParser'
import StringReader from '../../utils/StringReader'
import { describe, it } from 'mocha'
import ParsingContext, { constructContext } from '../../types/ParsingContext'

describe('ScoreboardSlotArgumentParser Tests', () => {
    describe('getExamples() Tests', () => {
        it('Should return examples', () => {
            const parser = new ScoreboardSlotArgumentParser()
            const actual = parser.getExamples()
            assert.deepStrictEqual(actual, ['belowName', 'sidebar.team.red'])
        })
    })

    const parsers = new ArgumentParserManager()
    let ctx: ParsingContext
    before(async () => {
        ctx = await constructContext({ parsers })
    })
    describe('parse() Tests', () => {
        it('Should return data for normal literal slots', () => {
            const parser = new ScoreboardSlotArgumentParser()
            const actual = parser.parse(new StringReader('belowName'), ctx)
            assert(actual.data === 'belowName')
            assert.deepEqual(actual.errors, [])
        })
        it('Should return data for team sidebars', () => {
            const parser = new ScoreboardSlotArgumentParser()
            const actual = parser.parse(new StringReader('sidebar.team.red'), ctx)
            assert(actual.data === 'sidebar.team.red')
            assert.deepEqual(actual.errors, [])
        })
        it('Should return completions for slots', async () => {
            const ctx = await constructContext({ parsers, cursor: 0 })
            const parser = new ScoreboardSlotArgumentParser()
            const actual = parser.parse(new StringReader(''), ctx)
            assert.deepStrictEqual(actual.data, '')
            assert.deepStrictEqual(actual.completions,
                [
                    { label: 'belowName' },
                    { label: 'list' },
                    { label: 'sidebar' }
                ]
            )
        })
        it('Should return completions for teams under ‘sidebar’', async () => {
            const ctx = await constructContext({ parsers, cursor: 8 })
            const parser = new ScoreboardSlotArgumentParser()
            const actual = parser.parse(new StringReader('sidebar.team.'), ctx)
            assert.deepStrictEqual(actual.data, 'sidebar.team.')
            assert.deepStrictEqual(actual.completions,
                [
                    { label: 'team.black' },
                    { label: 'team.dark_blue' },
                    { label: 'team.dark_green' },
                    { label: 'team.dark_aqua' },
                    { label: 'team.dark_red' },
                    { label: 'team.dark_purple' },
                    { label: 'team.gold' },
                    { label: 'team.gray' },
                    { label: 'team.dark_gray' },
                    { label: 'team.blue' },
                    { label: 'team.green' },
                    { label: 'team.aqua' },
                    { label: 'team.red' },
                    { label: 'team.light_purple' },
                    { label: 'team.yellow' },
                    { label: 'team.white' }
                ]
            )
        })
        it('Should return error when the category does not exist', () => {
            const parser = new ScoreboardSlotArgumentParser()
            const actual = parser.parse(new StringReader('foo'), ctx)
            assert.deepStrictEqual(actual.data, 'foo')
            assert.deepStrictEqual(actual.errors, [
                new ParsingError(
                    { start: 0, end: 3 },
                    'expected ‘belowName’, ‘list’, or ‘sidebar’ but got ‘foo’'
                )
            ])
        })
        it('Should return error when the category does not support sub slots', () => {
            const parser = new ScoreboardSlotArgumentParser()
            const actual = parser.parse(new StringReader('list.'), ctx)
            assert.deepStrictEqual(actual.data, 'list')
            assert.deepStrictEqual(actual.errors, [
                new ParsingError(
                    { start: 4, end: 5 },
                    'only ‘sidebar’ has sub slots'
                )
            ])
        })
    })
})
