import assert = require('power-assert')
import { describe, it } from 'mocha'
import { NamingConventionConfig, checkNamingConvention } from '../../types/NamingConventionConfig'

describe('NamingConventionConfig Tests', () => {
    describe('checkNamingConvention() Tests', () => {
        it('Should return true for camelCase', () => {
            const identities = ['l', 'lower', 'lowerC', 'lowerIP', 'lowerCamel', 'camelCase']
            const config: NamingConventionConfig = 'camelCase'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === true)
            }
        })
        it('Should return false for camelCase', () => {
            const identities = ['', 'Upper']
            const config: NamingConventionConfig = 'camelCase'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === false)
            }
        })
        it('Should return true for PascalCase', () => {
            const identities = ['U', 'Upper', 'UpperC', 'UpperIP', 'XMLHttpRequest', 'UpperCamel', 'PascalCase']
            const config: NamingConventionConfig = 'PascalCase'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === true)
            }
        })
        it('Should return false for PascalCase', () => {
            const identities = ['', 'lower']
            const config: NamingConventionConfig = 'PascalCase'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === false)
            }
        })
        it('Should return true for snake_case', () => {
            const identities = ['s', 'snake', 'snake_case', 'snake_snake_snake']
            const config: NamingConventionConfig = 'snake_case'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === true)
            }
        })
        it('Should return false for snake_case', () => {
            const identities = ['', 'snake_', 'snAke_snAke']
            const config: NamingConventionConfig = 'snake_case'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === false)
            }
        })
        it('Should return true for SCREAMING_SNAKE_CASE', () => {
            const identities = ['S', 'SCREAMING', 'SCREAMING_SNAKE', 'SCREAMING_SNAKE_CASE']
            const config: NamingConventionConfig = 'SCREAMING_SNAKE_CASE'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === true)
            }
        })
        it('Should return false for SCREAMING_SNAKE_CASE', () => {
            const identities = ['', 'snake', 'SCREAMING_']
            const config: NamingConventionConfig = 'SCREAMING_SNAKE_CASE'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === false)
            }
        })
        it('Should return true for kebab-case', () => {
            const identities = ['kebab', 'kebab-case', 'kebab-kebab-kebab']
            const config: NamingConventionConfig = 'kebab-case'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === true)
            }
        })
        it('Should return false for kebab-case', () => {
            const identities = ['', 'kebab-', 'kebAb-case']
            const config: NamingConventionConfig = 'kebab-case'
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === false)
            }
        })
        it('Should return true for whatever', () => {
            const identities = ['l', 'U', 'camelCase', 'PascalCase', 'snake_case', 'SCREAMING_SNAKE_CASE', 'kebab-case']
            const config: NamingConventionConfig = ['whatever']
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === true)
            }
        })
        it('Should return false for whatever', () => {
            const identities = ['']
            const config: NamingConventionConfig = ['whatever']
            for (const id of identities) {
                const actual = checkNamingConvention(id, config)
                assert(actual === false)
            }
        })
    })
})
