import type { Expect, IsNever } from 'type-testing'
import { ModuleDefinedCommand } from '../visca/command.js'

export type WhiteBalanceMode = 'automatic' | 'onepush' | 'atw' | 'manual' | 'color-temperature'

export const WhiteBalance = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x35, 0x00, 0xff], {
	mode: {
		nibbles: [9],
		convert: (mode: WhiteBalanceMode): number => {
			switch (mode) {
				// @ts-expect-error intentional fallthrough
				default:
					type assert_ExpectedModesHandled = Expect<IsNever<typeof mode>>
				// automatic white balance is least risky
				// eslint-disable-next-line no-fallthrough
				case 'automatic':
					return 0x0
				case 'onepush':
					return 0x3
				case 'atw':
					return 0x4
				case 'manual':
					return 0x5
				case 'color-temperature':
					return 0xb
			}
		},
	},
})

export const WhiteBalanceOnePushTrigger = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x10, 0x05, 0xff])
