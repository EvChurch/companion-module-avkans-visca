import { expect, test, vi } from 'vitest'
import { lv20nCommandGroups } from './camera/lv20n-command-catalog.js'
import {
	automaticallyRefreshedInquiries,
	CameraStatePoller,
	CameraStateRefreshCoordinator,
	inquiriesForCommandGroup,
	loadCameraState,
} from './camera-state-loader.js'

test('loads every inquiry supported by the live LV20N and skips the three timing out commands', async () => {
	expect(automaticallyRefreshedInquiries).toHaveLength(45)
	expect(automaticallyRefreshedInquiries.map((inquiry) => inquiry.id)).not.toEqual(
		expect.arrayContaining(['ptzfi_block', 'white_balance_block', 'heartbeat']),
	)
	const send = vi.fn(async () => [0x90, 0x50, 0x02, 0xff])
	const record = vi.fn()
	await loadCameraState(
		1,
		automaticallyRefreshedInquiries.filter((inquiry) => inquiry.id === 'power'),
		send,
		record,
	)
	expect(send).toHaveBeenCalledWith(1, [0x81, 0x09, 0x04, 0x00, 0xff])
	expect(record).toHaveBeenCalledWith(1, expect.objectContaining({ id: 'power' }), { value: 'On' })
})

test('continues loading after one state query fails', async () => {
	const inquiries = automaticallyRefreshedInquiries.filter((inquiry) => ['power', 'focus_mode'].includes(inquiry.id))
	const send = vi
		.fn()
		.mockRejectedValueOnce(new Error('connection changed'))
		.mockResolvedValueOnce([0x90, 0x50, 0x02, 0xff])
	const record = vi.fn()
	await loadCameraState(1, inquiries, send, record)
	expect(record).toHaveBeenCalledOnce()
	expect(record).toHaveBeenCalledWith(1, expect.objectContaining({ id: 'focus_mode' }), { value: 'Auto Focus' })
})

test('deduplicates reconnect refreshes without suppressing a changed camera host', () => {
	const refreshes = new CameraStateRefreshCoordinator()
	const initial = refreshes.beginAutomatic(1)
	expect(initial).toBe(0)
	expect(refreshes.beginAutomatic(1)).toBeUndefined()

	refreshes.advance(1)
	const changedHost = refreshes.beginAutomatic(1)
	expect(changedHost).toBe(1)

	refreshes.finishAutomatic(1, initial!)
	expect(refreshes.beginAutomatic(1)).toBeUndefined()
	refreshes.finishAutomatic(1, changedHost!)
	expect(refreshes.beginAutomatic(1)).toBe(1)
})

test('maps control groups to the state they change', () => {
	expect(inquiriesForCommandGroup('power').map((inquiry) => inquiry.id)).toStrictEqual(['power'])
	expect(inquiriesForCommandGroup('focus').map((inquiry) => inquiry.id)).toStrictEqual(['focus_mode', 'focus_position'])
	expect(inquiriesForCommandGroup('zoom_focus').map((inquiry) => inquiry.id)).toStrictEqual([
		'zoom_position',
		'focus_mode',
		'focus_position',
	])
	expect(inquiriesForCommandGroup('tally')).toStrictEqual([])
})

test('maps every catalog control with queryable state', () => {
	const groupsWithoutQueryableState = lv20nCommandGroups
		.filter((group) => inquiriesForCommandGroup(group.id).length === 0)
		.map((group) => group.id)

	expect(groupsWithoutQueryableState).toStrictEqual(['address_set', 'system_menu'])
})

test('polls again only after the previous refresh finishes', async () => {
	vi.useFakeTimers()
	let finishRefresh: (() => void) | undefined
	const refresh = vi.fn(
		async () =>
			new Promise<void>((resolve) => {
				finishRefresh = resolve
			}),
	)
	const poller = new CameraStatePoller(refresh, 30_000)

	poller.start()
	await vi.advanceTimersByTimeAsync(30_000)
	expect(refresh).toHaveBeenCalledOnce()
	await vi.advanceTimersByTimeAsync(60_000)
	expect(refresh).toHaveBeenCalledOnce()

	finishRefresh?.()
	await vi.advanceTimersByTimeAsync(30_000)
	expect(refresh).toHaveBeenCalledTimes(2)
	poller.stop()
	vi.useRealTimers()
})

test('continues polling after a failed refresh and stops cleanly', async () => {
	vi.useFakeTimers()
	const refresh = vi.fn().mockRejectedValueOnce(new Error('camera disconnected')).mockResolvedValue(undefined)
	const poller = new CameraStatePoller(refresh, 30_000)

	poller.start()
	await vi.advanceTimersByTimeAsync(60_000)
	expect(refresh).toHaveBeenCalledTimes(2)
	poller.stop()
	await vi.advanceTimersByTimeAsync(60_000)
	expect(refresh).toHaveBeenCalledTimes(2)
	vi.useRealTimers()
})
