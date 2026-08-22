import { expect, test, vi } from 'vitest'
import { noCameraConfig } from '../config.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { getActions } from './actions.js'
import { CameraSelectionActionId } from './camera-selection.js'
import { CameraTargetOptionId } from './camera-target.js'

test('adds the camera dropdown to every camera-facing action and not selector actions', () => {
	const config = noCameraConfig()
	config.cameras[1] = { name: 'Wide', host: '10.0.0.1', username: 'admin' }
	config.cameras[2] = { name: 'Tight', host: '10.0.0.2', username: 'operator' }
	const instance = {
		config,
		resolveCameraTarget: (target: string | number) => (target === 'active' ? 1 : target),
		selectCamera: vi.fn(),
		selectNextCamera: vi.fn(),
		selectPreviousCamera: vi.fn(),
	} as unknown as AvkansLv20nInstance
	const actions = getActions(instance)
	const selectors = new Set<string>(Object.values(CameraSelectionActionId))
	for (const [id, action] of Object.entries(actions)) {
		expect(action, id).toBeDefined()
		if (selectors.has(id)) {
			expect(action.options[0]?.id).not.toBe(CameraTargetOptionId)
		} else {
			expect(action.options[0]?.id, id).toBe(CameraTargetOptionId)
		}
	}
})
