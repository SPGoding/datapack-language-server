/* istanbul ignore file */

import type * as core from '@spyglassmc/core'
import * as json from '@spyglassmc/json'
import * as binder from './binder'
import * as checker from './checker'

export * as checker from './checker'

export function initialize(meta: core.MetaRegistry) {
	json.initializeJson()

	checker.register(meta)

	meta.registerUriBinder(binder.uriBinder)
}