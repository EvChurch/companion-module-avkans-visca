import { describe, expect, test, vi } from 'vitest'
import { getLv20nFeedbacks, InquiryEqualsFeedbackId, InquiryValueFeedbackId } from './feedbacks.js'
import type { AvkansLv20nInstance } from './instance.js'

function feedbackEvent(feedbackId: string, options: Record<string, string>) {
	return { type: 'value' as const, id: 'test', controlId: 'test', feedbackId, options }
}

describe('LV20N inquiry feedbacks', () => {
	test('returns cached inquiry values and supports equality checks', async () => {
		const instance = {
			lv20nInquiryResult: vi.fn((id: string) => (id === 'power' ? 'On' : undefined)),
		} as unknown as AvkansLv20nInstance
		const feedbacks = getLv20nFeedbacks(instance)

		const valueFeedback = feedbacks[InquiryValueFeedbackId]
		if (!valueFeedback || valueFeedback.type !== 'value') throw new Error('Missing value feedback')
		expect(await valueFeedback.callback(feedbackEvent(InquiryValueFeedbackId, { inquiry: 'power' }), {} as never)).toBe(
			'On',
		)

		const equalsFeedback = feedbacks[InquiryEqualsFeedbackId]
		if (!equalsFeedback || equalsFeedback.type !== 'boolean') throw new Error('Missing equality feedback')
		expect(
			await equalsFeedback.callback(
				{ ...feedbackEvent(InquiryEqualsFeedbackId, { inquiry: 'power', expected: 'On' }), type: 'boolean' },
				{} as never,
			),
		).toBe(true)
	})
})
