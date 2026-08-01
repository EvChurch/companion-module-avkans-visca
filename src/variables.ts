import type { CompanionVariableDefinition } from '@companion-module/base'
import { cameraStateValueDefinitions } from './camera-state-values.js'
import { CameraSlots, type CameraSlot } from './config.js'

export function activeCameraVariableId(id: string): string {
	return `camera_active_${id}`
}

export function cameraVariableId(slot: CameraSlot, id: string): string {
	return `camera_${slot}_${id}`
}

export function activeCameraStateVariableValues(
	values: Record<string, string | number> | undefined,
): Record<string, string | number> {
	return Object.fromEntries(
		cameraStateValueDefinitions.map((definition) => [
			activeCameraVariableId(definition.id),
			values?.[definition.id] ?? '',
		]),
	)
}

export function getLv20nVariableDefinitions(): CompanionVariableDefinition[] {
	const definitions: CompanionVariableDefinition[] = [
		{ variableId: activeCameraVariableId('slot'), name: 'Active camera: Slot' },
		{ variableId: activeCameraVariableId('name'), name: 'Active camera: Name' },
		{ variableId: activeCameraVariableId('ip'), name: 'Active camera: IP address' },
		{ variableId: activeCameraVariableId('status'), name: 'Active camera: Connection status' },
		...cameraStateValueDefinitions.map((definition) => ({
			variableId: activeCameraVariableId(definition.id),
			name: `Active camera: ${definition.label}`,
		})),
	]

	for (const slot of CameraSlots) {
		const prefix = `Camera ${slot}`
		definitions.push(
			{ variableId: cameraVariableId(slot, 'name'), name: `${prefix}: Name` },
			{ variableId: cameraVariableId(slot, 'ip'), name: `${prefix}: IP address` },
			{ variableId: cameraVariableId(slot, 'status'), name: `${prefix}: Connection status` },
			{ variableId: cameraVariableId(slot, 'active'), name: `${prefix}: Active` },
		)
		definitions.push(
			...cameraStateValueDefinitions.map((definition) => ({
				variableId: cameraVariableId(slot, definition.id),
				name: `${prefix}: ${definition.label}`,
			})),
		)
	}

	return definitions
}
