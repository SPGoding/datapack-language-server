import { ArgumentParserResult } from '../types/Parser'
import { DiagnosticSeverity } from 'vscode-languageserver'
import { getCompletions, getSafeCategory } from '../types/ClientCache'
import ArgumentParser from './ArgumentParser'
import ParsingContext from '../types/ParsingContext'
import ParsingError from '../types/ParsingError'
import StringReader from '../utils/StringReader'
import { locale } from '../locales/Locales'

export default class TeamArgumentParser extends ArgumentParser<string> {
    readonly identity = 'team'

    constructor(
        private readonly isDefinition = false
    ) {
        super()
    }

    parse(reader: StringReader, ctx: ParsingContext): ArgumentParserResult<string> {
        const ans: ArgumentParserResult<string> = {
            data: '',
            errors: [],
            cache: {},
            completions: []
        }
        //#region Completions
        if (reader.cursor === ctx.cursor) {
            ans.completions.push(...getCompletions(ctx.cache, 'teams'))
        }
        //#endregion
        const category = getSafeCategory(ctx.cache, 'teams')
        //#region Data
        const start = reader.cursor
        const value = reader.readUnquotedString()
        ans.data = value
        //#endregion
        //#region Errors & Cache
        if (!value) {
            ans.errors.push(new ParsingError(
                { start, end: start + 1 },
                locale('expected-got',
                    locale('team'),
                    locale('nothing')
                ),
                false
            ))
        } else {
            if (this.isDefinition) {
                ans.cache = {
                    teams: {
                        [value]: {
                            def: [{ start, end: start + value.length }],
                            ref: []
                        }
                    }
                }
            } else {
                if (Object.keys(category).includes(value)) {
                    ans.cache = {
                        teams: {
                            [value]: {
                                def: [],
                                ref: [{ start, end: start + value.length }]
                            }
                        }
                    }
                } else if (ctx.config.lint.strictTeamCheck) {
                    ans.errors.push(new ParsingError(
                        { start, end: start + value.length },
                        locale('undefined-team', locale('meta.quote', value)),
                        undefined,
                        DiagnosticSeverity.Warning
                    ))
                }
            }
        }
        //#endregion
        return ans
    }

    getExamples(): string[] {
        return ['foo']
    }
}
