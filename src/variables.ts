import type { CompanionVariableDefinition } from '@companion-module/base'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import { inquiryFieldIds, type Lv20nInquirySpec } from './camera/lv20n-inquiry.js'

export const LastInquiryIdVariable = 'lv20n_last_inquiry_id'
export const LastInquiryResultVariable = 'lv20n_last_inquiry_result'
export const LastInquiryHexVariable = 'lv20n_last_inquiry_hex'

export function inquiryVariableId(spec: Lv20nInquirySpec, field?: string): string {
	return `lv20n_inquiry_${spec.id}${field !== undefined && field.length > 0 ? `_${field}` : ''}`
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

	return definitions
}
