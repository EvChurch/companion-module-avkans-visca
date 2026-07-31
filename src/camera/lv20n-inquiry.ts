import type { Bytes } from '../utils/byte.js'

interface Lv20nInquiryChoice {
	readonly bytes: readonly number[]
	readonly value: string
}

interface Lv20nInquiryField {
	readonly id: string
	readonly label: string
	readonly nibbles?: readonly number[]
	readonly bytes?: readonly number[]
	readonly choices?: readonly { readonly value: number; readonly label: string }[]
}

export type Lv20nInquiryDecode =
	| { readonly kind: 'enum'; readonly choices: readonly Lv20nInquiryChoice[] }
	| { readonly kind: 'fields'; readonly fields: readonly Lv20nInquiryField[] }
	| { readonly kind: 'ip-address' | 'ip-info' | 'version' | 'ptzfi-block' | 'white-balance-block' | 'heartbeat' }

export interface Lv20nInquirySpec {
	readonly workbookRow: number
	readonly id: string
	readonly name: string
	readonly bytes: Bytes
	readonly decode: Lv20nInquiryDecode
}

type Lv20nInquiryValue = string | number
type Lv20nInquiryResult = Readonly<Record<string, Lv20nInquiryValue>>

function validateResponse(response: Bytes): void {
	if (response.length < 4 || response.at(-1) !== 0xff) {
		throw new Error('LV20N inquiry response is incomplete')
	}
	if ((response[0] & 0x8f) !== 0x80 || response[1] !== 0x50) {
		throw new Error('LV20N inquiry response has an invalid VISCA envelope')
	}
}

function extractNibbles(response: Bytes, nibbles: readonly number[]): number {
	let value = 0
	for (const nibble of nibbles) {
		const byte = response[nibble >> 1]
		if (byte === undefined) throw new Error(`Inquiry response does not contain nibble ${nibble}`)
		value = (value << 4) | (nibble % 2 === 1 ? byte & 0x0f : byte >> 4)
	}
	return value
}

function extractBytes(response: Bytes, offsets: readonly number[]): number {
	let value = 0
	for (const offset of offsets) {
		const byte = response[offset]
		if (byte === undefined) throw new Error(`Inquiry response does not contain byte ${offset}`)
		value = value * 0x100 + byte
	}
	return value
}

function decodeFields(response: Bytes, fields: readonly Lv20nInquiryField[]): Lv20nInquiryResult {
	return Object.fromEntries(
		fields.map((field) => {
			const numeric = field.nibbles
				? extractNibbles(response, field.nibbles)
				: extractBytes(response, field.bytes ?? [])
			const semantic = field.choices?.find((choice) => choice.value === numeric)?.label ?? numeric
			return [field.id, semantic]
		}),
	)
}

function decodeIpAddress(response: Bytes): Lv20nInquiryResult {
	if (response.length !== 11) throw new Error(`Expected an 11-byte IP response, received ${response.length}`)
	const octets = [
		extractNibbles(response, [5, 7]),
		extractNibbles(response, [9, 11]),
		extractNibbles(response, [13, 15]),
		extractNibbles(response, [17, 19]),
	]
	return { address: octets.join('.') }
}

function decodeIpInfo(response: Bytes): Lv20nInquiryResult {
	const info = Buffer.from(response.slice(2, -1)).toString('ascii')
	const [ip_address = '', subnet_mask = '', gateway = ''] = info.split(':')
	return { info, ip_address, subnet_mask, gateway }
}

function decodeVersion(response: Bytes): Lv20nInquiryResult {
	if (response.length !== 10) throw new Error(`Expected a 10-byte version response, received ${response.length}`)
	const versionMajorMinor = response[6].toString(16).padStart(2, '0')
	const patch = response[7].toString(16).padStart(2, '0')
	return {
		vendor_id: `${response[2].toString(16).padStart(2, '0')} ${response[3].toString(16).padStart(2, '0')}`,
		model_id: `${response[4].toString(16).padStart(2, '0')} ${response[5].toString(16).padStart(2, '0')}`,
		version: `V${versionMajorMinor[0]}.${versionMajorMinor[1]}.${patch}`,
		maximum_sockets: response[8],
	}
}

function decodePtzfiBlock(response: Bytes): Lv20nInquiryResult {
	if (response.length !== 19) throw new Error(`Expected a 19-byte PTZFI block response, received ${response.length}`)
	return {
		zoom_position: extractBytes(response, [4, 5]),
		focus_position: extractBytes(response, [7, 8]),
		pan_position: extractBytes(response, [10, 11]),
		tilt_position: extractBytes(response, [12, 13]),
		iris_position: response[15],
	}
}

function decodeWhiteBalanceBlock(response: Bytes): Lv20nInquiryResult {
	if (response.length !== 19) {
		throw new Error(`Expected a 19-byte white-balance block response, received ${response.length}`)
	}
	return {
		manual_red_gain: extractBytes(response, [4, 5]),
		manual_blue_gain: extractBytes(response, [6, 7]),
		white_balance_mode: response[8],
		automatic_red_gain: extractBytes(response, [9, 10]),
		automatic_green_gain: extractBytes(response, [11, 12]),
		automatic_blue_gain: extractBytes(response, [13, 14]),
		shutter_position: response[16],
	}
}

export function decodeLv20nInquiry(spec: Lv20nInquirySpec, response: Bytes): Lv20nInquiryResult {
	validateResponse(response)

	switch (spec.decode.kind) {
		case 'enum': {
			const choice = spec.decode.choices.find(
				(candidate) =>
					candidate.bytes.length === response.length &&
					candidate.bytes.slice(1).every((byte, index) => byte === response[index + 1]),
			)
			if (!choice) throw new Error(`LV20N returned an undocumented ${spec.name} value`)
			return { value: choice.value }
		}
		case 'fields':
			return decodeFields(response, spec.decode.fields)
		case 'ip-address':
			return decodeIpAddress(response)
		case 'ip-info':
			return decodeIpInfo(response)
		case 'version':
			return decodeVersion(response)
		case 'ptzfi-block':
			return decodePtzfiBlock(response)
		case 'white-balance-block':
			return decodeWhiteBalanceBlock(response)
		case 'heartbeat':
			if (response.length !== 4 || response[2] !== 0x01) throw new Error('Invalid LV20N heartbeat response')
			return { status: 'Alive', device_address: (response[0] >> 4) - 8 }
	}
}

export function inquiryFieldIds(spec: Lv20nInquirySpec): readonly string[] {
	switch (spec.decode.kind) {
		case 'enum':
			return ['value']
		case 'fields':
			return spec.decode.fields.map((field) => field.id)
		case 'ip-address':
			return ['address']
		case 'ip-info':
			return ['info', 'ip_address', 'subnet_mask', 'gateway']
		case 'version':
			return ['vendor_id', 'model_id', 'version', 'maximum_sockets']
		case 'ptzfi-block':
			return ['zoom_position', 'focus_position', 'pan_position', 'tilt_position', 'iris_position']
		case 'white-balance-block':
			return [
				'manual_red_gain',
				'manual_blue_gain',
				'white_balance_mode',
				'automatic_red_gain',
				'automatic_green_gain',
				'automatic_blue_gain',
				'shutter_position',
			]
		case 'heartbeat':
			return ['status', 'device_address']
	}
}

export function formatLv20nInquiryResult(result: Lv20nInquiryResult): string {
	const entries = Object.entries(result)
	return entries.length === 1 ? String(entries[0][1]) : entries.map(([key, value]) => `${key}=${value}`).join(', ')
}
