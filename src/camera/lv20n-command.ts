import { ModuleDefinedCommand, type CommandBytes } from '../visca/command.js'
import type { Lv20nCommandParameterValues, Lv20nCommandSpec } from './lv20n-types.js'

export function buildLv20nCommandBytes(
	spec: Lv20nCommandSpec,
	parameterValues: Lv20nCommandParameterValues,
): CommandBytes {
	const bytes = spec.bytes.slice()

	for (const parameter of spec.parameters) {
		const value = parameterValues[parameter.id]
		if (!Number.isInteger(value) || value < parameter.min || value > parameter.max) {
			throw new RangeError(
				`${parameter.label} must be an integer from ${parameter.min} through ${parameter.max}; received ${value}`,
			)
		}

		let remaining = value
		for (let index = parameter.nibbles.length - 1; index >= 0; index--) {
			const nibble = parameter.nibbles[index]
			const byteOffset = nibble >> 1
			const lowerNibble = nibble % 2 === 1
			const mask = lowerNibble ? 0x0f : 0xf0
			if ((bytes[byteOffset] & mask) !== 0) {
				throw new RangeError(`${parameter.label} targets a nonzero command nibble`)
			}

			bytes[byteOffset] |= (remaining & 0x0f) << (lowerNibble ? 0 : 4)
			remaining >>>= 4
		}

		if (remaining !== 0) {
			throw new RangeError(`${parameter.label} does not fit in its command packet`)
		}
	}

	return bytes as unknown as CommandBytes
}

export function createLv20nCommand(
	spec: Lv20nCommandSpec,
	parameterValues: Lv20nCommandParameterValues,
): ModuleDefinedCommand {
	return new ModuleDefinedCommand(buildLv20nCommandBytes(spec, parameterValues))
}
