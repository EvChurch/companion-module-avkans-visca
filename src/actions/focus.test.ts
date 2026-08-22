import { describe, expect, test, vi } from 'vitest'
import type { AvkansLv20nInstance } from '../instance.js'
import { FocusActionId, FocusModeId, focusActions } from './focus.js'

function mockInstance(): { instance: AvkansLv20nInstance; setAutoFocusNative: ReturnType<typeof vi.fn> } {
	const setAutoFocusNative = vi.fn()
	return {
		instance: {
			setAutoFocusNative,
			sendInquiry: vi.fn(async () => ({ mode: 'auto' })),
		} as unknown as AvkansLv20nInstance,
		setAutoFocusNative,
	}
}

describe('focus actions', () => {
	test('offers and sends the focus mode toggle command', async () => {
		const { instance, setAutoFocusNative } = mockInstance()
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

		expect(setAutoFocusNative).toHaveBeenCalledWith(false)
	})
})
