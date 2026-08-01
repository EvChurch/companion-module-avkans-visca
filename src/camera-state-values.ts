import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import type { Lv20nInquirySpec } from './camera/lv20n-inquiry.js'

interface CameraStateValueDefinition {
	id: string
	label: string
	inquiryId: string
	fieldId: string
	kind: 'enum' | 'number' | 'text'
	choices?: readonly string[]
}

function fieldId(inquiry: Lv20nInquirySpec, field: string, count: number): string {
	return count === 1 || field === 'value' || field === inquiry.id ? inquiry.id : `${inquiry.id}_${field}`
}

function inquiryStateValueDefinitions(inquiry: Lv20nInquirySpec): CameraStateValueDefinition[] {
	const definition = (
		field: string,
		label: string,
		kind: CameraStateValueDefinition['kind'],
		count: number,
		choices?: readonly string[],
	): CameraStateValueDefinition => ({
		id: fieldId(inquiry, field, count),
		label,
		inquiryId: inquiry.id,
		fieldId: field,
		kind,
		choices,
	})

	switch (inquiry.decode.kind) {
		case 'enum':
			return [
				definition(
					'value',
					inquiry.name,
					'enum',
					1,
					inquiry.decode.choices.map((choice) => choice.value),
				),
			]
		case 'fields': {
			const count = inquiry.decode.fields.length
			return inquiry.decode.fields.map((field) =>
				definition(
					field.id,
					field.label,
					field.choices === undefined ? 'number' : 'enum',
					count,
					field.choices?.map((choice) => choice.label),
				),
			)
		}
		case 'ip-address':
			return [definition('address', inquiry.name, 'text', 1)]
		case 'ip-info':
			return [
				definition('info', 'Network information', 'text', 4),
				definition('ip_address', 'IP address', 'text', 4),
				definition('subnet_mask', 'Subnet mask', 'text', 4),
				definition('gateway', 'Gateway', 'text', 4),
			]
		case 'version':
			return [
				definition('vendor_id', 'Vendor ID', 'text', 4),
				definition('model_id', 'Model ID', 'text', 4),
				definition('version', 'Firmware version', 'text', 4),
				definition('maximum_sockets', 'Maximum VISCA sockets', 'number', 4),
			]
		case 'ptzfi-block':
			return ['zoom_position', 'focus_position', 'pan_position', 'tilt_position', 'iris_position'].map((field) =>
				definition(field, field.replaceAll('_', ' '), 'number', 5),
			)
		case 'white-balance-block':
			return [
				'manual_red_gain',
				'manual_blue_gain',
				'white_balance_mode',
				'automatic_red_gain',
				'automatic_green_gain',
				'automatic_blue_gain',
				'shutter_position',
			].map((field) => definition(field, field.replaceAll('_', ' '), 'number', 7))
		case 'heartbeat':
			return [
				definition('status', 'Heartbeat status', 'text', 2),
				definition('device_address', 'VISCA device address', 'number', 2),
			]
	}
}

export const cameraStateValueDefinitions = lv20nInquiryCatalog.flatMap(inquiryStateValueDefinitions)

export function inquiryStateValues(
	inquiry: Lv20nInquirySpec,
	fields: Record<string, string | number>,
): Record<string, string | number> {
	return Object.fromEntries(
		inquiryStateValueDefinitions(inquiry).flatMap((value) =>
			fields[value.fieldId] === undefined ? [] : [[value.id, fields[value.fieldId]]],
		),
	)
}
