import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { getActions } from './actions/actions.js'
import {
	type RawConfig,
	getConfigFields,
	noCameraConfig,
	type AvkansLv20nConfig,
	type CameraSlot,
	type CameraTarget,
	cameraRoster,
	cameraSlotsWithChangedHosts,
	validateConfig,
} from './config.js'
import { getPresets } from './presets.js'
import { repr } from './utils/repr.js'
import type { Command, CommandParameters, CommandParamValues, NoCommandParameters } from './visca/command.js'
import type { Answer, AnswerParameters, Inquiry } from './visca/inquiry.js'
import type { Bytes } from './utils/byte.js'
import { cameraVariableId, getLv20nVariableDefinitions } from './variables.js'
import {
	ActiveCameraFeedbackId,
	CameraStateFeedbackIds,
	cameraStateFeedbackIdsForInquiry,
	CameraConnectionFeedbackId,
	getLv20nFeedbacks,
} from './feedbacks.js'
import { CameraManager } from './cameras.js'
import { currentCameraSlot } from './actions/camera-target.js'
import type { Lv20nInquirySpec } from './camera/lv20n-inquiry.js'
import { CameraState } from './camera-state.js'
import {
	automaticallyRefreshedInquiries,
	CameraStateRefreshCoordinator,
	loadCameraState,
} from './camera-state-loader.js'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'

export class AvkansLv20nInstance extends InstanceBase<RawConfig> {
	/** Configuration dictating the behavior of this instance. */
	#config: AvkansLv20nConfig = noCameraConfig()
	get config(): AvkansLv20nConfig {
		return this.#config
	}

	/** Whether debug logging is enabled on this instance or not. */
	get debugLogging(): boolean {
		return this.#config.debugLogging
	}

	readonly #cameras = new CameraManager(this)
	readonly #cameraState = new CameraState()
	readonly #stateRefreshQueues = new Map<CameraSlot, Promise<void>>()
	readonly #stateRefreshes = new CameraStateRefreshCoordinator()
	#destroyed = false

	recordLv20nInquiryResult(inquiry: Lv20nInquirySpec, fields: Record<string, string | number>): void {
		const slot = this.#targetSlot()
		if (slot === undefined) return
		this.#recordCameraState(slot, inquiry, fields)
	}

