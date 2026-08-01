import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import { decodeLv20nInquiry, type Lv20nInquirySpec } from './camera/lv20n-inquiry.js'
import type { CameraSlot } from './config.js'
import type { Bytes } from './utils/byte.js'

const unsupportedAutomaticInquiryIds = new Set(['ptzfi_block', 'white_balance_block', 'heartbeat'])

export const automaticallyRefreshedInquiries = lv20nInquiryCatalog.filter(
	(inquiry) => !unsupportedAutomaticInquiryIds.has(inquiry.id),
)
const automaticallyRefreshedInquiryById = new Map<string, Lv20nInquirySpec>(
	automaticallyRefreshedInquiries.map((inquiry) => [inquiry.id, inquiry]),
)

const inquiryIdsByCommandGroup: Readonly<Record<string, readonly string[]>> = {
	power: ['power'],
	zoom: ['zoom_position'],
	digital_zoom: ['digital_zoom_limit', 'digital_zoom_mode'],
	focus: ['focus_mode', 'focus_position'],
	zoom_focus: ['zoom_position', 'focus_mode', 'focus_position'],
	white_balance: ['white_balance_mode', 'manual_red_gain', 'manual_blue_gain'],
	exposure_mode: ['exposure_mode', 'shutter_position', 'iris_position', 'gain_position'],
	shutter: ['shutter_position'],
	iris: ['iris_position'],
	gain: ['gain_position'],
	bright: ['bright_position'],
	exposure_compensation: ['exposure_compensation_mode', 'exposure_compensation_position'],
	backlight: ['backlight_mode'],
	memory: ['pan_tilt_position', 'zoom_position', 'focus_position'],
	pan_tilt: ['pan_tilt_position'],
	apply_ip: ['dhcp', 'ip_address', 'ip_mask', 'ip_gateway', 'ip_info'],
}

export function inquiriesForCommandGroup(groupId: string): readonly Lv20nInquirySpec[] {
	if (groupId === 'factory_reset') return automaticallyRefreshedInquiries
	const inquiryIds = inquiryIdsByCommandGroup[groupId] ?? [groupId]
	return inquiryIds.flatMap((id) => automaticallyRefreshedInquiryById.get(id) ?? [])
}

export class CameraStatePoller {
	#timer: NodeJS.Timeout | undefined
	#active = false

	constructor(
		readonly refresh: () => Promise<void>,
		readonly intervalMs = 30_000,
	) {}

	start(): void {
		if (this.#active) return
		this.#active = true
		this.#schedule()
	}

	stop(): void {
		this.#active = false
		if (this.#timer !== undefined) clearTimeout(this.#timer)
		this.#timer = undefined
	}

	#schedule(): void {
		this.#timer = setTimeout(() => void this.#run(), this.intervalMs)
	}

	async #run(): Promise<void> {
		this.#timer = undefined
		try {
			await this.refresh()
		} catch {
			// A failed cycle must not stop future camera-state refreshes.
		} finally {
			if (this.#active) this.#schedule()
		}
	}
}

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
