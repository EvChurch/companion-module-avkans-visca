import { describe, expect, test } from 'vitest'
import {
	type RawConfig,
	DebugLoggingOptionId,
	TransportModeOptionId,
	canUpdateConfigWithoutRestarting,
	noCameraConfig,
	tryUpdateConfigWithDebugLogging,
	tryUpdateConfigWithTransportMode,
	validateConfig,
} from './config.js'

test('LV20N uses its documented TCP server port by default', () => {
	expect(noCameraConfig().port).toBe(1259)
})

describe('LV20N transport configuration', () => {
	test('defaults new and upgraded configs to raw VISCA over TCP', () => {
		expect(noCameraConfig().transportMode).toBe('raw')

		const config: RawConfig = { host: '127.0.0.1', port: '1259' }
		expect(tryUpdateConfigWithTransportMode(config)).toBe(true)
		expect(config[TransportModeOptionId]).toBe('raw')
		expect(tryUpdateConfigWithTransportMode(config)).toBe(false)
	})

	test('accepts VISCA over IP framing when explicitly selected', () => {
		const config: RawConfig = {
			host: '127.0.0.1',
			port: '1259',
			transportMode: 'visca-over-ip',
		}
		validateConfig(config)
		expect(config.transportMode).toBe('visca-over-ip')
	})

	test('restarts the connection when transport framing changes', () => {
		const raw = { ...noCameraConfig(), host: '127.0.0.1' }
		const framed = { ...raw, transportMode: 'visca-over-ip' as const }
		expect(canUpdateConfigWithoutRestarting(raw, framed)).toBe(false)
	})
})

describe('config upgrade to specify debug logging', () => {
	test('config without debug logging', () => {
		const configMissingDebugLogging: RawConfig = {
			host: '127.0.0.1',
			port: '5678',
		}
		expect(DebugLoggingOptionId in configMissingDebugLogging).toBe(false)

		expect(tryUpdateConfigWithDebugLogging(configMissingDebugLogging)).toBe(true)
		expect(DebugLoggingOptionId in configMissingDebugLogging).toBe(true)
		expect(configMissingDebugLogging[DebugLoggingOptionId]).toBe(false)

		expect(tryUpdateConfigWithDebugLogging(configMissingDebugLogging)).toBe(false)
	})

	test('config with debug logging=false', () => {
		const configWithDebugLoggingFalse: RawConfig = {
			host: '127.0.0.1',
			port: '5678',
			debugLogging: false,
		}

		expect(tryUpdateConfigWithDebugLogging(configWithDebugLoggingFalse)).toBe(false)
		expect(configWithDebugLoggingFalse[DebugLoggingOptionId]).toBe(false)
	})

	test('config with debug logging=true', () => {
		const configWithDebugLoggingTrue: RawConfig = {
			host: '127.0.0.1',
			port: '5678',
			debugLogging: true,
		}

		expect(tryUpdateConfigWithDebugLogging(configWithDebugLoggingTrue)).toBe(false)
		expect(configWithDebugLoggingTrue[DebugLoggingOptionId]).toBe(true)
	})
})
