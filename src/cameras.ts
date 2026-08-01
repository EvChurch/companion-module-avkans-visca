import { InstanceStatus } from '@companion-module/base'
import { FocusStop } from './camera/focus.js'
import { PanTiltAction, PanTiltDirection } from './camera/pan-tilt.js'
import { ZoomStop } from './camera/zoom.js'
import { cameraRoster, type AvkansLv20nConfig, type CameraSlot, type CameraTarget } from './config.js'
import type { Bytes } from './utils/byte.js'
import {
	ModuleDefinedCommand,
	type Command,
	type CommandParameters,
	type CommandParamValues,
	type NoCommandParameters,
} from './visca/command.js'
import type { Answer, AnswerParameters, Inquiry } from './visca/inquiry.js'
import { VISCAPort, type PartialInstance } from './visca/port.js'

export type CameraPort = Pick<VISCAPort, 'open' | 'close' | 'sendCommand' | 'sendInquiry' | 'sendRawInquiry'>
export type CameraPortFactory = (instance: PartialInstance, mode: AvkansLv20nConfig['transportMode']) => CameraPort

interface CameraManagerHost extends PartialInstance {
	onStateChanged(): void
	onCameraStatusChanged(slot: CameraSlot, status: InstanceStatus): void
}

interface CameraSession {
	name: string
	host: string
	signature: string
	port: CameraPort
	status: InstanceStatus
}

const PanTiltStop = new ModuleDefinedCommand([
	0x81,
	0x01,
	0x06,
	0x01,
	0x0c,
	0x0c,
	...PanTiltDirection[PanTiltAction.Stop],
	0xff,
])

export class CameraManager {
	readonly #sessions = new Map<CameraSlot, CameraSession>()
	#activeSlot: CameraSlot | undefined
	readonly #host: CameraManagerHost
	readonly #portFactory: CameraPortFactory
	readonly #stopTimeoutMs: number
	#aggregateStatus: InstanceStatus | undefined

	constructor(
		host: CameraManagerHost,
		portFactory: CameraPortFactory = (instance, mode) => new VISCAPort(instance, mode),
		stopTimeoutMs = 500,
	) {
		this.#host = host
		this.#portFactory = portFactory
		this.#stopTimeoutMs = stopTimeoutMs
	}

	get activeSlot(): CameraSlot | undefined {
		return this.#activeSlot
	}

