import type { ActionDefinitions } from './actionid.js'
import { lv20nInquiryCatalog } from '../camera/lv20n-inquiry-catalog.js'
import { decodeLv20nInquiry, formatLv20nInquiryResult } from '../camera/lv20n-inquiry.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { prettyBytes } from '../utils/pretty.js'
import {
	inquiryVariableId,
	LastInquiryHexVariable,
	LastInquiryIdVariable,
	LastInquiryResultVariable,
} from '../variables.js'

export type Lv20nInquiryActionId = `lv20n_inquiry_${(typeof lv20nInquiryCatalog)[number]['id']}`

export function lv20nInquiryActions(instance: AvkansLv20nInstance): ActionDefinitions<Lv20nInquiryActionId> {
	const actions: Partial<ActionDefinitions<Lv20nInquiryActionId>> = {}

	for (const inquiry of lv20nInquiryCatalog) {
		const actionId: Lv20nInquiryActionId = `lv20n_inquiry_${inquiry.id}`
		actions[actionId] = {
			name: `LV20N Inquiry: ${inquiry.name}`,
			description: `Run the inquiry documented at workbook row ${inquiry.workbookRow} and update its Companion variables.`,
			options: [],
			callback: async () => {
				const response = await instance.sendRawInquiry(inquiry.bytes)
				if (response === null) return

				try {
					const result = decodeLv20nInquiry(inquiry, response)
					const formatted = formatLv20nInquiryResult(result)
					const values = Object.fromEntries(
						Object.entries(result).map(([field, value]) => [inquiryVariableId(inquiry, field), value]),
					)
					instance.setVariableValues({
						...values,
						[inquiryVariableId(inquiry)]: formatted,
						[LastInquiryIdVariable]: inquiry.id,
						[LastInquiryResultVariable]: formatted,
						[LastInquiryHexVariable]: prettyBytes(response),
					})
					instance.recordLv20nInquiryResult(inquiry.id, formatted)
				} catch (error) {
					instance.log(
						'error',
						`Unable to decode LV20N ${inquiry.name} inquiry: ${error instanceof Error ? error.message : error}`,
					)
				}
			},
		}
	}

	return actions as ActionDefinitions<Lv20nInquiryActionId>
}
