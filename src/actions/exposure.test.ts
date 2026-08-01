import { describe, expect, test, vi } from 'vitest'
import type { ExposureMode } from '../camera/exposure.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { ExposureActionId, ExposureModeId, exposureActions } from './exposure.js'

function mockInstance(mode: ExposureMode | null) {
	const sendInquiry = vi.fn().mockResolvedValue(mode === null ? null : { mode })
	const sendCommandAndRefresh = vi.fn()
	return {
		instance: { sendInquiry, sendCommandAndRefresh, log: vi.fn() } as unknown as AvkansLv20nInstance,
		sendInquiry,
		sendCommandAndRefresh,
	}
}

describe('exposure actions', () => {
	test.each([
		['full-auto', 0x03],
		['manual', 0x00],
	] as const)('toggles %s exposure mode', async (currentMode, expectedModeByte) => {
		const { instance, sendInquiry, sendCommandAndRefresh } = mockInstance(currentMode)
		const action = exposureActions(instance)[ExposureActionId.SelectExposureMode]
		const mode = action.options.find((option) => option.id === ExposureModeId)

		expect(mode).toMatchObject({
			choices: expect.arrayContaining([{ id: '5', label: 'Toggle' }]),
		})

		await action.callback(
			{
				actionId: ExposureActionId.SelectExposureMode,
				controlId: 'test',
				id: 'test',
				surfaceId: undefined,
				options: { [ExposureModeId]: '5' },
			},
			{} as never,
		)

		expect(sendInquiry).toHaveBeenCalledOnce()
		expect(sendCommandAndRefresh).toHaveBeenCalledOnce()
		expect(sendCommandAndRefresh.mock.calls[0][0]).toBe('exposure_mode')
		expect(sendCommandAndRefresh.mock.calls[0][1].toBytes(sendCommandAndRefresh.mock.calls[0][2])).toStrictEqual([
			0x81,
			0x01,
			0x04,
			0x39,
			expectedModeByte,
			0xff,
		])
	})

	test('does not guess when the current exposure mode cannot be read', async () => {
		const { instance, sendCommandAndRefresh } = mockInstance(null)
		const action = exposureActions(instance)[ExposureActionId.SelectExposureMode]

		await action.callback(
			{
				actionId: ExposureActionId.SelectExposureMode,
				controlId: 'test',
				id: 'test',
				surfaceId: undefined,
				options: { [ExposureModeId]: '5' },
			},
			{} as never,
		)

		expect(sendCommandAndRefresh).not.toHaveBeenCalled()
	})
})
