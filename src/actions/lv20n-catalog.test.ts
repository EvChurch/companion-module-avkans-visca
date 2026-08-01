import { describe, expect, test, vi } from 'vitest'
import { lv20nCatalogActions } from './lv20n-catalog.js'
import type { AvkansLv20nInstance } from '../instance.js'

function mockInstance(): { instance: AvkansLv20nInstance; sendCommandAndRefresh: ReturnType<typeof vi.fn> } {
	const sendCommandAndRefresh = vi.fn()
	return {
		instance: {
			sendCommandAndRefresh,
			log: vi.fn(),
		} as unknown as AvkansLv20nInstance,
		sendCommandAndRefresh,
	}
}

describe('LV20N catalog actions', () => {
	test('registers one searchable action for every camera command group', () => {
		const actions = lv20nCatalogActions(mockInstance().instance)
		expect(Object.keys(actions)).toHaveLength(46)
		expect(actions.lv20n_zoom?.name).toBe('Camera control: Zoom')
		expect(actions.lv20n_tally?.name).toBe('Camera control: Tally light')
		expect(actions.lv20n_ip_address?.name).toBe('Camera control: Network IP address')
	})

	test('uses neutral labels for parameters shared by opposite directions', () => {
		const actions = lv20nCatalogActions(mockInstance().instance)
		const zoomSpeed = actions.lv20n_zoom.options.find((option) => option.id === 'speed')
		const focusSpeed = actions.lv20n_focus.options.find((option) => option.id === 'speed')

		expect(zoomSpeed?.label).toBe('Speed')
		expect(focusSpeed?.label).toBe('Speed')
	})

	test('sends the selected command with supplied parameters', async () => {
		const { instance, sendCommandAndRefresh } = mockInstance()
		const action = lv20nCatalogActions(instance).lv20n_zoom

		await action.callback(
			{
				actionId: 'lv20n_zoom',
				controlId: 'test',
				id: 'test',
				surfaceId: undefined,
				options: { command: 'r14', position: 0x4000 },
			},
			{} as never,
		)

		expect(sendCommandAndRefresh).toHaveBeenCalledOnce()
		expect(sendCommandAndRefresh.mock.calls[0][0]).toBe('zoom')
		const command = sendCommandAndRefresh.mock.calls[0][1]
		expect(command.toBytes({})).toStrictEqual([0x81, 0x01, 0x04, 0x47, 0x04, 0x00, 0x00, 0x00, 0xff])
	})
})
