import type { CompanionActionEvent } from '@companion-module/base'
import type { ActionDefinitions } from './actionid.js'
import { type FocusMode, FocusModeInquiry } from '../camera/focus.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { optionConversions } from './option-conversion.js'

export enum FocusActionId {
	SelectFocusMode = 'focusM',
	StartFocusNearer = 'focusN',
	StartFocusFarther = 'focusF',
	StopFocus = 'focusS',
}

export const FocusModeId = 'bol'

type FocusModeSelection = FocusMode | 'toggle'

const [getFocusMode, focusModeToOption] = optionConversions<FocusModeSelection, typeof FocusModeId>(
	FocusModeId,
	[
		['0', 'auto'],
		['1', 'manual'],
		['2', 'toggle'],
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
					label: 'Focus mode',
					id: FocusModeId,
					choices: [
						{ id: '0', label: 'Auto focus' },
						{ id: '1', label: 'Manual focus' },
						{ id: '2', label: 'Toggle' },
					],
					default: '0',
				},
			],
			callback: async ({ options }) => {
				const mode = getFocusMode(options)
				if (mode === 'toggle') {
					const current = await instance.sendInquiry(FocusModeInquiry)
					if (current === null) {
						instance.log('warn', 'Unable to read the current focus mode; toggle was not sent')
						return
					}
					await instance.setAutoFocusNative(current.mode !== 'auto')
				} else {
					await instance.setAutoFocusNative(mode === 'auto')
				}
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
				await instance.moveFocusNative(-1)
			},
		},
		[FocusActionId.StartFocusFarther]: {
			name: 'Focus Far',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.moveFocusNative(1)
			},
		},
		[FocusActionId.StopFocus]: {
			name: 'Focus Stop',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.moveFocusNative(0)
			},
		},
	}
}
