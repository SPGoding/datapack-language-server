import { describe } from 'mocha'
import { int, object, opt, record, string } from '../../../lib/checker/primitives'
import { testGrid } from '../../utils'

describe('JSON object', () => {
	testGrid([
		{ content: '{}' },
		{ content: '{ "b": 6 }' },
		{ content: '{ "a": 1 }' },
		{ content: '{ "a": 3, "b": "foo" }' },
		{ content: '[2]' },
	], [
		{ name: 'object()', checker: object() },
		{ name: 'record({ a: int })', checker: record({ a: int }) },
		{ name: 'record({ a: opt(int) })', checker: record({ a: opt(int) }) },
		{ name: 'object(string, () => int)', checker: object(string, () => int) },
	])
})
