import { expect, test } from 'vitest'
import { activeCameraVariableId, cameraVariableId, getLv20nVariableDefinitions } from './variables.js'
import { trackingVariableId, type TrackingField } from './tracking.js'

test('defines active and fixed-camera tracking variables', () => {
	const field: TrackingField = {
		id: 'base2_autozoomenablechk',
		panel: 'Base2',
		key: 'autoZoomEnableChk',
		label: 'Auto Zoom',
		component: 'Switch',
		default: 1,
	}
	const definitions = getLv20nVariableDefinitions([field])
	const ids = new Set(definitions.map(({ variableId }) => variableId))
	const id = trackingVariableId(field)

	expect(ids.has(activeCameraVariableId(id))).toBe(true)
	for (const slot of [1, 2, 3, 4] as const) expect(ids.has(cameraVariableId(slot, id))).toBe(true)
})

test('defines active and fixed-camera zoom speed variables', () => {
	const definitions = getLv20nVariableDefinitions()
	const ids = new Set(definitions.map(({ variableId }) => variableId))
	for (const id of ['zoom_speed', 'preset_zoom_speed']) {
		expect(ids.has(activeCameraVariableId(id))).toBe(true)
		for (const slot of [1, 2, 3, 4] as const) expect(ids.has(cameraVariableId(slot, id))).toBe(true)
	}
})
