import { describe, expect, test, vi } from 'vitest'
import { lv20nInquiryActions } from './lv20n-inquiries.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { activeCameraStateVariableValues, getLv20nVariableDefinitions } from '../variables.js'

function mockInstance() {
	const sendRawInquiry = vi.fn().mockResolvedValue([0x90, 0x50, 0x02, 0xff])
	const setVariableValues = vi.fn()
	const recordLv20nInquiryResult = vi.fn()
	return {
		instance: {
			sendRawInquiry,
			setVariableValues,
			recordLv20nInquiryResult,
			log: vi.fn(),
		} as unknown as AvkansLv20nInstance,
		sendRawInquiry,
		setVariableValues,
		recordLv20nInquiryResult,
	}
}

describe('LV20N inquiry actions and variables', () => {
	test('registers all 48 inquiry actions', () => {
		const actions = lv20nInquiryActions(mockInstance().instance)
		expect(Object.keys(actions)).toHaveLength(48)
		expect(actions.lv20n_inquiry_power?.name).toBe('Get camera state: Power')
		expect(actions.lv20n_inquiry_ptzfi_block?.name).toBe('Get camera state: PTZ/focus/iris block')
	})

	test('updates the camera state value', async () => {
		const { instance, sendRawInquiry, recordLv20nInquiryResult } = mockInstance()
		const action = lv20nInquiryActions(instance).lv20n_inquiry_power

		await action.callback(
			{ actionId: 'lv20n_inquiry_power', controlId: 'test', id: 'test', surfaceId: undefined, options: {} },
			{} as never,
		)

		expect(sendRawInquiry).toHaveBeenCalledWith([0x81, 0x09, 0x04, 0x00, 0xff])
		expect(recordLv20nInquiryResult).toHaveBeenCalledWith(expect.objectContaining({ id: 'power' }), { value: 'On' })
	})

	test('defines concise unique active and per-camera variables without duplicate rollups', () => {
		const definitions = getLv20nVariableDefinitions()
		expect(new Set(definitions.map((definition) => definition.variableId)).size).toBe(definitions.length)
		const ids = definitions.map((definition) => definition.variableId)
		expect(ids).toEqual(expect.arrayContaining(['camera_active_name', 'camera_active_zoom_position', 'camera_4_power']))
		expect(ids).not.toContain('camera_active_zoom_position_position')
		expect(ids.some((id) => id.includes('lv20n_inquiry'))).toBe(false)
	})

	test('projects cached active-camera values while clearing values absent on the new camera', () => {
		const values = activeCameraStateVariableValues({
			power: 'On',
		})
		expect(values.camera_active_power).toBe('On')
		expect(values.camera_active_version).toBe('')
	})
})
