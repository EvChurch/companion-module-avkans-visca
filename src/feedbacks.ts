import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import type { AvkansLv20nInstance } from './instance.js'

export const InquiryValueFeedbackId = 'lv20n_inquiry_value'
export const InquiryEqualsFeedbackId = 'lv20n_inquiry_equals'

const InquiryOptionId = 'inquiry'
const ExpectedValueOptionId = 'expected'

const inquiryChoices = lv20nInquiryCatalog.map((inquiry) => ({ id: inquiry.id, label: inquiry.name }))

export function getLv20nFeedbacks(instance: AvkansLv20nInstance): CompanionFeedbackDefinitions {
	return {
		[InquiryValueFeedbackId]: {
			type: 'value',
			name: 'LV20N inquiry result',
			description: 'Displays the most recently retrieved value for an LV20N inquiry.',
			options: [
				{
					type: 'dropdown',
					id: InquiryOptionId,
					label: 'Inquiry',
					choices: inquiryChoices,
					default: 'power',
				},
			],
			callback: ({ options }) => instance.lv20nInquiryResult(String(options[InquiryOptionId])) ?? '',
		},
		[InquiryEqualsFeedbackId]: {
			type: 'boolean',
			name: 'LV20N inquiry result equals',
			description: 'Activates when the most recently retrieved inquiry value equals the expected text.',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 153, 0),
			},
			options: [
				{
					type: 'dropdown',
					id: InquiryOptionId,
					label: 'Inquiry',
					choices: inquiryChoices,
					default: 'power',
				},
				{
					type: 'textinput',
					id: ExpectedValueOptionId,
					label: 'Expected result',
					default: 'On',
				},
			],
			callback: ({ options }) =>
				instance.lv20nInquiryResult(String(options[InquiryOptionId])) === String(options[ExpectedValueOptionId]),
		},
	}
}
