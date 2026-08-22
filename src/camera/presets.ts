import { ModuleDefinedCommand } from '../visca/command.js'

/**
 * Determine whether a number is a valid preset.
 *
 * The LV20N command listing documents preset numbers 0 through 64 inclusive.
 */
export function isValidPreset(n: number): boolean {
	return Number.isInteger(n) && 0 <= n && n <= 64
}

export const PresetRecall = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x3f, 0x02, 0x00, 0xff], {
	preset: {
		nibbles: [10, 11],
	},
})
