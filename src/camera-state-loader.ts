import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import { decodeLv20nInquiry, type Lv20nInquirySpec } from './camera/lv20n-inquiry.js'
import type { CameraSlot } from './config.js'
import type { Bytes } from './utils/byte.js'

const unsupportedAutomaticInquiryIds = new Set(['ptzfi_block', 'white_balance_block', 'heartbeat'])

export const automaticallyRefreshedInquiries = lv20nInquiryCatalog.filter(
	(inquiry) => !unsupportedAutomaticInquiryIds.has(inquiry.id),
)

export class CameraStateRefreshCoordinator {
	readonly #versions = new Map<CameraSlot, number>()
	readonly #automaticVersions = new Map<CameraSlot, number>()

	version(slot: CameraSlot): number {
		return this.#versions.get(slot) ?? 0
	}

	advance(slot: CameraSlot): number {
		const version = this.version(slot) + 1
		this.#versions.set(slot, version)
		return version
	}

	beginAutomatic(slot: CameraSlot): number | undefined {
		const version = this.version(slot)
		if (this.#automaticVersions.get(slot) === version) return undefined
		this.#automaticVersions.set(slot, version)
		return version
	}

	finishAutomatic(slot: CameraSlot, version: number): void {
		if (this.#automaticVersions.get(slot) === version) this.#automaticVersions.delete(slot)
	}

	isCurrent(slot: CameraSlot, version: number): boolean {
		return this.version(slot) === version
	}
}

export async function loadCameraState(
	slot: CameraSlot,
	inquiries: readonly Lv20nInquirySpec[],
	send: (slot: CameraSlot, bytes: Bytes) => Promise<Bytes | Error>,
	record: (slot: CameraSlot, inquiry: Lv20nInquirySpec, fields: Record<string, string | number>) => void,
	isCurrent: () => boolean = () => true,
): Promise<void> {
	// LV20N firmware reports one VISCA socket, so state queries must remain sequential per camera.
	for (const inquiry of inquiries) {
		if (!isCurrent()) return
		let response: Bytes | Error
		try {
			response = await send(slot, inquiry.bytes)
		} catch {
			continue
		}
		if (response instanceof Error || !isCurrent()) continue
		try {
			record(slot, inquiry, decodeLv20nInquiry(inquiry, response))
		} catch {
			// An individual unsupported response must not prevent the remaining state from loading.
		}
	}
}
