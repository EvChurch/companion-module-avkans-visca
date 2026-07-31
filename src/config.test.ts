import { describe, expect, test } from 'vitest'
import { type RawConfig, DebugLoggingOptionId, noCameraConfig, tryUpdateConfigWithDebugLogging } from './config.js'

test('LV20N uses its documented TCP server port by default', () => {
	expect(noCameraConfig().port).toBe(1259)
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
