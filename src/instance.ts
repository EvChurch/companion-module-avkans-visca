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
	type AvkansLv20nSecrets,
	cameraWebPasswordOptionId,
} from './config.js'
import { getPresets } from './presets.js'
import { repr } from './utils/repr.js'
import type { Command, CommandParameters, CommandParamValues, NoCommandParameters } from './visca/command.js'
import type { Answer, AnswerParameters, Inquiry } from './visca/inquiry.js'
import type { Bytes } from './utils/byte.js'
import { activeCameraVariableId, cameraVariableId, getLv20nVariableDefinitions } from './variables.js'
import {
	ActiveCameraFeedbackId,
	CameraStateFeedbackIds,
	cameraStateFeedbackIdsForInquiry,
	CameraConnectionFeedbackId,
	getLv20nFeedbacks,
	trackingFeedbackId,
} from './feedbacks.js'
import { CameraManager } from './cameras.js'
import { currentCameraSlot } from './actions/camera-target.js'
import type { Lv20nInquirySpec } from './camera/lv20n-inquiry.js'
import { CameraState } from './camera-state.js'
import {
	automaticallyRefreshedInquiries,
	CameraStatePoller,
	CameraStateRefreshCoordinator,
	inquiriesForCommandGroup,
	loadCameraState,
} from './camera-state-loader.js'
import { lv20nInquiryCatalog } from './camera/lv20n-inquiry-catalog.js'
import { CameraWebApi, type PresetRecallSpeeds } from './camera-web-api.js'
import { mergeTrackingFields, trackingVariableId, type TrackingField, type TrackingValue } from './tracking.js'
import {
	ZoomSpeedDefinitions,
	zoomSpeedFeedbackId,
	type ZoomSpeedId,
	type ZoomSpeedValues,
} from './zoom-speed-state.js'

export class AvkansLv20nInstance extends InstanceBase<RawConfig, AvkansLv20nSecrets> {
	/** Configuration dictating the behavior of this instance. */
	#config: AvkansLv20nConfig = noCameraConfig()
	#secrets: AvkansLv20nSecrets = {}
	get config(): AvkansLv20nConfig {
		return this.#config
	}

	/** Whether debug logging is enabled on this instance or not. */
	get debugLogging(): boolean {
		return this.#config.debugLogging
	}