	configuredSlots(): CameraSlot[] {
		return [...this.#sessions.keys()].sort((a, b) => a - b)
	}

	has(slot: CameraSlot): boolean {
		return this.#sessions.has(slot)
	}

	name(slot: CameraSlot): string | undefined {
		return this.#sessions.get(slot)?.name
	}

	host(slot: CameraSlot): string | undefined {
		return this.#sessions.get(slot)?.host
	}

	status(slot: CameraSlot): InstanceStatus {
		return this.#sessions.get(slot)?.status ?? InstanceStatus.Disconnected
	}

	resolve(target: CameraTarget): CameraSlot | undefined {
		return target === 'active' ? this.#activeSlot : this.#sessions.has(target) ? target : undefined
	}

	reconcile(config: AvkansLv20nConfig): void {
		const roster = cameraRoster(config)
		const wanted = new Set(roster.map((camera) => camera.slot))
		for (const [slot, session] of this.#sessions) {
			if (!wanted.has(slot)) {
				session.port.close('Camera slot removed', InstanceStatus.Disconnected)
				this.#sessions.delete(slot)
			}
		}

		for (const camera of roster) {
			const signature = `${camera.host}:${config.port}:${config.transportMode}`
			const existing = this.#sessions.get(camera.slot)
			if (existing?.signature === signature) {
				existing.name = camera.name
				continue
			}
			existing?.port.close('Camera configuration changed', InstanceStatus.Connecting)
			const session: CameraSession = {
				name: camera.name,
				host: camera.host,
				signature,
				status: InstanceStatus.Connecting,
				port: undefined as unknown as CameraPort,
			}
			const adapter: PartialInstance = {
				get debugLogging() {
					return host.debugLogging
				},
				log: (level, message) => host.log(level, `[Camera ${camera.slot}: ${session.name}] ${message}`),
				updateStatus: (status) => {
					session.status = status
					this.#updateAggregateStatus()
					this.#host.onCameraStatusChanged(camera.slot, status)
				},
			}
			const host = this.#host
			session.port = this.#portFactory(adapter, config.transportMode)
			this.#sessions.set(camera.slot, session)
			session.port.open(camera.host, config.port)
		}

		if (this.#activeSlot === undefined || !this.#sessions.has(this.#activeSlot)) {
			this.#activeSlot = this.configuredSlots()[0]
		}
		this.#updateAggregateStatus()
		this.#host.onStateChanged()
	}

	async select(slot: CameraSlot): Promise<boolean> {
		if (!this.#sessions.has(slot)) return false
		if (slot === this.#activeSlot) return true
		const previous = this.#activeSlot
		if (previous !== undefined) await this.#stopMovement(previous)
		this.#activeSlot = slot
		this.#host.onStateChanged()
		return true
	}

	async selectNext(): Promise<boolean> {
		return this.#selectOffset(1)
	}

	async selectPrevious(): Promise<boolean> {
		return this.#selectOffset(-1)
	}

	async #selectOffset(offset: number): Promise<boolean> {
		const slots = this.configuredSlots()
		if (slots.length === 0) return false
		const current = this.#activeSlot === undefined ? -1 : slots.indexOf(this.#activeSlot)
		const next = current === -1 ? 0 : (current + offset + slots.length) % slots.length
		return this.select(slots[next])
	}

	async #stopMovement(slot: CameraSlot): Promise<void> {
		const session = this.#sessions.get(slot)
		if (!session) return
		for (const command of [PanTiltStop, ZoomStop, FocusStop]) {
			let timer: NodeJS.Timeout | undefined
			try {
				const result = await Promise.race([
					session.port.sendCommand(command),
					new Promise<never>((_, reject) => {
						timer = setTimeout(() => reject(new Error(`Timed out stopping Camera ${slot}`)), this.#stopTimeoutMs)
					}),
				])
				if (result instanceof Error) {
					this.#host.log('warn', `Camera ${slot} movement stop failed: ${result.message}`)
				}
			} catch (error) {
				this.#host.log('warn', error instanceof Error ? error.message : String(error))
			} finally {
				if (timer !== undefined) clearTimeout(timer)
			}
		}
	}

	async sendCommand<CmdParameters extends CommandParameters>(
		slot: CameraSlot,
		command: Command<CmdParameters>,
		...paramValues: CmdParameters extends NoCommandParameters
			? [CommandParamValues<CmdParameters>?]
			: [CommandParamValues<CmdParameters>]
	): Promise<void | Error> {
		const session = this.#sessions.get(slot)
		return session ? session.port.sendCommand(command, ...paramValues) : new Error(`Camera ${slot} is not configured`)
	}

	async sendInquiry<Parameters extends AnswerParameters>(
		slot: CameraSlot,
		inquiry: Inquiry<Parameters>,
	): Promise<Answer<Parameters> | Error> {
		const session = this.#sessions.get(slot)
		return session ? session.port.sendInquiry(inquiry) : new Error(`Camera ${slot} is not configured`)
	}

	async sendRawInquiry(slot: CameraSlot, bytes: Bytes): Promise<Bytes | Error> {
		const session = this.#sessions.get(slot)
		return session ? session.port.sendRawInquiry(bytes) : new Error(`Camera ${slot} is not configured`)
	}

	close(): void {
		for (const session of this.#sessions.values()) {
			session.port.close('Instance is being destroyed', InstanceStatus.Disconnected)
		}
		this.#sessions.clear()
		this.#activeSlot = undefined
		this.#updateAggregateStatus()
	}

	#updateAggregateStatus(): void {
		const statuses = [...this.#sessions.values()].map((session) => session.status)
		const aggregate =
			statuses.length === 0
				? InstanceStatus.Disconnected
				: statuses.includes(InstanceStatus.Ok)
					? InstanceStatus.Ok
					: statuses.includes(InstanceStatus.Connecting)
						? InstanceStatus.Connecting
						: InstanceStatus.ConnectionFailure
		if (aggregate !== this.#aggregateStatus) {
			this.#aggregateStatus = aggregate
			this.#host.updateStatus(aggregate)
		}
	}
}
