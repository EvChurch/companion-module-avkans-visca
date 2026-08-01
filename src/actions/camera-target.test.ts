import { expect, test } from 'vitest'
import { cameraRoster, noCameraConfig } from '../config.js'
import { currentCameraSlot, targetCameraActions } from './camera-target.js'

function roster() {
	const config = noCameraConfig()
	config.cameras[1] = { name: 'Wide', host: '10.0.0.1' }
	config.cameras[3] = { name: 'Stage', host: '10.0.0.3' }
	return cameraRoster(config)
}

test('prepends Active Camera then configured cameras in slot order', () => {
	const actions = targetCameraActions(
		{
			test: {
				name: 'Test',
				options: [{ type: 'textinput', id: 'value', label: 'Value' }],
				callback: async () => undefined,
			},
		},
		roster(),
		(target) => (target === 'active' ? 1 : target),
	)
	const option = actions.test?.options[0]
	if (!option || option.type !== 'dropdown') throw new Error('missing camera dropdown')
	expect(option.choices).toEqual([
		{ id: 'active', label: 'Active Camera' },
		{ id: 1, label: 'Wide' },
		{ id: 3, label: 'Stage' },
	])
})

test('isolates concrete targets across overlapping async callbacks', async () => {
	const observed: Array<number | undefined> = []
	let releaseFirst: (() => void) | undefined
	const firstWaiting = new Promise<void>((resolve) => {
		releaseFirst = resolve
	})
	const actions = targetCameraActions(
		{
			test: {
				name: 'Test',
				options: [],
				callback: async ({ options }) => {
					if (options.camera === 1) await firstWaiting
					observed.push(currentCameraSlot())
				},
			},
		},
		roster(),
		(target) => (target === 'active' ? 1 : target),
	)
	const callback = actions.test?.callback
	if (!callback) throw new Error('missing callback')
	const event = (camera: number) => ({
		actionId: 'test',
		controlId: 'test',
		id: 'test',
		surfaceId: undefined,
		options: { camera },
	})
	const first = callback(event(1), {} as never)
	await callback(event(3), {} as never)
	releaseFirst?.()
	await first
	expect(observed).toEqual([3, 1])
})

test('preserves an explicitly selected slot after that slot is removed from config', async () => {
	let observed: number | undefined
	const actions = targetCameraActions(
		{
			test: {
				name: 'Test',
				options: [],
				callback: async () => {
					observed = currentCameraSlot()
				},
			},
		},
		roster(),
		() => undefined,
	)
	await actions.test?.callback(
		{ actionId: 'test', controlId: 'test', id: 'test', surfaceId: undefined, options: { camera: 2 } },
		{} as never,
	)
	expect(observed).toBe(2)
})
