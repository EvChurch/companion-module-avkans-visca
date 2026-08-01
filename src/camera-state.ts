import type { Lv20nInquirySpec } from './camera/lv20n-inquiry.js'
import type { CameraSlot } from './config.js'
import type { Bytes } from './utils/byte.js'
import { prettyBytes } from './utils/pretty.js'
import {
	activeLv20nInquiryVariableValues,
	cameraVariableId,
	inquiryResultVariableId,
	inquiryVariableId,
	LastInquiryHexVariable,
	LastInquiryIdVariable,
	LastInquiryResultVariable,
} from './variables.js'

type VariableValues = Record<string, string | number>

export class CameraState {
	readonly #values = new Map<CameraSlot, VariableValues>()

	record(
		slot: CameraSlot,
		inquiry: Lv20nInquirySpec,
		result: string,
		response: Bytes,
		fields: VariableValues,
	): { active: VariableValues; scoped: VariableValues } {
		const active: VariableValues = {
			...Object.fromEntries(Object.entries(fields).map(([field, value]) => [inquiryVariableId(inquiry, field), value])),
			[inquiryVariableId(inquiry)]: result,
			[LastInquiryIdVariable]: inquiry.id,
			[LastInquiryResultVariable]: result,
			[LastInquiryHexVariable]: prettyBytes(response),
		}
		this.#values.set(slot, { ...(this.#values.get(slot) ?? {}), ...active })
		return {
			active,
			scoped: Object.fromEntries(Object.entries(active).map(([id, value]) => [cameraVariableId(slot, id), value])),
		}
	}

	clear(slot: CameraSlot): void {
		this.#values.delete(slot)
	}

	inquiryResult(slot: CameraSlot, id: string): string | undefined {
		const value = this.#values.get(slot)?.[inquiryResultVariableId(id)]
		return value === undefined ? undefined : String(value)
	}

	activeVariables(slot: CameraSlot | undefined): VariableValues {
		return activeLv20nInquiryVariableValues(slot === undefined ? undefined : this.#values.get(slot))
	}

	cameraVariables(slot: CameraSlot): VariableValues {
		return Object.fromEntries(
			Object.entries(this.activeVariables(slot)).map(([id, value]) => [cameraVariableId(slot, id), value]),
		)
	}
}
