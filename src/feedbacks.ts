import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import type { AvkansLv20nInstance } from './instance.js'
import type { CameraTarget, ConfiguredCamera } from './config.js'
import { cameraTargetChoices } from './actions/camera-target.js'

export const InquiryValueFeedbackId = 'lv20n_inquiry_value'
export const InquiryEqualsFeedbackId = 'lv20n_inquiry_equals'
export const ActiveCameraFeedbackId = 'active_camera'
export const CameraConnectionFeedbackId = 'camera_connected'

const InquiryOptionId = 'inquiry'
const ExpectedValueOptionId = 'expected'

const inquiryChoices = lv20nInquiryCatalog.map((inquiry) => ({ id: inquiry.id, label: inquiry.name }))

function target(options: Record<string, unknown>): CameraTarget {
	const slot = Number(options.camera)
	return slot === 1 || slot === 2 || slot === 3 || slot === 4 ? slot : 'active'
}

export function getLv20nFeedbacks(
	instance: AvkansLv20nInstance,
	roster: ConfiguredCamera[],
): CompanionFeedbackDefinitions {
	const cameraOption = {
		type: 'dropdown' as const,
		id: 'camera',
		label: 'Camera',
		choices: cameraTargetChoices(roster),
		default: 'active',
	}
	return {
		[ActiveCameraFeedbackId]: {
			type: 'boolean',
			name: 'Camera is active',
			description: 'Activates when the selected camera is the active camera.',
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 153, 0) },
			options: [cameraOption],
			callback: ({ options }) => instance.isCameraActive(target(options)),
		},
		[CameraConnectionFeedbackId]: {
			type: 'boolean',
			name: 'Camera is connected',
			description: 'Activates when the selected camera is connected.',
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 153, 0) },
			options: [cameraOption],
			callback: ({ options }) => instance.cameraIsConnected(target(options)),
		},
		[InquiryValueFeedbackId]: {
			type: 'value',
			name: 'LV20N inquiry result',
			description: 'Displays the most recently retrieved value for an LV20N inquiry.',
			options: [
				cameraOption,
				{
					type: 'dropdown',
					id: InquiryOptionId,
					label: 'Inquiry',
					choices: inquiryChoices,
					default: 'power',
				},
			],
			callback: ({ options }) => instance.lv20nInquiryResult(String(options[InquiryOptionId]), target(options)) ?? '',
		},
		[InquiryEqualsFeedbackId]: {
			type: 'boolean',
			name: 'LV20N inquiry result equals',
			description: 'Activates when the most recently retrieved inquiry value equals the expected text.',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 153, 0),
			},
			options: [
				cameraOption,
				{
					type: 'dropdown',
					id: InquiryOptionId,
					label: 'Inquiry',
					choices: inquiryChoices,
					default: 'power',
				},
				{
					type: 'textinput',
					id: ExpectedValueOptionId,
					label: 'Expected result',
					default: 'On',
				},
			],
			callback: ({ options }) =>
				instance.lv20nInquiryResult(String(options[InquiryOptionId]), target(options)) ===
				String(options[ExpectedValueOptionId]),
		},
	}
}
