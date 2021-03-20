import assert from 'assert'
import fg from 'fast-glob'
import fs from 'fs'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Checkers } from '../../lib/checker/data'
import { Categories } from '../../lib/util'
import { testChecker } from '../utils'

describe('Check vanilla files', async () => {
	const root = 'node_modules/vanilla-datapack-data/data/minecraft/'
	const summary = [...Categories.keys()].map(c => fg.sync(`${root}${c}/**/*.json`))

	summary.forEach((files, i) => {
		const category = [...Categories][i]
		const checker = Checkers.get(category[1])
		if (!checker || !files) return

		it(`Category ${category[1]}`, () => {
			let passing = true
			files.forEach(file => {
				const text = fs.readFileSync(file, 'utf-8')
				const result = testChecker(checker, text)
				const errors = result.parserErrors.concat(result.checkerErrors)
				if (errors.length === 0) return

				passing = false
				setTimeout(() => {
					console.log(`\t${file.slice(root.length + category[0].length + 1)}`)
					const doc = TextDocument.create('', '', 0, text)
					errors.forEach(e => {
						const pos = doc.positionAt(e.range.start)
						console.log(`\t  ${pos.line+1}:${pos.character}  ${e.message}`)
					})
				}, 0)
			})
			assert(passing)
		})
	})
})
