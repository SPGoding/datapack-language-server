import { localize } from '@spyglassmc/locales'
import type { JsonNode } from '../../node'
import { JsonBooleanNode } from '../../node'
import type { JsonCheckerContext } from '../JsonChecker'

export function boolean(node: JsonNode, ctx: JsonCheckerContext) {
	ctx.ops.set(node, 'expectation', [{ type: 'json:boolean', typedoc: 'Boolean' }])

	if (!JsonBooleanNode.is(node)) {
		ctx.err.report(localize('expected', localize('boolean')), node)
	}
}
