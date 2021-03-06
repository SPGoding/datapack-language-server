import * as core from '@spyglassmc/core'
import * as je from '@spyglassmc/java-edition'
import * as locales from '@spyglassmc/locales'
import * as nbtdoc from '@spyglassmc/nbtdoc'
import * as util from 'util'
import * as ls from 'vscode-languageserver/node'
import { toCore, toLS } from './util'

if (process.argv.length === 2) {
	// When the server is launched from the cmd script, the process arguments
	// are wiped. I don't know why it happens, but this is what it is.
	// Therefore, we push a '--stdio' if the argument list is too short.
	process.argv.push('--stdio')
}

const connection = ls.createConnection()
let capabilities!: ls.ClientCapabilities
let workspaceFolders!: ls.WorkspaceFolder[]

const logger: core.Logger = {
	error: (msg: any, ...args: any[]): void => connection.console.error(util.format(msg, ...args)),
	info: (msg: any, ...args: any[]): void => connection.console.info(util.format(msg, ...args)),
	log: (msg: any, ...args: any[]): void => connection.console.log(util.format(msg, ...args)),
	warn: (msg: any, ...args: any[]): void => connection.console.warn(util.format(msg, ...args)),
}
let service!: core.Service

connection.onInitialize(async params => {
	logger.info(`[onInitialize] processId = ${JSON.stringify(params.processId)}`)
	logger.info(`[onInitialize] clientInfo = ${JSON.stringify(params.clientInfo)}`)
	logger.info(`[onInitialize] initializationOptions = ${JSON.stringify(params.initializationOptions)}`)

	capabilities = params.capabilities
	workspaceFolders = params.workspaceFolders ?? []

	// TODO: Remove this. This is to give the debugger time to attach.
	await new Promise(resolve => setTimeout(resolve, 7000))

	try {
		await locales.loadLocale(params.locale)
	} catch (e) {
		logger.error('[loadLocale]', e)
	}

	try {
		service = new core.Service({
			initializers: [
				nbtdoc.initialize,
				je.initialize,
			],
			isDebugging: false,
			logger,
			projectPath: core.fileUtil.fileUriToPath(workspaceFolders[0].uri),
		})
		service.project
			.on('documentErrorred', ({ doc, errors }) => {
				connection.sendDiagnostics({
					diagnostics: toLS.diagnostics(errors, doc),
					uri: doc.uri,
					version: doc.version,
				})
			})
			.on('documentRemoved', ({ uri }) => {
				connection.sendDiagnostics({ uri, diagnostics: [] })
			})
		await service.project.init()
	} catch (e) {
		logger.error('[new Service]', e)
	}

	const ans: ls.InitializeResult = {
		capabilities: {
			colorProvider: {},
			completionProvider: {
				triggerCharacters: service.project.meta.getTriggerCharacters(),
			},
			declarationProvider: {},
			definitionProvider: {},
			implementationProvider: {},
			referencesProvider: {},
			typeDefinitionProvider: {},
			documentHighlightProvider: {},
			documentSymbolProvider: {
				label: 'SPYGlass',
			},
			hoverProvider: {},
			semanticTokensProvider: {
				documentSelector: toLS.documentSelector(service.project.meta),
				legend: toLS.semanticTokensLegend(),
				full: { delta: false },
				range: true,
			},
			textDocumentSync: {
				change: ls.TextDocumentSyncKind.Incremental,
				openClose: true,
			},
			workspaceSymbolProvider: {},
		},
	}

	if (capabilities.workspace?.workspaceFolders) {
		ans.capabilities.workspace = {
			workspaceFolders: {
				supported: true,
				changeNotifications: true,
			},
		}
	}

	return ans
})

connection.onInitialized(async () => {
	await service.project.ready()
	if (capabilities.workspace?.workspaceFolders) {
		connection.workspace.onDidChangeWorkspaceFolders(async () => {
			// FIXME
			// service.rawRoots = (await connection.workspace.getWorkspaceFolders() ?? []).map(r => r.uri)
		})
	}
})

