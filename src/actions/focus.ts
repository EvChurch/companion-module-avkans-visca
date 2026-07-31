import type { CompanionActionEvent } from '@companion-module/base'
import type { ActionDefinitions } from './actionid.js'
import { FocusFarStandard, FocusMode, FocusNearStandard, FocusStop } from '../camera/focus.js'
import { FocusModeInquiry } from '../camera/focus.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { optionConversions } from './option-conversion.js'

export enum FocusActionId {
	SelectFocusMode = 'focusM',
	StartFocusNearer = 'focusN',
	StartFocusFarther = 'focusF',
	StopFocus = 'focusS',
}

export const FocusModeId = 'bol'

const [getFocusMode, focusModeToOption] = optionConversions<FocusMode, typeof FocusModeId>(
	FocusModeId,
	[
		['0', 'auto'],
		['1', 'manual'],
	],
	'auto',
	'0',
	String,
)

export function focusActions(instance: AvkansLv20nInstance): ActionDefinitions<FocusActionId> {
	return {
		[FocusActionId.SelectFocusMode]: {
			name: 'Focus Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Auto/manual focus',
					id: FocusModeId,
					choices: [
						{ id: '0', label: 'Auto focus' },
						{ id: '1', label: 'Manual focus' },
					],
					default: '0',
				},
			],
			callback: async ({ options }) => {
				const mode = getFocusMode(options)
				instance.sendCommand(FocusMode, { mode })
			},
			learn: async (_event: CompanionActionEvent) => {
				const answer = await instance.sendInquiry(FocusModeInquiry)
				if (answer === null) {
					return undefined
				}
				return { [FocusModeId]: focusModeToOption(answer.mode) }
			},
		},
		[FocusActionId.StartFocusNearer]: {
			name: 'Focus Near',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusNearStandard)
			},
		},
		[FocusActionId.StartFocusFarther]: {
			name: 'Focus Far',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusFarStandard)
			},
		},
		[FocusActionId.StopFocus]: {
			name: 'Focus Stop',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusStop)
			},
		},
	}
}
