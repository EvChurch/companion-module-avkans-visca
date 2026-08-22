import type {
	CompanionActionDefinitions,
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
} from '@companion-module/base'
import type { AvkansLv20nInstance } from '../instance.js'
import type { TrackingField } from '../tracking.js'

export type TrackingActionId = `tracking_set_${string}`
const ValueOptionId = 'value'

function valueOption(field: TrackingField): CompanionInputFieldNumber | CompanionInputFieldDropdown {
	if (field.component === 'Slider') {
		return {
			type: 'number',
			id: ValueOptionId,
			label: field.label,
			default: Number(field.default),
			min: field.min ?? 0,
			max: field.max ?? 100,
			step: field.step ?? 1,
		}
	}
	const choices =
		field.component === 'Switch'
			? [
					{ id: 0, label: 'Off' },
					{ id: 1, label: 'On' },
				]
			: (field.choices ?? [])
	return {
		type: 'dropdown',
		id: ValueOptionId,
		label: field.label,
		choices,
		default: choices.some(({ id }) => String(id) === String(field.default)) ? field.default : (choices[0]?.id ?? ''),
	}
}

export function trackingActions(
	instance: AvkansLv20nInstance,
	fields: readonly TrackingField[],
): CompanionActionDefinitions {
	return Object.fromEntries(
		fields.map((field) => [
			`tracking_set_${field.id}` satisfies TrackingActionId,
			{
				name: `Tracking: ${field.label}`,
				options: [valueOption(field)],
				callback: async ({ options }: { options: Record<string, unknown> }) =>
					instance.setTrackingValue(field, options[ValueOptionId] as string | number),
			},
		]),
	)
}
