import { AsyncLocalStorage } from 'node:async_hooks'
import type {
	CompanionActionDefinition,
	CompanionActionDefinitions,
	CompanionActionEvent,
	CompanionOptionValues,
} from '@companion-module/base'
import type { CameraSlot, CameraTarget, ConfiguredCamera } from '../config.js'

export const CameraTargetOptionId = 'camera'

const cameraSlotContext = new AsyncLocalStorage<CameraSlot>()

export function currentCameraSlot(): CameraSlot | undefined {
	return cameraSlotContext.getStore()
}

export function cameraTargetChoices(
	roster: ConfiguredCamera[],
	includeActive = true,
): Array<{ id: string | number; label: string }> {
	return [
		...(includeActive ? [{ id: 'active', label: 'Active Camera' }] : []),
		...roster.map(({ slot, name }) => ({ id: slot, label: name })),
	]
}

function targetFromOptions(options: CompanionOptionValues): CameraTarget {
	const target = Number(options[CameraTargetOptionId])
	return target === 1 || target === 2 || target === 3 || target === 4 ? target : 'active'
}

export function targetCameraActions(
	actions: CompanionActionDefinitions,
	roster: ConfiguredCamera[],
	resolve: (target: CameraTarget) => CameraSlot | undefined,
): CompanionActionDefinitions {
	const choices = cameraTargetChoices(roster)
	const targetedActions: CompanionActionDefinitions = {}
	for (const [id, definition] of Object.entries(actions)) {
		if (definition !== undefined) {
			const callback = definition.callback
			const learn = definition.learn
			const targeted: CompanionActionDefinition = {
				...definition,
				options: [
					{
						type: 'dropdown',
						id: CameraTargetOptionId,
						label: 'Camera',
						choices,
						default: 'active',
					},
					...definition.options,
				],
				callback: async (event, context) => {
					const target = targetFromOptions(event.options)
					const slot = resolve(target) ?? (target === 'active' ? undefined : target)
					return slot === undefined
						? callback(event, context)
						: cameraSlotContext.run(slot, async () => callback(event, context))
				},
			}
			if (learn) {
				targeted.learn = async (event: CompanionActionEvent, context) => {
					const target = targetFromOptions(event.options)
					const slot = resolve(target) ?? (target === 'active' ? undefined : target)
					return slot === undefined
						? learn(event, context)
						: cameraSlotContext.run(slot, async () => learn(event, context))
				}
			}
			targetedActions[id] = targeted
		}
	}
	return targetedActions
}