	readonly #cameras = new CameraManager(this)
	readonly #webApis = new Map<CameraSlot, { signature: string; api: CameraWebApi }>()
	readonly #trackingFieldsByCamera = new Map<CameraSlot, readonly TrackingField[]>()
	readonly #trackingValues = new Map<CameraSlot, Readonly<Record<string, TrackingValue>>>()
	readonly #zoomSpeeds = new Map<CameraSlot, ZoomSpeedValues>()
	#trackingFields: TrackingField[] = []
	readonly #cameraState = new CameraState()
	readonly #stateRefreshQueues = new Map<CameraSlot, Promise<void>>()
	readonly #stateRefreshes = new CameraStateRefreshCoordinator()
	readonly #statePoller = new CameraStatePoller(async () => {
		const connectedSlots = this.#cameras
			.configuredSlots()
			.filter((slot) => this.#cameras.status(slot) === InstanceStatus.Ok)
		await Promise.all(connectedSlots.map(async (slot) => this.refreshCameraState(slot)))
	})
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

	async setPresetRecallSpeeds(speeds: PresetRecallSpeeds): Promise<void> {
		const slot = this.#targetSlot()
		if (slot === undefined) {
			this.log('warn', 'No camera is configured for this action')
			return
		}
		try {
			await this.#webApi(slot).setPresetRecallSpeeds(speeds)
		} catch (reason) {
			const camera = this.#config.cameras[slot]
			this.log(
				'error',
				`Failed to set preset recall speeds for ${camera.name} (${camera.host}): ${reason instanceof Error ? reason.message : String(reason)}`,
			)
		}
	}

	zoomSpeedValue(id: ZoomSpeedId, target: CameraTarget = 'active'): number | undefined {
		const slot = this.resolveCameraTarget(target)
		return slot === undefined ? undefined : this.#zoomSpeeds.get(slot)?.[id]
	}

	async refreshZoomSpeeds(target: CameraTarget): Promise<void> {
		const slot = this.resolveCameraTarget(target)
		if (slot === undefined) return
		try {
			await this.#webApi(slot).refreshZoomSpeeds()
		} catch (reason) {
			this.log('warn', `Unable to refresh zoom speeds for camera ${slot}: ${String(reason)}`)
		}
	}

	async movePanTiltNative(pan: -1 | 0 | 1, tilt: -1 | 0 | 1, panSpeed: number, tiltSpeed: number): Promise<void> {
		await this.#runWebAction(async (api) => api.movePanTilt(pan, tilt, panSpeed, tiltSpeed))
	}

	async moveZoomNative(direction: -1 | 0 | 1): Promise<void> {
		await this.#runWebAction(async (api) => {
			if (direction === 0) {
				await api.moveZoom(0, 1)
				return
			}
			const speed = await api.getPtValue('zoom_speed')
			await api.moveZoom(direction, speed)
		})
	}

	async setZoomSpeedNative(speed: number): Promise<void> {
		await this.#runWebAction(async (api) => api.setZoomSpeed(speed))
	}

	async pointNative(method: 'home' | 'set' | 'clear' | 'recall', id: number): Promise<void> {
		const { panSpeed, tiltSpeed } = this.panTiltSpeed()
		await this.#runWebAction(
			async (api) => api.point(method, id, panSpeed, tiltSpeed),
			method === 'recall' ? 'memory' : method === 'home' ? 'pan_tilt' : undefined,
		)
	}

	async setAutoFocusNative(enabled: boolean): Promise<void> {
		await this.#runWebAction(async (api) => api.setAutoFocus(enabled), 'focus')
	}

	async moveFocusNative(direction: -1 | 0 | 1): Promise<void> {
		await this.#runWebAction(async (api) => api.moveFocus(direction))
	}

	trackingValue(id: string, target: CameraTarget = 'active'): TrackingValue | undefined {
		const slot = this.resolveCameraTarget(target)
		return slot === undefined ? undefined : this.#trackingValues.get(slot)?.[id]
	}

	async refreshTracking(target: CameraTarget): Promise<void> {
		const slot = this.resolveCameraTarget(target)
		if (slot === undefined) return
		try {
			await this.#webApi(slot).refreshTracking()
		} catch (reason) {
			this.log('warn', `Unable to refresh tracking state for camera ${slot}: ${String(reason)}`)
		}
	}

	async setTrackingValue(field: TrackingField, value: TrackingValue): Promise<void> {
		await this.#runWebAction(async (api) => api.setTrackingValue(field, value))
	}

	async #runWebAction(callback: (api: CameraWebApi) => Promise<void>, commandGroupId?: string): Promise<void> {
		const slot = this.#targetSlot()
		if (slot === undefined) {
			this.log('warn', 'No camera is configured for this action')
			return
		}
		try {
			await callback(this.#webApi(slot))
			if (commandGroupId !== undefined) {
				const inquiries = inquiriesForCommandGroup(commandGroupId)
				if (inquiries.length > 0) await this.#queueCameraStateRefresh(slot, inquiries)
			}
		} catch (reason) {
			const camera = this.#config.cameras[slot]
			this.log(
				'error',
				`Camera web action failed for ${camera.name} (${camera.host}): ${reason instanceof Error ? reason.message : String(reason)}`,
			)
		}
	}

	#webApi(slot: CameraSlot): CameraWebApi {
		const api = this.#webApis.get(slot)?.api
		if (api === undefined) throw new Error(`Camera ${slot} web API is not configured`)
		return api
	}

	onStateChanged(): void {
		this.#refreshCameraVariables()
		this.checkFeedbacks(
			ActiveCameraFeedbackId,
			CameraConnectionFeedbackId,
			...CameraStateFeedbackIds,
			...this.#trackingFields.map(({ id }) => trackingFeedbackId(id)),
			...ZoomSpeedDefinitions.map(({ id }) => zoomSpeedFeedbackId(id)),
		)
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
		const slot = this.#targetSlot()
		if (slot === undefined) {
			this.log('warn', 'No camera is configured for this action')
			return
		}
		void this.#sendCommand(slot, command, ...paramValues)
	}

	async sendCommandAndRefresh<CmdParameters extends CommandParameters>(
		commandGroupId: string,
		command: Command<CmdParameters>,
		...paramValues: CmdParameters extends NoCommandParameters
			? [CommandParamValues<CmdParameters>?]
			: [CommandParamValues<CmdParameters>]
	): Promise<void> {
		const slot = this.#targetSlot()
		if (slot === undefined) {
			this.log('warn', 'No camera is configured for this action')
			return
		}
		const inquiries = inquiriesForCommandGroup(commandGroupId)
		if ((await this.#sendCommand(slot, command, ...paramValues)) && inquiries.length > 0) {
			await this.#queueCameraStateRefresh(slot, inquiries)
		}
	}

	async #sendCommand<CmdParameters extends CommandParameters>(
		slot: CameraSlot,
		command: Command<CmdParameters>,
		...paramValues: CmdParameters extends NoCommandParameters
			? [CommandParamValues<CmdParameters>?]
			: [CommandParamValues<CmdParameters>]
	): Promise<boolean> {
		try {
			const result = await this.#cameras.sendCommand(slot, command, ...paramValues)
			if (result instanceof Error) {
				this.log('error', `Error processing command: ${result.message}`)
				return false
			}
			return true
		} catch (reason) {
			this.log('error', `Unhandled command rejection was suppressed: ${reason}`)
			return false
		}
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
		this.#statePoller.stop()
		for (const slot of [1, 2, 3, 4] as const) this.#stateRefreshes.advance(slot)
		this.#cameras.close()
		for (const session of this.#webApis.values()) session.api.close()
		this.#webApis.clear()
		this.#trackingFieldsByCamera.clear()
		this.#trackingValues.clear()
		this.#zoomSpeeds.clear()
	}

	override async init(config: RawConfig, _isFirstInit: boolean, secrets: AvkansLv20nSecrets): Promise<void> {
		this.#logConfig(config, 'init()')

		await this.configUpdated(config, secrets)
		if (!this.#destroyed) this.#statePoller.start()
	}

	override async configUpdated(config: RawConfig, secrets: AvkansLv20nSecrets): Promise<void> {
		this.#logConfig(config, 'configUpdated()')

		const oldConfig = this.#config
		this.#config = validateConfig(config)
		this.#secrets = secrets ?? {}
		for (const slot of cameraSlotsWithChangedHosts(oldConfig, this.#config)) {
			this.#cameraState.clear(slot)
			this.#stateRefreshes.advance(slot)
		}
		this.setActionDefinitions(getActions(this, this.#trackingFields))
		this.setPresetDefinitions(getPresets())
		this.setVariableDefinitions(getLv20nVariableDefinitions(this.#trackingFields))
		this.setFeedbackDefinitions(getLv20nFeedbacks(this, cameraRoster(this.#config), this.#trackingFields))
		this.#cameras.reconcile(this.#config)
		this.#reconcileWebApis()
	}

	#reconcileWebApis(): void {
		const roster = cameraRoster(this.#config)
		const wanted = new Set(roster.map(({ slot }) => slot))
		for (const [slot, session] of this.#webApis) {
			if (!wanted.has(slot)) {
				session.api.close()
				this.#webApis.delete(slot)
				this.#trackingFieldsByCamera.delete(slot)
				this.#trackingValues.delete(slot)
				this.#zoomSpeeds.delete(slot)
			}
		}
		for (const camera of roster) {
			const password = this.#secrets[cameraWebPasswordOptionId(camera.slot)] ?? ''
			const signature = `${camera.host}:${camera.username}:${password}`
			const existing = this.#webApis.get(camera.slot)
			if (existing?.signature === signature) continue
			existing?.api.close()
			this.#trackingFieldsByCamera.delete(camera.slot)
			this.#trackingValues.delete(camera.slot)
			this.#zoomSpeeds.delete(camera.slot)
			const api = new CameraWebApi(
				camera.host,
				{ username: camera.username, password },
				{
					log: (level, message) => this.log(level, `[Camera ${camera.slot}: ${camera.name}] ${message}`),
					updateStatus: (status) => this.#cameras.setWebStatus(camera.slot, status),
					trackingSchemaUpdated: (fields) => this.#updateTrackingSchema(camera.slot, fields),
					trackingValuesUpdated: (values) => this.#updateTrackingValues(camera.slot, values),
					zoomSpeedsUpdated: (values) => this.#updateZoomSpeeds(camera.slot, values),
				},
			)
			this.#webApis.set(camera.slot, { signature, api })
			api.open()
		}
		this.#rebuildTrackingDefinitions()
	}

	#updateTrackingSchema(slot: CameraSlot, fields: readonly TrackingField[]): void {
		this.#trackingFieldsByCamera.set(slot, fields)
		this.#rebuildTrackingDefinitions()
	}

	#rebuildTrackingDefinitions(): void {
		const merged = mergeTrackingFields(this.#trackingFieldsByCamera.values())
		if (JSON.stringify(merged) === JSON.stringify(this.#trackingFields)) return
		this.#trackingFields = merged
		this.setActionDefinitions(getActions(this, merged))
		this.setVariableDefinitions(getLv20nVariableDefinitions(merged))
		this.setFeedbackDefinitions(getLv20nFeedbacks(this, cameraRoster(this.#config), merged))
		this.#refreshCameraVariables()
	}

	#updateTrackingValues(slot: CameraSlot, values: Readonly<Record<string, TrackingValue>>): void {
		this.#trackingValues.set(slot, values)
		this.#refreshCameraVariables()
		this.checkFeedbacks(...this.#trackingFields.map(({ id }) => trackingFeedbackId(id)))
	}

	#updateZoomSpeeds(slot: CameraSlot, values: ZoomSpeedValues): void {
		this.#zoomSpeeds.set(slot, values)
		this.#refreshCameraVariables()
		this.checkFeedbacks(...ZoomSpeedDefinitions.map(({ id }) => zoomSpeedFeedbackId(id)))
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
			for (const field of this.#trackingFields) {
				values[cameraVariableId(slot, trackingVariableId(field))] = this.#trackingValues.get(slot)?.[field.id] ?? ''
			}
			for (const definition of ZoomSpeedDefinitions) {
				values[cameraVariableId(slot, definition.id)] = this.#zoomSpeeds.get(slot)?.[definition.id] ?? ''
			}
		}
		values.camera_active_slot = active ?? ''
		values.camera_active_name = active === undefined ? '' : (this.#cameras.name(active) ?? '')
		values.camera_active_ip = active === undefined ? '' : (this.#cameras.host(active) ?? '')
		values.camera_active_status = active === undefined ? InstanceStatus.Disconnected : this.#cameras.status(active)
		for (const field of this.#trackingFields) {
			values[activeCameraVariableId(trackingVariableId(field))] =
				active === undefined ? '' : (this.#trackingValues.get(active)?.[field.id] ?? '')
		}
		for (const definition of ZoomSpeedDefinitions) {
			values[activeCameraVariableId(definition.id)] =
				active === undefined ? '' : (this.#zoomSpeeds.get(active)?.[definition.id] ?? '')
		}
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
