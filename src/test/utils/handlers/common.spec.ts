import assert = require('power-assert')
import { describe, it } from 'mocha'
import { fail } from 'power-assert'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI as Uri } from 'vscode-uri'
import { NodeRange } from '../../../nodes'
import { IdentityNode } from '../../../nodes/IdentityNode'
import { CacheFile } from '../../../types/ClientCache'
import { constructConfig, VanillaConfig } from '../../../types/Config'
import { InfosOfUris, UrisOfIds, UrisOfStrings } from '../../../types/handlers'
import { LineNode } from '../../../types/LineNode'
import { Token, TokenType } from '../../../types/Token'
import { getId, getRel, getRootUri, getUri, getUriFromId, parseString, getOrCreateInfo } from '../../../utils/handlers'
import { mockFunctionInfo } from '../../utils.spec'

describe('common.ts Tests', () => {
    describe('getUri() Tests', () => {
        it('Should return the same object for the same string', () => {
            const uris = new Map()

            const uri1 = getUri('file:///c:/foo/', uris)
            const uri2 = getUri('file:///c:/foo/', uris)

            assert(uri1 === uri2)
        })
    })
    describe('getRootUri() Tests', () => {
        it('Should append slash', () => {
            const uris = new Map()

            const uri = getRootUri('file:///c:/foo', uris)

            assert.deepStrictEqual(uri, Uri.parse('file:///c:/foo/'))
        })
        it('Should not append slash when already exists', () => {
            const uris = new Map()

            const uri = getRootUri('file:///c:/foo/', uris)

            assert.deepStrictEqual(uri, Uri.parse('file:///c:/foo/'))
        })
    })
    describe('parseString() Tests', () => {
        it('Should push an empty node at the end of whitespaces', async () => {
            const content = '  \t  '
            const document = TextDocument.create('', '', 0, content)
            const nodes: LineNode[] = []
            const config = VanillaConfig
            const cacheFile = { cache: {}, advancements: {}, tags: { functions: {} }, files: {}, version: NaN }

            await parseString(document, 0, 5, nodes, config, cacheFile)

            assert.deepStrictEqual(nodes, [{
                [NodeRange]: { start: 0, end: 5 },
                args: [], tokens: [], hint: { fix: [], options: [] }
            }])
        })
        it('Should push a parsed node for other input', async () => {
            const content = '# test'
            const document = TextDocument.create('', '', 0, content)
            const nodes: LineNode[] = []
            const config = VanillaConfig
            const cacheFile = { cache: {}, advancements: {}, tags: { functions: {} }, files: {}, version: NaN }

            await parseString(document, 0, 6, nodes, config, cacheFile)

            assert.deepStrictEqual(nodes, [{
                [NodeRange]: { start: 0, end: 6 },
                args: [{ data: '# test', parser: 'string' }],
                tokens: [new Token({ start: 0, end: 6 }, TokenType.comment)],
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

            const actual = getId(uri, roots) as string

            assert(actual === 'minecraft:test')
        })
    })
    describe('getUriFromId() Tests', () => {
        const pathExists = async () => false
        const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]
        it('Should return cached value', async () => {
            const uri = Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction')
            const uris: UrisOfStrings = new Map([
                ['file:///c:/foo/data/spgoding/functions/foo.mcfunction', uri]
            ])
            const urisOfIds: UrisOfIds = new Map([
                ['functions|spgoding:foo', uri]
            ])
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, uris, urisOfIds, id, 'functions')

            assert(uri === actual)
        })
        it('Should return null when cannot resolve', async () => {
            const uris: UrisOfStrings = new Map()
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, uris, urisOfIds, id, 'functions')

            assert(actual === null)
        })
        it('Should return the uri if the file can be found in root[0]', async () => {
            const uris: UrisOfStrings = new Map()
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])
            const pathExists = async (abs: string) => {
                return !!abs.match(/^c:[\\\/]foo[\\\/]data[\\\/]spgoding[\\\/]functions[\\\/]foo\.mcfunction$/i)
            }

            const actual = await getUriFromId(pathExists, roots, uris, urisOfIds, id, 'functions')

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri if the file can be found in root[1]', async () => {
            const uris: UrisOfStrings = new Map()
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])
            const pathExists = async (abs: string) => {
                return !!abs.match(/^c:[\\\/]bar[\\\/]data[\\\/]spgoding[\\\/]functions[\\\/]foo\.mcfunction$/i)
            }

            const actual = await getUriFromId(pathExists, roots, uris, urisOfIds, id, 'functions')

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/bar/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri under the preferred root[0]', async () => {
            const uris: UrisOfStrings = new Map()
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, uris, urisOfIds, id, 'functions', roots[0])

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri under the preferred root[1]', async () => {
            const uris: UrisOfStrings = new Map()
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, uris, urisOfIds, id, 'functions', roots[1])

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/bar/data/spgoding/functions/foo.mcfunction'))
        })
    })
    describe('getOrCreateInfo() Tests', () => {
        const uri = Uri.parse('file:///c:/bar/data/minecraft/functions/test.mcfunction')
        const roots = [Uri.parse('file:///c:/bar/')]
        const config = VanillaConfig
        const readFile = async () => { throw 'Fake readFile() Intended Exception' }
        const cacheFile: CacheFile = { version: 0, files: {}, cache: {}, advancements: {}, tags: { functions: {} } }
        it('Should return the info directly if it exists in infos', async () => {
            const info = mockFunctionInfo()
            const infos: InfosOfUris = new Map([[uri, info]])

            const actual = await getOrCreateInfo(uri, roots, infos, cacheFile, config, readFile)

            assert(actual === info)
        })
        it('Should return undefined when exceptions are thrown during reading file', async () => {
            const infos: InfosOfUris = new Map()

            const actual = await getOrCreateInfo(uri, roots, infos, cacheFile, config, readFile)

            assert(actual === undefined)
        })
        it('Should return the info after reading file', async () => {
            const readFile = async () => '# foo'
            const infos: InfosOfUris = new Map()

            const actual = (await getOrCreateInfo(uri, roots, infos, cacheFile, config, readFile))!

            assert(actual.config === VanillaConfig)
            assert(actual.document.getText() === '# foo')
            assert(actual.document.version === null)
        })
        it('Should return undefined when the file is excluded', async () => {
            let hasReadFile = false
            const config = constructConfig({ env: { exclude: ['**'] } })
            const readFile = async () => hasReadFile = true
            const infos: InfosOfUris = new Map()

            const actual = await getOrCreateInfo(uri, roots, infos, cacheFile, config, readFile as any)

            if (hasReadFile) {
                fail()
            }
            assert(actual === undefined)
        })
    })
})
