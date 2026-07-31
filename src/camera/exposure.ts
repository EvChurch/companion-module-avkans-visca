import type { Expect, IsNever } from 'type-testing'
import { ModuleDefinedCommand } from '../visca/command.js'
import { ModuleDefinedInquiry } from '../visca/inquiry.js'

export type ExposureMode =
	| 'full-auto'
	| 'manual'
	| 'shutter-priority'
	| 'iris-priority'
	// XXX This isn't in the latest API doc: remove?
	| 'bright-mode-manual'

export const ExposureModeInquiry = new ModuleDefinedInquiry([0x81, 0x09, 0x04, 0x39, 0xff], {
	bytes: [0x90, 0x50, 0x00, 0xff],
	params: {
		mode: {
			nibbles: [5],
			convert: (param: number): ExposureMode => {
				switch (param) {
					case 0x0:
						return 'full-auto'
					case 0x3:
						return 'manual'
					case 0xa:
						return 'shutter-priority'
					case 0xb:
						return 'iris-priority'
					case 0xd:
						return 'bright-mode-manual'
					default:
						return 'full-auto'
				}
			},
		},
	},
})

export const ExposureMode = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x39, 0x00, 0xff], {
	mode: {
		nibbles: [9],
		convert: (mode: ExposureMode): number => {
			switch (mode) {
				case 'full-auto':
					return 0x0
				case 'manual':
					return 0x3
				case 'shutter-priority':
					return 0xa
				case 'iris-priority':
					return 0xb
				case 'bright-mode-manual':
					return 0xd
				default: {
					type assert_ModeIsNever = Expect<IsNever<typeof mode>>
					return 0x0
				}
			}
		},
	},
})

export const IrisUp = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x0b, 0x02, 0xff])
export const IrisDown = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x0b, 0x03, 0xff])

export type IrisSetting =
	| 'F1.6'
	| 'F2.0'
	| 'F2.4'
	| 'F2.8'
	| 'F3.4'
	| 'F4.0'
	| 'F4.8'
	| 'F5.6'
	| 'F6.8'
	| 'F8.0'
	| 'F9.6'
	| 'F11.0'
	| 'F14'
	| 'CLOSED'

export const IrisSet = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x4b, 0x00, 0x00, 0x00, 0x00, 0xff], {
	setting: {
		nibbles: [13, 15],
		convert: (setting: IrisSetting): number => {
			switch (setting) {
				case 'F1.6':
					return 0x0d
				case 'F2.0':
					return 0x0c
				case 'F2.4':
					return 0x0b
				case 'F2.8':
					return 0x0a
				case 'F3.4':
					return 0x09
				// @ts-expect-error intentional fallthrough
				default:
					type assert_SettingIsNever = Expect<IsNever<typeof setting>>
				// reset to default for a bad setting
				// eslint-disable-next-line no-fallthrough
				case 'F4.0':
					return 0x08
				case 'F4.8':
					return 0x07
				case 'F5.6':
					return 0x06
				case 'F6.8':
					return 0x05
				case 'F8.0':
					return 0x04
				case 'F9.6':
					return 0x03
				case 'F11.0':
					return 0x02
				case 'F14':
					return 0x01
				case 'CLOSED':
					return 0x00
			}
		},
	},
})

export const ShutterUp = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x0a, 0x02, 0xff])
export const ShutterDown = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x0a, 0x03, 0xff])

export type ShutterSetting =
	| '1/10000'
	| '1/6000'
	| '1/4000'
	| '1/3000'
	| '1/2000'
	| '1/1500'
	| '1/1000'
	| '1/725'
	| '1/500'
	| '1/350'
	| '1/250'
	| '1/180'
	| '1/120'
	| '1/100'
	| '1/90'
	| '1/60'

export const ShutterSet = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x4a, 0x00, 0x00, 0x00, 0x00, 0xff], {
	setting: {
		nibbles: [13, 15],
		convert: (setting: ShutterSetting): number => {
			switch (setting) {
				case '1/10000':
					return 0x15
				case '1/6000':
					return 0x14
				case '1/4000':
					return 0x13
				case '1/3000':
					return 0x12
				case '1/2000':
					return 0x11
				case '1/1500':
					return 0x10
				case '1/1000':
					return 0x0f
				case '1/725':
					return 0x0e
				case '1/500':
					return 0x0d
				case '1/350':
					return 0x0c
				case '1/250':
					return 0x0b
				case '1/180':
					return 0x0a
				case '1/120':
					return 0x09
				default:
				case '1/100':
					return 0x08
				case '1/90':
					return 0x07
				case '1/60':
					return 0x06
			}
		},
	},
})
