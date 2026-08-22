import { expect, test, vi } from 'vitest'
import { cameraRoster, noCameraConfig } from '../config.js'
import { cameraSelectionActions, CameraSelectionActionId } from './camera-selection.js'

test('offers configured direct choices and separate next/previous actions without target options', async () => {
	const config = noCameraConfig()
	config.cameras[2] = { name: 'Tight', host: '10.0.0.2', username: 'admin' }
	config.cameras[4] = { name: 'Stage', host: '10.0.0.4', username: 'admin' }
	const instance = { selectCamera: vi.fn(), selectNextCamera: vi.fn(), selectPreviousCamera: vi.fn() }
	const actions = cameraSelectionActions(instance, cameraRoster(config))
	const direct = actions[CameraSelectionActionId.Select]!
	const option = direct.options[0]
	if (option.type !== 'dropdown') throw new Error('missing selector')
	expect(option.choices).toEqual([
		{ id: 2, label: 'Tight' },
		{ id: 4, label: 'Stage' },
	])
	expect(actions[CameraSelectionActionId.Next]?.options).toEqual([])
	expect(actions[CameraSelectionActionId.Previous]?.options).toEqual([])
	await direct.callback(
		{
			actionId: CameraSelectionActionId.Select,
			controlId: 'test',
			id: 'test',
			surfaceId: undefined,
			options: { selected_camera: 4 },
		},
		{} as never,
	)
	await actions[CameraSelectionActionId.Next]?.callback(
		{ actionId: CameraSelectionActionId.Next, controlId: 'test', id: 'test', surfaceId: undefined, options: {} },
		{} as never,
	)
	await actions[CameraSelectionActionId.Previous]?.callback(
		{ actionId: CameraSelectionActionId.Previous, controlId: 'test', id: 'test', surfaceId: undefined, options: {} },
		{} as never,
	)
	expect(instance.selectCamera).toHaveBeenCalledWith(4)
	expect(instance.selectNextCamera).toHaveBeenCalledOnce()
	expect(instance.selectPreviousCamera).toHaveBeenCalledOnce()
})

test('hides the direct selector when no cameras are configured', () => {
	const instance = { selectCamera: vi.fn(), selectNextCamera: vi.fn(), selectPreviousCamera: vi.fn() }
	const actions = cameraSelectionActions(instance, [])
	expect(actions[CameraSelectionActionId.Select]).toBeUndefined()
	expect(actions[CameraSelectionActionId.Next]).toBeDefined()
	expect(actions[CameraSelectionActionId.Previous]).toBeDefined()
})
