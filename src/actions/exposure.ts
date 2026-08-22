import type { CompanionActionEvent, CompanionOptionValues } from '@companion-module/base'
import type { ActionDefinitions } from './actionid.js'
import {
	ExposureMode,
	ExposureModeInquiry,
	IrisDown,
	IrisSet,
	type IrisSetting,
	IrisUp,
	ShutterDown,
	ShutterSet,
	type ShutterSetting,
	ShutterUp,
} from '../camera/exposure.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { optionConversions } from './option-conversion.js'
import { twoDigitHex } from '../utils/two-digit-hex.js'

export enum ExposureActionId {
	SelectExposureMode = 'expM',
	IrisUp = 'irisU',
	IrisDown = 'irisD',
	SetIris = 'irisS',
	ShutterUp = 'shutU',
	ShutterDown = 'shutD',
	SetShutter = 'shutS',
}

export const ExposureModeId = 'val'

type ExposureModeSelection = ExposureMode | 'toggle'

const [getExposureMode, exposureModeToOption] = optionConversions<ExposureModeSelection, typeof ExposureModeId>(
	ExposureModeId,
	[
		['0', 'full-auto'],
		['1', 'manual'],
		['2', 'shutter-priority'],
		['3', 'iris-priority'],
		['5', 'toggle'],
	],
	'full-auto',
	'0',
	String,
)

const IrisSettingId = 'val'

const [getIrisSetting] = optionConversions<IrisSetting, typeof IrisSettingId>(
	IrisSettingId,
	[
		['0D', 'F1.6'],
		['0C', 'F2.0'],
		['0B', 'F2.4'],
		['0A', 'F2.8'],
		['09', 'F3.4'],
		['08', 'F4.0'],
		['07', 'F4.8'],
		['06', 'F5.6'],
		['05', 'F6.8'],
		['04', 'F8.0'],
		['03', 'F9.6'],
		['02', 'F11.0'],
		['01', 'F14'],
		['00', 'CLOSED'],
	],
	'CLOSED',
	'00',
	String,
)

const ShutterSettingId = 'val'

const DefaultShutterSetting = 6

function getShutterSetting(options: CompanionOptionValues): ShutterSetting {
	let setting = parseInt(String(options[ShutterSettingId]), 16)
	if (setting < 0x06) {
		setting = 0x06
	} else if (0x15 < setting) {
		setting = 0x15
	}

	switch (setting) {
		case 0x15:
			return '1/10000'
		case 0x14:
			return '1/6000'
		case 0x13:
			return '1/4000'
		case 0x12:
			return '1/3000'
		case 0x11:
			return '1/2000'
		case 0x10:
			return '1/1500'
		case 0x0f:
			return '1/1000'
		case 0x0e:
			return '1/725'
		case 0x0d:
			return '1/500'
		case 0x0c:
			return '1/350'
		case 0x0b:
			return '1/250'
		case 0x0a:
			return '1/180'
		case 0x09:
			return '1/120'
		case 0x08:
			return '1/100'
		case 0x07:
			return '1/90'
		default:
		case 0x06:
			return '1/60'
	}
}

export function exposureActions(instance: AvkansLv20nInstance): ActionDefinitions<ExposureActionId> {
	return {
		[ExposureActionId.SelectExposureMode]: {
			name: 'Exposure Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Mode setting',
					id: ExposureModeId,
					choices: [
						{ id: '0', label: 'Full Auto' },
						{ id: '1', label: 'Manual' },
						{ id: '2', label: 'Shutter Pri' },
						{ id: '3', label: 'Iris Pri' },
						{ id: '5', label: 'Toggle' },
					],
					default: '0',
				},
			],
			callback: async ({ options }) => {
				const selection = getExposureMode(options)
				let mode: ExposureMode
				if (selection === 'toggle') {
					const current = await instance.sendInquiry(ExposureModeInquiry)
					if (current === null) {
						instance.log('warn', 'Unable to read the current exposure mode; toggle was not sent')
						return
					}
					mode = current.mode === 'full-auto' ? 'manual' : 'full-auto'
				} else {
					mode = selection
				}
				await instance.sendCommandAndRefresh('exposure_mode', ExposureMode, { mode })
			},
			learn: async (_event: CompanionActionEvent) => {
				const opts = await instance.sendInquiry(ExposureModeInquiry)
				if (opts === null) {
					return undefined
				}
				return { [ExposureModeId]: exposureModeToOption(opts.mode) }
			},
		},
		[ExposureActionId.IrisUp]: {
			name: 'Iris Up',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.sendCommandAndRefresh('iris', IrisUp)
			},
		},
		[ExposureActionId.IrisDown]: {
			name: 'Iris Down',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.sendCommandAndRefresh('iris', IrisDown)
			},
		},
		[ExposureActionId.SetIris]: {
			name: 'Set Iris',
			options: [
				{
					type: 'dropdown',
					label: 'Iris setting',
					id: IrisSettingId,
					choices: [
						{ id: '0D', label: 'F1.6' },
						{ id: '0C', label: 'F2.0' },
						{ id: '0B', label: 'F2.4' },
						{ id: '0A', label: 'F2.8' },
						{ id: '09', label: 'F3.4' },
						{ id: '08', label: 'F4.0' },
						{ id: '07', label: 'F4.8' },
						{ id: '06', label: 'F5.6' },
						{ id: '05', label: 'F6.8' },
						{ id: '04', label: 'F8.0' },
						{ id: '03', label: 'F9.6' },
						{ id: '02', label: 'F11.0' },
						{ id: '01', label: 'F14' },
						{ id: '00', label: 'CLOSED' },
					],
					default: '08',
				},
			],
			callback: async ({ options }) => {
				const setting = getIrisSetting(options)
				await instance.sendCommandAndRefresh('iris', IrisSet, { setting })
			},
		},
		[ExposureActionId.ShutterUp]: {
			name: 'Shutter Up',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.sendCommandAndRefresh('shutter', ShutterUp)
			},
		},
		[ExposureActionId.ShutterDown]: {
			name: 'Shutter Down',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				await instance.sendCommandAndRefresh('shutter', ShutterDown)
			},
		},
		[ExposureActionId.SetShutter]: {
			name: 'Set Shutter',
			options: [
				{
					type: 'dropdown',
					label: 'Shutter setting',
					id: ShutterSettingId,
					choices: [
						{ id: '15', label: '1/10000' },
						{ id: '14', label: '1/6000' },
						{ id: '13', label: '1/4000' },
						{ id: '12', label: '1/3000' },
						{ id: '11', label: '1/2000' },
						{ id: '10', label: '1/1500' },
						{ id: '0F', label: '1/1000' },
						{ id: '0E', label: '1/725' },
						{ id: '0D', label: '1/500' },
						{ id: '0C', label: '1/350' },
						{ id: '0B', label: '1/250' },
						{ id: '0A', label: '1/180' },
						{ id: '09', label: '1/120' },
						{ id: '08', label: '1/100' },
						{ id: '07', label: '1/90' },
						{ id: '06', label: '1/60' },
					],
					default: twoDigitHex(DefaultShutterSetting),
				},
			],
			callback: async ({ options }) => {
				const setting = getShutterSetting(options)
				await instance.sendCommandAndRefresh('shutter', ShutterSet, { setting })
			},
		},
	}
}
