import { expect, test, vi } from 'vitest'
import type { AvkansLv20nInstance } from '../instance.js'
import { MockContext } from '../__tests__/mock-context.js'
import { PanTiltActionId, panTiltActions } from './pan-tilt.js'
import { ZoomActionId, ZoomSpeedOptionId, zoomActions } from './zoom.js'

function event(actionId: string, options = {}) {
	return { actionId, controlId: 'test', id: 'test', surfaceId: undefined, options }
}

test('pan and tilt convenience actions use the native camera endpoint', async () => {
	const movePanTiltNative = vi.fn()
	const instance = {
		movePanTiltNative,
		panTiltSpeed: () => ({ panSpeed: 12, tiltSpeed: 10 }),
	} as unknown as AvkansLv20nInstance

	await panTiltActions(instance)[PanTiltActionId.MoveUpLeft].callback(
		event(PanTiltActionId.MoveUpLeft),
		new MockContext(),
	)
	expect(movePanTiltNative).toHaveBeenCalledWith(-1, 1, 12, 10)
})

test('zoom convenience actions use the native camera endpoint', async () => {
	const moveZoomNative = vi.fn()
	const setZoomSpeedNative = vi.fn()
	const instance = { moveZoomNative, setZoomSpeedNative } as unknown as AvkansLv20nInstance
	const actions = zoomActions(instance)

	await actions[ZoomActionId.StartZoomIn].callback(event(ZoomActionId.StartZoomIn), new MockContext())
	await actions[ZoomActionId.StartZoomOut].callback(event(ZoomActionId.StartZoomOut), new MockContext())
	await actions[ZoomActionId.StopZoom].callback(event(ZoomActionId.StopZoom), new MockContext())
	await actions[ZoomActionId.SetZoomSpeed].callback(
		event(ZoomActionId.SetZoomSpeed, { [ZoomSpeedOptionId]: 8 }),
		new MockContext(),
	)
	expect(moveZoomNative.mock.calls).toEqual([[1], [-1], [0]])
	expect(setZoomSpeedNative).toHaveBeenCalledWith(8)
	expect(actions[ZoomActionId.SetZoomSpeed].options[0]).toMatchObject({
		choices: [
			{ id: 1, label: 'Speed 1 (Slow)' },
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			{ id: 8, label: 'Speed 8 (Fast)' },
		],
	})
})
