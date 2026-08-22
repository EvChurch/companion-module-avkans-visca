import { describe, expect, test, vi } from 'vitest'
import {
	ActiveCameraFeedbackId,
	cameraStateFeedbackId,
	CameraConnectionFeedbackId,
	getLv20nFeedbacks,
	trackingFeedbackId,
} from './feedbacks.js'
import { cameraRoster, noCameraConfig } from './config.js'
import type { AvkansLv20nInstance } from './instance.js'

function feedbackEvent(feedbackId: string, options: Record<string, string | number>) {
	return { type: 'value' as const, id: 'test', controlId: 'test', feedbackId, options }
}

describe('camera state feedbacks', () => {
	test('provides named camera conditions and refreshes subscribed state', async () => {
		const refreshCameraState = vi.fn()
		const instance = {
			cameraStateValue: vi.fn((id: string, target: string | number) =>
				id === 'power' && target === 2 ? 'On' : undefined,
			),
			refreshCameraState,
			isCameraActive: vi.fn((target: string | number) => target === 2),
			cameraIsConnected: vi.fn((target: string | number) => target === 2),
		} as unknown as AvkansLv20nInstance
		const config = noCameraConfig()
		config.cameras[2] = { name: 'Tight', host: '10.0.0.2', username: 'admin' }
		const feedbacks = getLv20nFeedbacks(instance, cameraRoster(config))

		const powerId = cameraStateFeedbackId('power')
		const power = feedbacks[powerId]
		if (!power || power.type !== 'boolean') throw new Error('Missing power feedback')
		expect(power.name).toBe('Camera: Power is')
		expect(
			await power.callback({ ...feedbackEvent(powerId, { camera: 2, expected: 'On' }), type: 'boolean' }, {} as never),
		).toBe(true)
		await power.subscribe?.(feedbackEvent(powerId, { camera: 2, expected: 'On' }), {} as never)
		expect(refreshCameraState).toHaveBeenCalledWith(2, 'power')

		const active = feedbacks[ActiveCameraFeedbackId]
		const connected = feedbacks[CameraConnectionFeedbackId]
		if (!active || active.type !== 'boolean' || !connected || connected.type !== 'boolean') throw new Error('missing')
		expect(
			await active.callback({ ...feedbackEvent(ActiveCameraFeedbackId, { camera: 2 }), type: 'boolean' }, {} as never),
		).toBe(true)
		expect(
			await connected.callback(
				{ ...feedbackEvent(CameraConnectionFeedbackId, { camera: 2 }), type: 'boolean' },
				{} as never,
			),
		).toBe(true)
		expect(active.name).toBe('Active camera is')
	})
})

test('provides direct per-camera tracking feedbacks', async () => {
	const refreshTracking = vi.fn()
	const instance = {
		trackingValue: vi.fn((id: string, target: string | number) =>
			id === 'base2_autozoomenablechk' && target === 2 ? 1 : undefined,
		),
		refreshTracking,
		isCameraActive: vi.fn(),
		cameraIsConnected: vi.fn(),
		cameraStateValue: vi.fn(),
		refreshCameraState: vi.fn(),
	} as unknown as AvkansLv20nInstance
	const config = noCameraConfig()
	config.cameras[2] = { name: 'Tight', host: '10.0.0.2', username: 'admin' }
	const field = {
		id: 'base2_autozoomenablechk',
		panel: 'Base2' as const,
		key: 'autoZoomEnableChk',
		label: 'Auto Zoom',
		component: 'Switch' as const,
		default: 1,
	}
	const feedbacks = getLv20nFeedbacks(instance, cameraRoster(config), [field])
	const id = trackingFeedbackId(field.id)
	const feedback = feedbacks[id]
	if (!feedback || feedback.type !== 'boolean') throw new Error('missing tracking feedback')

	expect(feedback.name).toBe('Camera: Tracking Auto Zoom is')
	expect(
		await feedback.callback({ ...feedbackEvent(id, { camera: 2, expected: 1 }), type: 'boolean' }, {} as never),
	).toBe(true)
	await feedback.subscribe?.(feedbackEvent(id, { camera: 2, expected: 1 }), {} as never)
	expect(refreshTracking).toHaveBeenCalledWith(2)
})
