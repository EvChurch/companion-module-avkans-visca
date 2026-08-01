import { describe, expect, test } from 'vitest'
import { lv20nCommandGroups } from './lv20n-command-catalog.js'
import { buildLv20nCommandBytes, createLv20nCommand } from './lv20n-command.js'
import type { Lv20nCommandSpec } from './lv20n-types.js'

const commands: Lv20nCommandSpec[] = []
for (const group of lv20nCommandGroups) commands.push(...group.commands)

function commandAt(workbookRow: number) {
	const command = commands.find((candidate) => candidate.workbookRow === workbookRow)
	if (!command) throw new Error(`Missing command for workbook row ${workbookRow}`)
	return command
}

describe('complete LV20N set-command catalog', () => {
	test('represents every workbook set-command row exactly once', () => {
		expect(lv20nCommandGroups).toHaveLength(46)
		expect(commands).toHaveLength(138)
		expect(commands.map((command) => command.workbookRow)).toStrictEqual(
			Array.from({ length: 138 }, (_, index) => index + 6),
		)
		expect(new Set(commands.map((command) => command.id)).size).toBe(138)
	})

	test('builds every command with documented default parameters', () => {
		for (const command of commands) {
			const values = Object.fromEntries(command.parameters.map((parameter) => [parameter.id, parameter.default]))
			const bytes = buildLv20nCommandBytes(command, values)
			expect(bytes[0]).toBeOneOf([0x81, 0x88])
			expect(bytes.at(-1)).toBe(0xff)
			expect(() => createLv20nCommand(command, values)).not.toThrow()
		}
	})

	test('encodes combined zoom and focus positions', () => {
		expect(
			buildLv20nCommandBytes(commandAt(28), {
				zoom_position: 0x1234,
				focus_position: 0x3abc,
			}),
		).toStrictEqual([0x81, 0x01, 0x04, 0x47, 0x01, 0x02, 0x03, 0x04, 0x03, 0x0a, 0x0b, 0x0c, 0xff])
	})

	test('encodes absolute and relative pan/tilt packets', () => {
		expect(
			buildLv20nCommandBytes(commandAt(106), {
				pan_speed: 0x18,
				tilt_speed: 0x14,
				pan_position: 0x1234,
				tilt_position: 0x5678,
			}),
		).toStrictEqual([0x81, 0x01, 0x06, 0x02, 0x18, 0x14, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0xff])

		expect(
			buildLv20nCommandBytes(commandAt(107), {
				pan_speed: 1,
				tilt_speed: 2,
				pan_offset: 0xabcd,
				tilt_offset: 0x0123,
			}),
		).toStrictEqual([0x81, 0x01, 0x06, 0x03, 0x01, 0x02, 0x0a, 0x0b, 0x0c, 0x0d, 0x00, 0x01, 0x02, 0x03, 0xff])
	})

	test('encodes all four network octets', () => {
		expect(
			buildLv20nCommandBytes(commandAt(128), {
				octet_1: 10,
				octet_2: 0,
				octet_3: 3,
				octet_4: 112,
			}),
		).toStrictEqual([0x81, 0x01, 0x08, 0x07, 0x01, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x03, 0x07, 0x00, 0xff])
	})

	test('rejects parameter values outside the documented range', () => {
		expect(() => buildLv20nCommandBytes(commandAt(119), { value: 8 })).toThrow(/from 0 through 7/)
		expect(() => buildLv20nCommandBytes(commandAt(128), { octet_1: 256, octet_2: 0, octet_3: 0, octet_4: 0 })).toThrow(
			/from 0 through 255/,
		)
	})
})
