import { expect, test } from 'vitest'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import { CameraState } from './camera-state.js'

const power = lv20nInquiryCatalog.find((inquiry) => inquiry.id === 'power')!

test('keeps inquiry results isolated by camera and projects active aliases', () => {
	const state = new CameraState()
	const update = state.record(2, power, { value: 'On' })
	if (update === undefined) throw new Error('Expected initial state update')
	expect(update.scoped.camera_2_power).toBe('On')
	expect(update.active.camera_active_power).toBe('On')
	expect(state.value(1, 'power')).toBeUndefined()
	expect(state.value(2, 'power')).toBe('On')
	expect(state.activeVariables(2).camera_active_power).toBe('On')
	expect(state.activeVariables(1).camera_active_power).toBe('')
})

test('clears cached inquiry state when a slot is assigned to a different host', () => {
	const state = new CameraState()
	state.record(1, power, { value: 'On' })
	state.clear(1)
	expect(state.value(1, 'power')).toBeUndefined()
	expect(state.cameraVariables(1).camera_1_power).toBe('')
})

test('suppresses updates when a camera returns the same state again', () => {
	const state = new CameraState()
	state.record(1, power, { value: 'On' })
	expect(state.record(1, power, { value: 'On' })).toBeUndefined()
})
