import { expect, test } from 'vitest'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import { CameraState } from './camera-state.js'

const power = lv20nInquiryCatalog.find((inquiry) => inquiry.id === 'power')!

test('keeps inquiry results isolated by camera and projects active aliases', () => {
	const state = new CameraState()
	const update = state.record(2, power, 'On', [0x90, 0x50, 0x02, 0xff], { value: 'On' })
	expect(update.scoped.camera_2_lv20n_inquiry_power).toBe('On')
	expect(state.inquiryResult(1, 'power')).toBeUndefined()
	expect(state.inquiryResult(2, 'power')).toBe('On')
	expect(state.activeVariables(2).lv20n_inquiry_power).toBe('On')
	expect(state.activeVariables(1).lv20n_inquiry_power).toBe('')
})

test('clears cached inquiry state when a slot is assigned to a different host', () => {
	const state = new CameraState()
	state.record(1, power, 'On', [0x90, 0x50, 0x02, 0xff], { value: 'On' })
	state.clear(1)
	expect(state.inquiryResult(1, 'power')).toBeUndefined()
	expect(state.cameraVariables(1).camera_1_lv20n_inquiry_power).toBe('')
})