connection.onDidOpenTextDocument(async ({ textDocument: { text, uri, version, languageId: languageID } }) => {
	service.project.onDidOpen(uri, languageID, version, text)
})
connection.onDidChangeTextDocument(async ({ contentChanges, textDocument: { uri, version } }) => {
	service.project.onDidChange(uri, contentChanges, version)
})
connection.onDidCloseTextDocument(({ textDocument: { uri } }) => {
	service.project.onDidClose(uri)
})

connection.workspace.onDidRenameFiles(({ }) => {
})

connection.onColorPresentation(async ({ textDocument: { uri }, color, range }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const presentation = service.getColorPresentation(node, doc, toCore.range(range, doc), toCore.color(color))
	return toLS.colorPresentationArray(presentation, doc)
})
connection.onDocumentColor(async ({ textDocument: { uri } }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const info = service.getColorInfo(node, doc)
	return toLS.colorInformationArray(info, doc)
})

connection.onCompletion(async ({ textDocument: { uri }, position, context }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const offset = toCore.offset(position, doc)
	const items = service.complete(node, doc, offset, context?.triggerCharacter)
	return items.map(item => toLS.completionItem(item, doc, offset, capabilities.textDocument?.completion?.completionItem?.insertReplaceSupport))
})

connection.onDeclaration(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['declaration', 'definition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.declaration?.linkSupport)
})
connection.onDefinition(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['definition', 'declaration', 'implementation', 'typeDefinition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.definition?.linkSupport)
})
connection.onImplementation(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['implementation', 'definition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.implementation?.linkSupport)
})
connection.onReferences(async ({ textDocument: { uri }, position, context: { includeDeclaration } }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), includeDeclaration ? undefined : ['reference'])
	return toLS.locationLink(ans, doc, false)
})
connection.onTypeDefinition(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['typeDefinition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.typeDefinition?.linkSupport)
})

connection.onDocumentHighlight(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), undefined, true)
	return toLS.documentHighlight(ans)
})

connection.onDocumentSymbol(async ({ textDocument: { uri } }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc } = docAndNode
	return toLS.documentSymbolsFromTables(
		[service.project.symbols.global, ...service.project.symbols.getStack(doc.uri)],
		doc,
		capabilities.textDocument?.documentSymbol?.hierarchicalDocumentSymbolSupport,
		capabilities.textDocument?.documentSymbol?.symbolKind?.valueSet
	)
})

connection.onHover(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getHover(node, doc, toCore.offset(position, doc))
	return ans ? toLS.hover(ans, doc) : undefined
})

connection.languages.semanticTokens.on(async ({ textDocument: { uri } }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return { data: [] }
	}
	const { doc, node } = docAndNode
	const tokens = service.colorize(node, doc)
	return toLS.semanticTokens(tokens, doc)
})
connection.languages.semanticTokens.onRange(async ({ textDocument: { uri }, range }) => {
	const docAndNode = await service.project.ensureParsedAndChecked(uri)
	if (!docAndNode) {
		return { data: [] }
	}
	const { doc, node } = docAndNode
	const tokens = service.colorize(node, doc, toCore.range(range, doc),)
	return toLS.semanticTokens(tokens, doc)
})

connection.onWorkspaceSymbol(({ query }) => {
	return toLS.symbolInformationArrayFromTable(
		service.project.symbols.global, query,
		capabilities.textDocument?.documentSymbol?.symbolKind?.valueSet
	)
})

connection.listen()

let isUp = true
function exit() {
	if (!isUp) {
		return
	}
	isUp = false
	process.exit()
}

for (const sig of ['exit', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'] as const) {
	process.on(sig, exit)
}

process.on('uncaughtException', e => {
	console.error('[uncaughtException] the language server will be terminated: ', e.stack)
	exit()
})
