import type { CompanionActionEvent } from '@companion-module/base'
import type { ActionDefinitions } from './actionid.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { speedChoices } from './speeds.js'

export enum ZoomActionId {
	StartZoomIn = 'zoomI',
	StartZoomOut = 'zoomO',
	StopZoom = 'zoomS',
	SetZoomSpeed = 'zoomSpeedSet',
}

export const ZoomSpeedOptionId = 'speed'

export function zoomActions(instance: AvkansLv20nInstance): ActionDefinitions<ZoomActionId> {
	return {
		[ZoomActionId.StartZoomIn]: {
			name: 'Zoom In',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.moveZoomNative(1)
			},
		},
		[ZoomActionId.StartZoomOut]: {
			name: 'Zoom Out',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.moveZoomNative(-1)
			},
		},
		[ZoomActionId.StopZoom]: {
			name: 'Zoom Stop',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.moveZoomNative(0)
			},
		},
		[ZoomActionId.SetZoomSpeed]: {
			name: 'Set Zoom Speed',
			description: 'Sets the speed used by the Zoom In and Zoom Out actions on the selected camera.',
			options: [
				{
					type: 'dropdown',
					id: ZoomSpeedOptionId,
					label: 'Zoom speed',
					choices: speedChoices(1, 8),
					default: 5,
				},
			],
			callback: async ({ options }) => {
				await instance.setZoomSpeedNative(Number(options[ZoomSpeedOptionId]))
			},
		},
	}
}
