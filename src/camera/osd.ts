import { ModuleDefinedCommand } from '../visca/command.js'
import { ModuleDefinedInquiry } from '../visca/inquiry.js'

type OnScreenDisplayMenuState = 'open' | 'close'

export const OnScreenDisplayInquiry = new ModuleDefinedInquiry([0x81, 0x09, 0x06, 0x06, 0xff], {
	bytes: [0x90, 0x50, 0x00, 0xff],
	params: {
		state: {
			nibbles: [5],
			convert: (param: number): OnScreenDisplayMenuState => {
				switch (param) {
					case 0x2:
						return 'open'
					default:
					case 0x3:
						return 'close'
				}
			},
		},
	},
})

export const OnScreenDisplayOpen = new ModuleDefinedCommand([0x81, 0x01, 0x06, 0x06, 0x02, 0xff])
export const OnScreenDisplayClose = new ModuleDefinedCommand([0x81, 0x01, 0x06, 0x06, 0x03, 0xff])
export const OnScreenDisplayToggle = new ModuleDefinedCommand([0x81, 0x01, 0x06, 0x06, 0x10, 0xff])

export const OnScreenDisplayEnter = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x07, 0x02, 0xff])
export const OnScreenDisplayBack = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x07, 0x03, 0xff])
