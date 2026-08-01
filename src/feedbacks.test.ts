import { describe, expect, test, vi } from 'vitest'
import {
	ActiveCameraFeedbackId,
	CameraConnectionFeedbackId,
	getLv20nFeedbacks,
	InquiryEqualsFeedbackId,
	InquiryValueFeedbackId,
} from './feedbacks.js'
import { cameraRoster, noCameraConfig } from './config.js'
import type { AvkansLv20nInstance } from './instance.js'

function feedbackEvent(feedbackId: string, options: Record<string, string | number>) {
	return { type: 'value' as const, id: 'test', controlId: 'test', feedbackId, options }
}

describe('LV20N inquiry feedbacks', () => {
	test('returns cached inquiry values and supports equality checks', async () => {
		const instance = {
			lv20nInquiryResult: vi.fn((id: string, target: string | number) =>
				id === 'power' && target === 2 ? 'On' : undefined,
			),
			isCameraActive: vi.fn((target: string | number) => target === 2),
			cameraIsConnected: vi.fn((target: string | number) => target === 2),
		} as unknown as AvkansLv20nInstance
		const config = noCameraConfig()
		config.cameras[2] = { name: 'Tight', host: '10.0.0.2' }
		const feedbacks = getLv20nFeedbacks(instance, cameraRoster(config))

		const valueFeedback = feedbacks[InquiryValueFeedbackId]
		if (!valueFeedback || valueFeedback.type !== 'value') throw new Error('Missing value feedback')
		expect(
			await valueFeedback.callback(feedbackEvent(InquiryValueFeedbackId, { camera: 2, inquiry: 'power' }), {} as never),
		).toBe('On')

		const equalsFeedback = feedbacks[InquiryEqualsFeedbackId]
		if (!equalsFeedback || equalsFeedback.type !== 'boolean') throw new Error('Missing equality feedback')
		expect(
			await equalsFeedback.callback(
				{ ...feedbackEvent(InquiryEqualsFeedbackId, { camera: 2, inquiry: 'power', expected: 'On' }), type: 'boolean' },
				{} as never,
			),
		).toBe(true)

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
	})
})
