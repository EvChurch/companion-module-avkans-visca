import { type CompanionActionEvent } from '@companion-module/base'
import type { ActionDefinitions } from './actionid.js'
import {
	OnScreenDisplayBack,
	OnScreenDisplayClose,
	OnScreenDisplayEnter,
	OnScreenDisplayOpen,
	OnScreenDisplayToggle,
} from '../camera/osd.js'
import type { AvkansLv20nInstance } from '../instance.js'

export enum OSDActionId {
	OSD = 'onScreenDisplay',
	OSDEnter = 'onScreenDisplayEnter',
	OSDBack = 'onScreenDisplayBack',
}

export const OnScreenDisplayMenuStateId = 'state'

export function osdActions(instance: AvkansLv20nInstance): ActionDefinitions<OSDActionId> {
	return {
		[OSDActionId.OSD]: {
			name: 'OSD Open/Close',
			options: [
				{
					type: 'dropdown',
					label: 'Activate OSD menu',
					id: OnScreenDisplayMenuStateId,
					choices: [
						{ id: 'open', label: 'Open' },
						{ id: 'close', label: 'Close' },
						{ id: 'toggle', label: 'Toggle' },
					],
					default: 'toggle',
				},
			],
			callback: async ({ options }) => {
				switch (options[OnScreenDisplayMenuStateId]) {
					case 'close':
						instance.sendCommand(OnScreenDisplayClose)
						return
					case 'toggle':
						instance.sendCommand(OnScreenDisplayToggle)
						return
					default:
					case 'open':
						instance.sendCommand(OnScreenDisplayOpen)
						return
				}
			},
		},
		[OSDActionId.OSDEnter]: {
			name: 'OSD Enter',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(OnScreenDisplayEnter)
			},
		},
		[OSDActionId.OSDBack]: {
			name: 'OSD Back',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(OnScreenDisplayBack)
			},
		},
	}
}