	#recordCameraState(slot: CameraSlot, inquiry: Lv20nInquirySpec, fields: Record<string, string | number>): void {
		const update = this.#cameraState.record(slot, inquiry, fields)
		if (update === undefined) return
		const values = { ...update.scoped }
		if (slot === this.#cameras.activeSlot) {
			Object.assign(values, update.active)
		}
		this.setVariableValues(values)
		const feedbackIds = cameraStateFeedbackIdsForInquiry(inquiry.id)
		if (feedbackIds.length > 0) this.checkFeedbacks(...feedbackIds)
	}

	cameraStateValue(id: string, target: CameraTarget = 'active'): string | undefined {
		const slot = this.resolveCameraTarget(target)
		const value = slot === undefined ? undefined : this.#cameraState.value(slot, id)
		return value === undefined ? undefined : String(value)
	}

	async refreshCameraState(target: CameraTarget, inquiryId?: string): Promise<void> {
		const slot = this.resolveCameraTarget(target)
		if (slot === undefined) return
		const inquiries =
			inquiryId === undefined
				? automaticallyRefreshedInquiries
				: lv20nInquiryCatalog.filter((inquiry) => inquiry.id === inquiryId)
		await this.#queueCameraStateRefresh(slot, inquiries)
	}

	resolveCameraTarget(target: CameraTarget): CameraSlot | undefined {
		return this.#cameras.resolve(target)
	}

	isCameraActive(target: CameraTarget): boolean {
		const slot = this.resolveCameraTarget(target)
		return slot !== undefined && slot === this.#cameras.activeSlot
	}

	cameraIsConnected(target: CameraTarget): boolean {
		const slot = this.resolveCameraTarget(target)
		return slot !== undefined && this.#cameras.status(slot) === InstanceStatus.Ok
	}

	async selectCamera(slot: CameraSlot): Promise<boolean> {
		return this.#cameras.select(slot)
	}

	async selectNextCamera(): Promise<boolean> {
		return this.#cameras.selectNext()
	}

	async selectPreviousCamera(): Promise<boolean> {
		return this.#cameras.selectPrevious()
	}

	onStateChanged(): void {
		this.#refreshCameraVariables()
		this.checkFeedbacks(ActiveCameraFeedbackId, CameraConnectionFeedbackId, ...CameraStateFeedbackIds)
	}

	onCameraStatusChanged(slot: CameraSlot, status: InstanceStatus): void {
		this.onStateChanged()
		if (status !== InstanceStatus.Ok) return

		const version = this.#stateRefreshes.beginAutomatic(slot)
		if (version === undefined) return

		// A targeted feedback refresh may already be queued while the camera connects.
		// Queue the full load behind it, but suppress reconnect loops for this same host.
		const refresh = this.#queueCameraStateRefresh(slot, automaticallyRefreshedInquiries)
		void refresh.finally(() => this.#stateRefreshes.finishAutomatic(slot, version))
	}

	#targetSlot(): CameraSlot | undefined {
		return currentCameraSlot() ?? this.#cameras.activeSlot
	}

	/**
	 * Send the given command to the camera, filling in any parameters from the
	 * specified options.  The options must be compatible with the command's
	 * parameters.
	 *
	 * @param command
	 *    The command to send.
	 * @param paramValues
	 *    A parameter values object compatible with this command's parameters
	 *    and their types.  (This can be omitted if the command lacks
	 *    parameters.)
	 */
	sendCommand<CmdParameters extends CommandParameters>(
		command: Command<CmdParameters>,
		...paramValues: CmdParameters extends NoCommandParameters
			? [CommandParamValues<CmdParameters>?]
			: [CommandParamValues<CmdParameters>]
	): void {
		// The selected port waits for its connection before sending.
		const slot = this.#targetSlot()
		if (slot === undefined) {
			this.log('warn', 'No camera is configured for this action')
			return
		}
		this.#cameras.sendCommand(slot, command, ...paramValues).then(
			(result: void | Error) => {
				if (typeof result === 'undefined') {
					return
				}

				this.log('error', `Error processing command: ${result.message}`)
			},
			(reason: Error) => {
				// Swallow the error so that execution gracefully unwinds.
				this.log('error', `Unhandled command rejection was suppressed: ${reason}`)
				return
			},
		)
	}

	/**
	 * Send the given inquiry to the camera.
	 *
	 * @param inquiry
	 *    The inquiry to send.
	 * @returns
	 *    A promise that resolves after the response to `inquiry` (which may be
	 *    an error response) has been processed.  If `inquiry`'s response was an
	 *    an error not implicating overall connection stability, the promise
	 *    resolves null.  Otherwise it resolves an object whose properties are
	 *    choices corresponding to the parameters in the response.
	 */
	async sendInquiry<Parameters extends AnswerParameters>(
		inquiry: Inquiry<Parameters>,
	): Promise<Answer<Parameters> | null> {
		// The selected port waits for its connection before sending.
		const slot = this.#targetSlot()
		if (slot === undefined) return null
		return this.#cameras.sendInquiry(slot, inquiry).then(
			(result: Answer<Parameters> | Error) => {
				if (result instanceof Error) {
					this.log('error', `Error processing inquiry: ${result.message}`)
					return null
				}

				return result
			},
			(reason: Error) => {
				// Swallow the error so that execution gracefully unwinds.
				this.log('error', `Unhandled inquiry rejection was suppressed: ${reason}`)
				return null
			},
		)
	}

	/** Send an LV20N inquiry whose response is decoded by the command catalog. */
	async sendRawInquiry(inquiryBytes: Bytes): Promise<Bytes | null> {
		const slot = this.#targetSlot()
		if (slot === undefined) return null
		return this.#cameras.sendRawInquiry(slot, inquiryBytes).then(
			(result: Bytes | Error) => {
				if (result instanceof Error) {
					this.log('error', `Error processing raw inquiry: ${result.message}`)
					return null
				}
				return result
			},
			(reason: Error) => {
				this.log('error', `Unhandled raw inquiry rejection was suppressed: ${reason}`)
				return null
			},
		)
	}

	/**
	 * The speed to be passed in the pan/tilt speed parameters of Pan Tilt Drive
	 * VISCA commands.  Ranges between 0x01 (low speed) and 0x18 (high speed).
	 * However, as 0x15-0x18 are valid only for panning, tilt speed is capped at
	 * 0x14.
	 */
	#speed = 0x0c

	panTiltSpeed(): { panSpeed: number; tiltSpeed: number } {
		return {
			panSpeed: this.#speed,
			tiltSpeed: Math.min(this.#speed, 0x14),
		}
	}

	setPanTiltSpeed(speed: number): void {
		if (0x01 <= speed && speed <= 0x18) {
			this.#speed = speed
		} else {
			this.log('debug', `speed ${speed} unexpectedly not in range [0x01, 0x18]`)
			this.#speed = 0x0c
		}
	}

	increasePanTiltSpeed(): void {
		if (this.#speed < 0x18) this.#speed++
	}

	decreasePanTiltSpeed(): void {
		if (this.#speed > 0x01) this.#speed--
	}

	override getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	override async destroy(): Promise<void> {
		this.log('info', `destroying module: ${this.id}`)
		this.#destroyed = true
		for (const slot of [1, 2, 3, 4] as const) this.#stateRefreshes.advance(slot)
		this.#cameras.close()
	}

	override async init(config: RawConfig): Promise<void> {
		this.#logConfig(config, 'init()')

		return this.configUpdated(config)
	}

	override async configUpdated(config: RawConfig): Promise<void> {
		this.#logConfig(config, 'configUpdated()')

		const oldConfig = this.#config
		this.#config = validateConfig(config)
		for (const slot of cameraSlotsWithChangedHosts(oldConfig, this.#config)) {
			this.#cameraState.clear(slot)
			this.#stateRefreshes.advance(slot)
		}
		this.setActionDefinitions(getActions(this))
		this.setPresetDefinitions(getPresets())
		this.setVariableDefinitions(getLv20nVariableDefinitions())
		this.setFeedbackDefinitions(getLv20nFeedbacks(this, cameraRoster(this.#config)))
		this.#cameras.reconcile(this.#config)
	}

	#refreshCameraVariables(): void {
		const active = this.#cameras.activeSlot
		const values: Record<string, string | number | boolean> = this.#cameraState.activeVariables(active)
		for (const slot of [1, 2, 3, 4] as const) {
			const configured = this.#config.cameras[slot]
			Object.assign(values, this.#cameraState.cameraVariables(slot))
			values[cameraVariableId(slot, 'name')] = configured.name
			values[cameraVariableId(slot, 'ip')] = configured.host
			values[cameraVariableId(slot, 'status')] = this.#cameras.status(slot)
			values[cameraVariableId(slot, 'active')] = slot === this.#cameras.activeSlot
		}
		values.camera_active_slot = active ?? ''
		values.camera_active_name = active === undefined ? '' : (this.#cameras.name(active) ?? '')
		values.camera_active_ip = active === undefined ? '' : (this.#cameras.host(active) ?? '')
		values.camera_active_status = active === undefined ? InstanceStatus.Disconnected : this.#cameras.status(active)
		this.setVariableValues(values)
	}

	async #queueCameraStateRefresh(slot: CameraSlot, inquiries: readonly Lv20nInquirySpec[]): Promise<void> {
		const version = this.#stateRefreshes.version(slot)
		const previous = this.#stateRefreshQueues.get(slot) ?? Promise.resolve()
		const refresh = previous.then(async () => {
			await loadCameraState(
				slot,
				inquiries,
				async (target, bytes) => this.#cameras.sendRawInquiry(target, bytes),
				(target, inquiry, fields) => this.#recordCameraState(target, inquiry, fields),
				() => !this.#destroyed && this.#cameras.has(slot) && this.#stateRefreshes.isCurrent(slot, version),
			)
		})
		this.#stateRefreshQueues.set(slot, refresh)
		void refresh.finally(() => {
			if (this.#stateRefreshQueues.get(slot) === refresh) this.#stateRefreshQueues.delete(slot)
		})
		return refresh
	}

	/**
	 * Write a copy of the given module config information to logs.
	 *
	 * @param config
	 *   The config information to log.
	 * @param desc
	 *   A description of the event occasioning the logging.
	 */
	#logConfig(config: RawConfig, desc = 'logConfig()'): void {
		this.log('info', `AVKANS LV20N module configuration on ${desc}: ${repr(config)}`)
	}
}
