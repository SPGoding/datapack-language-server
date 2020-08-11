import assert = require('power-assert')
import { describe, it } from 'mocha'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI as Uri } from 'vscode-uri'
import { NodeRange } from '../../nodes'
import { IdentityNode } from '../../nodes/IdentityNode'
import { getId, getRel, getRootUri, getUriFromId, parseSyntaxComponents } from '../../services/common'
import { DatapackLanguageService } from '../../services/DatapackLanguageService'
import { SyntaxComponent } from '../../types'
import { VanillaConfig } from '../../types/Config'
import { UrisOfIds } from '../../types/handlers'

describe('common.ts Tests', () => {
    describe('getRootUri() Tests', () => {
        it('Should append slash', () => {
            const uri = getRootUri('file:///c:/foo')

            assert.deepStrictEqual(uri, Uri.parse('file:///c:/foo/'))
        })
        it('Should not append slash when already exists', () => {
            const uri = getRootUri('file:///c:/foo/')

            assert.deepStrictEqual(uri, Uri.parse('file:///c:/foo/'))
        })
    })
    describe('parseSyntaxComponents() Tests', () => {
        const service = new DatapackLanguageService()
        const uri = Uri.parse('file:///c:/foo')
        it('Should push an empty node at the end of whitespaces', async () => {
            const content = '  \t  '
            const document = TextDocument.create('', '', 0, content)
            const nodes: SyntaxComponent[] = []
            const config = VanillaConfig

            parseSyntaxComponents(service, document, 0, 5, nodes, config, uri)

            assert.deepStrictEqual(nodes, [{
                [NodeRange]: { start: 0, end: 5 },
                args: [], tokens: [], hint: { fix: [], options: [] }
            }])
        })
        it('Should push a parsed node for other input', async () => {
            const content = '# test'
            const document = TextDocument.create('', '', 0, content)
            const nodes: SyntaxComponent[] = []
            const config = VanillaConfig

            parseSyntaxComponents(service, document, 0, 6, nodes, config, uri)

            assert.deepStrictEqual(nodes, [{
                [NodeRange]: { start: 0, end: 6 },
                args: [{ data: '# test', parser: 'string' }],
                tokens: [],
                hint: { fix: [], options: [] }, completions: undefined
            }])
        })
    })
    describe('getRel() Tests', () => {
        it('Should return the relative path of a URI', () => {
            const uri = Uri.parse('file:///c:/bar/data/minecraft/functions/test.mcfunction')
            const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]

            const actual = getRel(uri, roots) as string

            assert(actual.match(/^data[\/\\]minecraft[\/\\]functions[\/\\]test\.mcfunction$/))
        })
        it('Should return undefined', () => {
            const uri = Uri.parse('file:///c:/qux/data/minecraft/functions/test.mcfunction')
            const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]

            const actual = getRel(uri, roots)

            assert(actual === undefined)
        })
    })
    describe('getId() Tests', () => {
        it('Should return the ID', () => {
            const uri = Uri.parse('file:///c:/bar/data/minecraft/functions/test.mcfunction')
            const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]

            const actual = getId(uri, roots)?.toString()

            assert(actual === 'minecraft:test')
        })
    })
    describe('getUriFromId() Tests', () => {
        const pathExists = async () => false
        const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]
        it('Should return cached value', async () => {
            const uri = Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction')
            const urisOfIds: UrisOfIds = new Map([
                ['function|spgoding:foo', uri]
            ])
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert(uri === actual)
        })
        it('Should return null when cannot resolve', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert(actual === null)
        })
        it('Should return the uri if the file can be found in root[0]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])
            const pathExists = async (abs: string) => {
                return !!abs.match(/^c:[\\\/]foo[\\\/]data[\\\/]spgoding[\\\/]functions[\\\/]foo\.mcfunction$/i)
            }

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri if the file can be found in root[1]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])
            const pathExists = async (abs: string) => {
                return !!abs.match(/^c:[\\\/]bar[\\\/]data[\\\/]spgoding[\\\/]functions[\\\/]foo\.mcfunction$/i)
            }

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/bar/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri under the preferred root[0]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = getUriFromId(pathExists, roots, urisOfIds, id, 'function', roots[0])

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri under the preferred root[1]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = getUriFromId(pathExists, roots, urisOfIds, id, 'function', roots[1])

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/bar/data/spgoding/functions/foo.mcfunction'))
        })
    })
})
