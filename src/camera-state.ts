import type { Lv20nInquirySpec } from './camera/lv20n-inquiry.js'
import type { CameraSlot } from './config.js'
import { cameraStateValueDefinitions, inquiryStateValues } from './camera-state-values.js'
import { activeCameraStateVariableValues, activeCameraVariableId, cameraVariableId } from './variables.js'

type VariableValues = Record<string, string | number>

export class CameraState {
	readonly #values = new Map<CameraSlot, VariableValues>()

	record(
		slot: CameraSlot,
		inquiry: Lv20nInquirySpec,
		fields: VariableValues,
	): { active: VariableValues; scoped: VariableValues } | undefined {
		const state = inquiryStateValues(inquiry, fields)
		const previous = this.#values.get(slot) ?? {}
		const changes = Object.fromEntries(Object.entries(state).filter(([id, value]) => previous[id] !== value))
		if (Object.keys(changes).length === 0) return undefined
		this.#values.set(slot, { ...previous, ...changes })
		return {
			active: Object.fromEntries(Object.entries(changes).map(([id, value]) => [activeCameraVariableId(id), value])),
			scoped: Object.fromEntries(Object.entries(changes).map(([id, value]) => [cameraVariableId(slot, id), value])),
		}
	}

	clear(slot: CameraSlot): void {
		this.#values.delete(slot)
	}

	value(slot: CameraSlot, id: string): string | number | undefined {
		return this.#values.get(slot)?.[id]
	}

	activeVariables(slot: CameraSlot | undefined): VariableValues {
		return activeCameraStateVariableValues(slot === undefined ? undefined : this.#values.get(slot))
	}

	cameraVariables(slot: CameraSlot): VariableValues {
		const values = this.#values.get(slot)
		return Object.fromEntries(
			cameraStateValueDefinitions.map((definition) => [
				cameraVariableId(slot, definition.id),
				values?.[definition.id] ?? '',
			]),
		)
	}
}
