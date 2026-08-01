import type { CompanionVariableDefinition } from '@companion-module/base'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import { inquiryFieldIds, type Lv20nInquirySpec } from './camera/lv20n-inquiry.js'
import { CameraSlots, type CameraSlot } from './config.js'

export const LastInquiryIdVariable = 'lv20n_last_inquiry_id'
export const LastInquiryResultVariable = 'lv20n_last_inquiry_result'
export const LastInquiryHexVariable = 'lv20n_last_inquiry_hex'

export function inquiryVariableId(spec: Lv20nInquirySpec, field?: string): string {
	return inquiryResultVariableId(spec.id, field)
}

export function inquiryResultVariableId(id: string, field?: string): string {
	return `lv20n_inquiry_${id}${field !== undefined && field.length > 0 ? `_${field}` : ''}`
}

export function cameraVariableId(slot: CameraSlot, id: string): string {
	return `camera_${slot}_${id}`
}

function cameraInquiryVariableId(slot: CameraSlot, spec: Lv20nInquirySpec, field?: string): string {
	return cameraVariableId(slot, inquiryVariableId(spec, field))
}

function emptyLv20nInquiryVariableValues(): Record<string, string> {
	const values: Record<string, string> = {
		[LastInquiryIdVariable]: '',
		[LastInquiryResultVariable]: '',
		[LastInquiryHexVariable]: '',
	}
	for (const inquiry of lv20nInquiryCatalog) {
		values[inquiryVariableId(inquiry)] = ''
		for (const field of inquiryFieldIds(inquiry)) values[inquiryVariableId(inquiry, field)] = ''
	}
	return values
}

export function activeLv20nInquiryVariableValues(
	values: Record<string, string | number> | undefined,
): Record<string, string | number> {
	return { ...emptyLv20nInquiryVariableValues(), ...values }
}

export function getLv20nVariableDefinitions(): CompanionVariableDefinition[] {
	const definitions: CompanionVariableDefinition[] = [
		{ variableId: LastInquiryIdVariable, name: 'LV20N: Last inquiry' },
		{ variableId: LastInquiryResultVariable, name: 'LV20N: Last inquiry result' },
		{ variableId: LastInquiryHexVariable, name: 'LV20N: Last inquiry raw response' },
	]

	for (const inquiry of lv20nInquiryCatalog) {
		definitions.push({ variableId: inquiryVariableId(inquiry), name: `LV20N inquiry: ${inquiry.name}` })
		for (const field of inquiryFieldIds(inquiry)) {
			definitions.push({
				variableId: inquiryVariableId(inquiry, field),
				name: `LV20N inquiry: ${inquiry.name} — ${field.replaceAll('_', ' ')}`,
			})
		}
	}

	definitions.push(
		{ variableId: 'active_camera_slot', name: 'Active camera: Slot' },
		{ variableId: 'active_camera_name', name: 'Active camera: Name' },
		{ variableId: 'active_camera_ip', name: 'Active camera: IP address' },
		{ variableId: 'active_camera_status', name: 'Active camera: Connection status' },
	)

	for (const slot of CameraSlots) {
		const prefix = `Camera ${slot}`
		definitions.push(
			{ variableId: cameraVariableId(slot, 'name'), name: `${prefix}: Name` },
			{ variableId: cameraVariableId(slot, 'ip'), name: `${prefix}: IP address` },
			{ variableId: cameraVariableId(slot, 'status'), name: `${prefix}: Connection status` },
			{ variableId: cameraVariableId(slot, 'active'), name: `${prefix}: Active` },
			{ variableId: cameraVariableId(slot, LastInquiryIdVariable), name: `${prefix}: Last inquiry` },
			{ variableId: cameraVariableId(slot, LastInquiryResultVariable), name: `${prefix}: Last inquiry result` },
			{ variableId: cameraVariableId(slot, LastInquiryHexVariable), name: `${prefix}: Last inquiry raw response` },
		)
		for (const inquiry of lv20nInquiryCatalog) {
			definitions.push({ variableId: cameraInquiryVariableId(slot, inquiry), name: `${prefix}: ${inquiry.name}` })
			for (const field of inquiryFieldIds(inquiry)) {
				definitions.push({
					variableId: cameraInquiryVariableId(slot, inquiry, field),
					name: `${prefix}: ${inquiry.name} — ${field.replaceAll('_', ' ')}`,
				})
			}
		}
	}

	return definitions
}
