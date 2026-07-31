import { describe, expect, test } from 'vitest'
import { isValidPreset } from './presets.js'

describe('isValidPreset', () => {
	test('too low', () => {
		expect(isValidPreset(-1)).toBe(false)
	})
	test('valid LV20N range', () => {
		expect(isValidPreset(0)).toBe(true)
		expect(isValidPreset(42)).toBe(true)
		expect(isValidPreset(64)).toBe(true)
	})
	test('above LV20N range', () => {
		expect(isValidPreset(65)).toBe(false)
		expect(isValidPreset(254)).toBe(false)
	})
	test('NaN', () => {
		expect(isValidPreset(NaN)).toBe(false)
	})
})
