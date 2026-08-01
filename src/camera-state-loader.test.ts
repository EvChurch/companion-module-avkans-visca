import { expect, test, vi } from 'vitest'
import {
	automaticallyRefreshedInquiries,
	CameraStateRefreshCoordinator,
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
