import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import { cameraTargetChoices } from './actions/camera-target.js'
import { cameraStateValueDefinitions } from './camera-state-values.js'
import type { CameraTarget, ConfiguredCamera } from './config.js'
import type { AvkansLv20nInstance } from './instance.js'

export const ActiveCameraFeedbackId = 'camera_active'
export const CameraConnectionFeedbackId = 'camera_connected'

export function cameraStateFeedbackId(id: string): string {
	return `camera_state_${id}`
}

const enumStateDefinitions = cameraStateValueDefinitions.filter((definition) => definition.kind === 'enum')
export const CameraStateFeedbackIds = enumStateDefinitions.map((definition) => cameraStateFeedbackId(definition.id))

export function cameraStateFeedbackIdsForInquiry(inquiryId: string): string[] {
	return enumStateDefinitions
		.filter((definition) => definition.inquiryId === inquiryId)
		.map((definition) => cameraStateFeedbackId(definition.id))
}

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
	const feedbacks: CompanionFeedbackDefinitions = {
		[ActiveCameraFeedbackId]: {
			type: 'boolean',
			name: 'Active camera is',
			description: 'True when the selected camera is currently active.',
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 153, 0) },
			options: [cameraOption],
			callback: ({ options }) => instance.isCameraActive(target(options)),
		},
		[CameraConnectionFeedbackId]: {
			type: 'boolean',
			name: 'Camera is connected',
			description: 'True when the selected camera has an active VISCA connection.',
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 153, 0) },
			options: [cameraOption],
			callback: ({ options }) => instance.cameraIsConnected(target(options)),
		},
	}

	for (const definition of enumStateDefinitions) {
		const id = cameraStateFeedbackId(definition.id)
		feedbacks[id] = {
			type: 'boolean',
			name: `Camera: ${definition.label} is`,
			description: `True when “${definition.label}” on the selected camera matches the chosen value.`,
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 153, 0) },
			options: [
				cameraOption,
				{
					type: 'dropdown',
					id: 'expected',
					label: definition.label,
					choices: (definition.choices ?? []).map((value) => ({ id: value, label: value })),
					default: definition.choices?.[0] ?? '',
				},
			],
			callback: ({ options }) => instance.cameraStateValue(definition.id, target(options)) === String(options.expected),
			subscribe: async ({ options }) => instance.refreshCameraState(target(options), definition.inquiryId),
		}
	}

	return feedbacks
}
