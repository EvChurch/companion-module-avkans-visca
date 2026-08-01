import { describe, expect, test } from 'vitest'
import { lv20nInquiryCatalog } from './lv20n-inquiry-catalog.js'
import { decodeLv20nInquiry, formatLv20nInquiryResult } from './lv20n-inquiry.js'

function inquiry(id: string) {
	const spec = lv20nInquiryCatalog.find((candidate) => candidate.id === id)
	if (!spec) throw new Error(`Missing inquiry ${id}`)
	return spec
}

describe('complete LV20N inquiry catalog', () => {
	test('represents every documented inquiry exactly once', () => {
		expect(lv20nInquiryCatalog).toHaveLength(48)
		expect(new Set(lv20nInquiryCatalog.map((spec) => spec.id)).size).toBe(48)
	})

	test('decodes enumerated and numeric responses', () => {
		expect(decodeLv20nInquiry(inquiry('power'), [0x90, 0x50, 0x02, 0xff])).toStrictEqual({ value: 'On' })
		expect(decodeLv20nInquiry(inquiry('white_balance_mode'), [0x90, 0x50, 0x0b, 0xff])).toStrictEqual({
			value: 'Color_Temperature mode',
		})
		expect(decodeLv20nInquiry(inquiry('zoom_position'), [0x90, 0x50, 1, 2, 3, 4, 0xff])).toStrictEqual({
			position: 0x1234,
		})
		expect(decodeLv20nInquiry(inquiry('pan_tilt_max_speed'), [0x90, 0x50, 0x18, 0x14, 0xff])).toStrictEqual({
			pan_speed: 0x18,
			tilt_speed: 0x14,
		})
	})

	test('decodes network address and combined ASCII information', () => {
		expect(decodeLv20nInquiry(inquiry('ip_address'), [0x90, 0x50, 0, 0x0a, 0, 0, 0, 3, 7, 0, 0xff])).toStrictEqual({
			address: '10.0.3.112',
		})

		const text = '10.0.3.112:255.255.255.0:10.0.3.1'
		expect(decodeLv20nInquiry(inquiry('ip_info'), [0x90, 0x50, ...Buffer.from(text, 'ascii'), 0xff])).toStrictEqual({
			info: text,
			ip_address: '10.0.3.112',
			subnet_mask: '255.255.255.0',
			gateway: '10.0.3.1',
		})

		const lv20nText = '10.201.0.50:255.255.0.0:10.201.0.1'
		expect(
			decodeLv20nInquiry(inquiry('ip_info'), [0x90, 0x50, ...Buffer.from(lv20nText, 'ascii'), 0x08, 0xff]),
		).toStrictEqual({
			info: lv20nText,
			ip_address: '10.201.0.50',
			subnet_mask: '255.255.0.0',
			gateway: '10.201.0.1',
		})
	})

	test('decodes version and heartbeat responses', () => {
		expect(
			decodeLv20nInquiry(inquiry('version'), [0x90, 0x50, 0x02, 0x01, 0x06, 0x07, 0x10, 0x45, 0x01, 0xff]),
		).toStrictEqual({ vendor_id: '02 01', model_id: '06 07', version: 'V1.0.45', maximum_sockets: 1 })
		expect(decodeLv20nInquiry(inquiry('heartbeat'), [0xa0, 0x50, 0x01, 0xff])).toStrictEqual({
			status: 'Alive',
			device_address: 2,
		})
	})

	test('decodes both block inquiry layouts', () => {
		expect(
			decodeLv20nInquiry(
				inquiry('ptzfi_block'),
				[0x90, 0x50, 0, 0, 0x12, 0x34, 0, 0x2f, 0xc0, 0, 0x01, 0x02, 0x03, 0x04, 0, 0x0d, 0, 1, 0xff],
			),
		).toStrictEqual({
			zoom_position: 0x1234,
			focus_position: 0x2fc0,
			pan_position: 0x0102,
			tilt_position: 0x0304,
			iris_position: 0x0d,
		})

		expect(
			decodeLv20nInquiry(
				inquiry('white_balance_block'),
				[0x90, 0x50, 0, 0, 0, 8, 0, 9, 5, 0, 10, 0, 11, 0, 12, 0, 8, 1, 0xff],
			),
		).toStrictEqual({
			manual_red_gain: 8,
			manual_blue_gain: 9,
			white_balance_mode: 5,
			automatic_red_gain: 10,
			automatic_green_gain: 11,
			automatic_blue_gain: 12,
			shutter_position: 8,
		})
	})

	test('formats single and multi-field results for Companion variables', () => {
		expect(formatLv20nInquiryResult({ value: 'On' })).toBe('On')
		expect(formatLv20nInquiryResult({ pan_position: 1, tilt_position: 2 })).toBe('pan_position=1, tilt_position=2')
	})
})
