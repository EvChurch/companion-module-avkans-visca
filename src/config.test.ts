import { describe, expect, test } from 'vitest'
import {
	type RawConfig,
	cameraSlotsWithChangedHosts,
	cameraRoster,
	CameraSlots,
	noCameraConfig,
	validateConfig,
} from './config.js'

test('defaults to four empty named slots on the LV20N TCP server port', () => {
	const config = noCameraConfig()
	expect(config.port).toBe(1259)
	expect(config.transportMode).toBe('raw')
	expect(CameraSlots.map((slot) => config.cameras[slot])).toEqual([
		{ name: 'Camera 1', host: '' },
		{ name: 'Camera 2', host: '' },
		{ name: 'Camera 3', host: '' },
		{ name: 'Camera 4', host: '' },
	])
})

describe('LV20N transport configuration', () => {
	test('defaults new configs to raw VISCA over TCP', () => {
		expect(noCameraConfig().transportMode).toBe('raw')
	})

	test('accepts VISCA over IP framing when explicitly selected', () => {
		const config: RawConfig = {
			camera1Host: '127.0.0.1',
			port: '1259',
			transportMode: 'visca-over-ip',
		}
		expect(validateConfig(config).transportMode).toBe('visca-over-ip')
	})

	test('identifies slots whose camera identity changed so cached state can be cleared', () => {
		const original = structuredClone(noCameraConfig())
		original.cameras[1].host = '10.0.0.1'
		original.cameras[2].host = '10.0.0.2'
		const updated = structuredClone(original)
		updated.cameras[1].name = 'Renamed only'
		updated.cameras[2].host = '10.0.0.22'
		updated.cameras[4].host = '10.0.0.4'
		expect(cameraSlotsWithChangedHosts(original, updated)).toEqual([2, 4])
	})
})

describe('camera roster validation', () => {
	test('keeps valid sparse slots in slot order and falls back blank names', () => {
		const config: RawConfig = {
			camera1Name: 'Wide',
			camera1Host: '10.0.0.1',
			camera2Host: 'not-an-ip',
			camera4Name: ' ',
			camera4Host: '10.0.0.4',
		}
		const validated = validateConfig(config)
		expect(cameraRoster(validated)).toEqual([
			{ slot: 1, name: 'Wide', host: '10.0.0.1' },
			{ slot: 4, name: 'Camera 4', host: '10.0.0.4' },
		])
	})
})
