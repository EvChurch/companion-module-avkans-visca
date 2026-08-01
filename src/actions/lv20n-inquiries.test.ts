import { describe, expect, test, vi } from 'vitest'
import { lv20nInquiryActions } from './lv20n-inquiries.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { getLv20nVariableDefinitions } from '../variables.js'

function mockInstance() {
	const sendRawInquiry = vi.fn().mockResolvedValue([0x90, 0x50, 0x02, 0xff])
	const setVariableValues = vi.fn()
	return {
		instance: {
			sendRawInquiry,
			setVariableValues,
			recordLv20nInquiryResult: vi.fn(),
			log: vi.fn(),
		} as unknown as AvkansLv20nInstance,
		sendRawInquiry,
		setVariableValues,
	}
}

describe('LV20N inquiry actions and variables', () => {
	test('registers all 48 inquiry actions', () => {
		const actions = lv20nInquiryActions(mockInstance().instance)
		expect(Object.keys(actions)).toHaveLength(48)
		expect(actions.lv20n_inquiry_power?.name).toBe('LV20N Inquiry: Power')
		expect(actions.lv20n_inquiry_ptzfi_block?.name).toBe('LV20N Inquiry: PTZ/focus/iris block')
	})

	test('updates aggregate, field, last-result, and raw-response variables', async () => {
		const { instance, sendRawInquiry, setVariableValues } = mockInstance()
		const action = lv20nInquiryActions(instance).lv20n_inquiry_power

		await action.callback(
			{ actionId: 'lv20n_inquiry_power', controlId: 'test', id: 'test', surfaceId: undefined, options: {} },
			{} as never,
		)

		expect(sendRawInquiry).toHaveBeenCalledWith([0x81, 0x09, 0x04, 0x00, 0xff])
		expect(setVariableValues).toHaveBeenCalledWith(
			expect.objectContaining({
				lv20n_inquiry_power: 'On',
				lv20n_inquiry_power_value: 'On',
				lv20n_last_inquiry_id: 'power',
				lv20n_last_inquiry_result: 'On',
				lv20n_last_inquiry_hex: '[90 50 02 FF]',
			}),
		)
	})

	test('defines unique variables for every inquiry and decoded field', () => {
		const definitions = getLv20nVariableDefinitions()
		expect(definitions.length).toBeGreaterThan(96)
		expect(new Set(definitions.map((definition) => definition.variableId)).size).toBe(definitions.length)
	})
})
