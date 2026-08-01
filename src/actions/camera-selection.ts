import type { CompanionActionDefinitions } from '@companion-module/base'
import type { CameraSlot, ConfiguredCamera } from '../config.js'
import { cameraTargetChoices } from './camera-target.js'

export enum CameraSelectionActionId {
	Select = 'select_camera',
	Next = 'select_next_camera',
	Previous = 'select_previous_camera',
}

const SelectedCameraOptionId = 'selected_camera'

interface CameraSelectionHost {
	selectCamera(slot: CameraSlot): Promise<boolean>
	selectNextCamera(): Promise<boolean>
	selectPreviousCamera(): Promise<boolean>
}

export function cameraSelectionActions(
	instance: CameraSelectionHost,
	roster: ConfiguredCamera[],
): CompanionActionDefinitions {
	const actions: CompanionActionDefinitions = {
		[CameraSelectionActionId.Next]: {
			name: 'Select next camera',
			description: 'Stop movement on the current camera and activate the next configured camera.',
			options: [],
			callback: async () => void (await instance.selectNextCamera()),
		},
		[CameraSelectionActionId.Previous]: {
			name: 'Select previous camera',
			description: 'Stop movement on the current camera and activate the previous configured camera.',
			options: [],
			callback: async () => void (await instance.selectPreviousCamera()),
		},
	}
	if (roster.length > 0) {
		actions[CameraSelectionActionId.Select] = {
			name: 'Select active camera',
			description: 'Stop movement on the current camera and activate the selected camera.',
			options: [
				{
					type: 'dropdown',
					id: SelectedCameraOptionId,
					label: 'Camera',
					choices: cameraTargetChoices(roster, false),
					default: roster[0]?.slot ?? 1,
				},
			],
			callback: async ({ options }) => {
				const slot = Number(options[SelectedCameraOptionId])
				if (slot === 1 || slot === 2 || slot === 3 || slot === 4) await instance.selectCamera(slot)
			},
		}
	}
	return actions
}
