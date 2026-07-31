import { describe, expect, test } from 'vitest'
import { IrisSet, ShutterSet } from './exposure.js'
import {
	OnScreenDisplayBack,
	OnScreenDisplayClose,
	OnScreenDisplayEnter,
	OnScreenDisplayOpen,
	OnScreenDisplayToggle,
} from './osd.js'
import { WhiteBalance } from './white-balance.js'

describe('LV20N command mappings', () => {
	test('uses the LV20N iris table', () => {
		expect(IrisSet.toBytes({ setting: 'F1.6' })).toStrictEqual([0x81, 0x01, 0x04, 0x4b, 0, 0, 0, 0x0d, 0xff])
		expect(IrisSet.toBytes({ setting: 'F14' })).toStrictEqual([0x81, 0x01, 0x04, 0x4b, 0, 0, 0, 0x01, 0xff])
	})

	test('uses the LV20N shutter table', () => {
		expect(ShutterSet.toBytes({ setting: '1/60' })).toStrictEqual([0x81, 0x01, 0x04, 0x4a, 0, 0, 0, 0x06, 0xff])
		expect(ShutterSet.toBytes({ setting: '1/10000' })).toStrictEqual([0x81, 0x01, 0x04, 0x4a, 0, 0, 0x01, 0x05, 0xff])
	})

	test('uses the LV20N white balance modes', () => {
		expect(WhiteBalance.toBytes({ mode: 'atw' })).toStrictEqual([0x81, 0x01, 0x04, 0x35, 0x04, 0xff])
		expect(WhiteBalance.toBytes({ mode: 'color-temperature' })).toStrictEqual([0x81, 0x01, 0x04, 0x35, 0x0b, 0xff])
	})

	test('uses the LV20N OSD commands', () => {
		expect(OnScreenDisplayOpen.toBytes()).toStrictEqual([0x81, 0x01, 0x06, 0x06, 0x02, 0xff])
		expect(OnScreenDisplayClose.toBytes()).toStrictEqual([0x81, 0x01, 0x06, 0x06, 0x03, 0xff])
		expect(OnScreenDisplayToggle.toBytes()).toStrictEqual([0x81, 0x01, 0x06, 0x06, 0x10, 0xff])
		expect(OnScreenDisplayEnter.toBytes()).toStrictEqual([0x81, 0x01, 0x04, 0x07, 0x02, 0xff])
		expect(OnScreenDisplayBack.toBytes()).toStrictEqual([0x81, 0x01, 0x04, 0x07, 0x03, 0xff])
	})
})
