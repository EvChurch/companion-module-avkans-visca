import type { CompanionActionEvent } from '@companion-module/base'
import type { ActionDefinitions } from './actionid.js'
import { WhiteBalance, type WhiteBalanceMode, WhiteBalanceOnePushTrigger } from '../camera/white-balance.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { optionNullConversions } from './option-conversion.js'

export enum WhiteBalanceActionId {
	SelectWhiteBalance = 'wb',
	WhiteBalanceOnePushTrigger = 'wbOPT',
}

export const WhiteBalanceModeId = 'val'

const [getWhiteBalanceMode] = optionNullConversions<WhiteBalanceMode, typeof WhiteBalanceModeId>(
	WhiteBalanceModeId,
	['automatic', 'onepush', 'atw', 'manual', 'color-temperature'],
	'automatic',
)

export function whiteBalanceActions(instance: AvkansLv20nInstance): ActionDefinitions<WhiteBalanceActionId> {
	return {
		[WhiteBalanceActionId.SelectWhiteBalance]: {
			name: 'White balance',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: WhiteBalanceModeId,
					choices: [
						{ id: 'automatic', label: 'Automatic' },
						{ id: 'onepush', label: 'One Push' },
						{ id: 'atw', label: 'Auto Tracking White Balance' },
						{ id: 'manual', label: 'Manual' },
						{ id: 'color-temperature', label: 'Color Temperature' },
					],
					default: 'automatic',
				},
			],
			callback: async ({ options }) => {
				const mode = getWhiteBalanceMode(options)
				await instance.sendCommandAndRefresh('white_balance', WhiteBalance, { mode })
			},
		},
		[WhiteBalanceActionId.WhiteBalanceOnePushTrigger]: {
			name: 'White balance one push trigger',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.sendCommandAndRefresh('white_balance', WhiteBalanceOnePushTrigger)
			},
		},
	}
}
