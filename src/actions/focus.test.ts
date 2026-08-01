import { describe, expect, test, vi } from 'vitest'
import type { AvkansLv20nInstance } from '../instance.js'
import { FocusActionId, FocusModeId, focusActions } from './focus.js'

function mockInstance(): { instance: AvkansLv20nInstance; sendCommandAndRefresh: ReturnType<typeof vi.fn> } {
	const sendCommandAndRefresh = vi.fn()
	return {
		instance: {
			sendCommandAndRefresh,
			sendInquiry: vi.fn(),
		} as unknown as AvkansLv20nInstance,
		sendCommandAndRefresh,
	}
}

describe('focus actions', () => {
	test('offers and sends the focus mode toggle command', async () => {
		const { instance, sendCommandAndRefresh } = mockInstance()
		const action = focusActions(instance)[FocusActionId.SelectFocusMode]
		const mode = action.options.find((option) => option.id === FocusModeId)

		expect(mode).toMatchObject({
			choices: expect.arrayContaining([{ id: '2', label: 'Toggle' }]),
		})

		await action.callback(
			{
				actionId: FocusActionId.SelectFocusMode,
				controlId: 'test',
				id: 'test',
				surfaceId: undefined,
				options: { [FocusModeId]: '2' },
			},
			{} as never,
		)

		expect(sendCommandAndRefresh).toHaveBeenCalledOnce()
		expect(sendCommandAndRefresh.mock.calls[0][0]).toBe('focus')
		expect(sendCommandAndRefresh.mock.calls[0][1].toBytes({})).toStrictEqual([0x81, 0x01, 0x04, 0x38, 0x10, 0xff])
	})
})
