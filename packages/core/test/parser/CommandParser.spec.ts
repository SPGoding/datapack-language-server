import { describe, it } from 'mocha'
import snapshot from 'snap-shot-it'
import { CommentParser } from '../../lib/parser/CommentParser'
import { showWhiteSpaceGlyph, testParser } from '../utils'

describe('CommentParser', () => {
	describe('parse()', () => {
		const suites: { prefixes: Set<string>, content: string }[] = [
			{ prefixes: new Set(['//']), content: '// This is a comment.' },
			{ prefixes: new Set(['//']), content: '// This is a comment.\nAnother line here.' },
			{ prefixes: new Set(['//']), content: '# Whoops.\n// The world is burning!' },
		]
		for (const { prefixes, content } of suites) {
			it(`Should parse '${showWhiteSpaceGlyph(content)}'`, () => {
				const parser = new CommentParser(prefixes)
				snapshot(testParser(parser, content))
			})
		}
	})
})