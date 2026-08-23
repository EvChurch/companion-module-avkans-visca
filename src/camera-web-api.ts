import { InstanceStatus } from '@companion-module/base'
import { TrackingHeightField, normalizeTrackingAbilities, type TrackingField, type TrackingValue } from './tracking.js'
import { ZoomSpeedDefinitions, type ZoomSpeedValues } from './zoom-speed-state.js'

interface CameraWebCredentials {
	username: string
	password: string
}

export interface PresetRecallSpeeds {
	pan: number
	tilt: number
	zoom: number
}

interface CameraWebApiHost {
	log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void
	updateStatus(status: InstanceStatus): void
	trackingSchemaUpdated?(fields: readonly TrackingField[]): void
	trackingValuesUpdated?(values: Readonly<Record<string, TrackingValue>>): void
	zoomSpeedsUpdated?(values: ZoomSpeedValues): void
}

type CameraApiResponse = { code?: number; data?: unknown; message?: string }

class CameraApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message)
	}
}

function validateSpeed(name: string, value: number, maximum: number): void {
	if (!Number.isInteger(value) || value < 1 || value > maximum) {
		throw new RangeError(`${name} preset speed must be between 1 and ${maximum}`)
	}
}

function validateManualZoomSpeed(value: number): void {
	if (!Number.isInteger(value) || value < 1 || value > 8) {
		throw new RangeError('Zoom speed must be between 1 and 8')
	}
}

export class CameraWebApi {
	readonly #host: string
	readonly #credentials: CameraWebCredentials
	readonly #instance: CameraWebApiHost
	readonly #fetch: typeof fetch
	readonly #retryMs: number
	#token: string | undefined
	#closed = false
	#retryTimer: NodeJS.Timeout | undefined
	#loginPromise: Promise<void> | undefined
	#trackingFields: TrackingField[] = []
	#trackingPollTimer: NodeJS.Timeout | undefined

	constructor(
		host: string,
		credentials: CameraWebCredentials,
		instance: CameraWebApiHost,
		fetcher: typeof fetch = fetch,
		retryMs = 5_000,
	) {
		this.#host = host
		this.#credentials = credentials
		this.#instance = instance
		this.#fetch = fetcher
		this.#retryMs = retryMs
	}

	open(): void {
		this.#closed = false
		this.#instance.updateStatus(InstanceStatus.Connecting)
		void this.#connect().catch((reason) => this.#handleConnectionFailure(reason))
	}

	close(): void {
		this.#closed = true
		this.#token = undefined
		if (this.#retryTimer !== undefined) clearTimeout(this.#retryTimer)
		if (this.#trackingPollTimer !== undefined) clearTimeout(this.#trackingPollTimer)
		this.#retryTimer = undefined
		this.#trackingPollTimer = undefined
		this.#instance.updateStatus(InstanceStatus.Disconnected)
	}

	async setPresetRecallSpeeds(speeds: PresetRecallSpeeds): Promise<void> {
		validateSpeed('Pan', speeds.pan, 24)
		validateSpeed('Tilt', speeds.tilt, 20)
		validateSpeed('Zoom', speeds.zoom, 8)
		for (const [key, value] of [
			['preset_p_speed', speeds.pan],
			['preset_t_speed', speeds.tilt],
			['preset_z_speed', speeds.zoom],
		] as const)
			await this.setPtValue(key, value)
		await this.refreshZoomSpeeds()
	}

	async setPtValue(key: string, value: number): Promise<void> {
		await this.#request('POST', '/pt/set', { key, value })
	}

	async setZoomSpeed(speed: number): Promise<void> {
		validateManualZoomSpeed(speed)
		await this.setPtValue('zoom_speed', speed)
		await this.refreshZoomSpeeds()
	}

	async getPtValue(key: string): Promise<number> {
		const values = await this.#request('POST', '/pt/get', { keys: [key] })
		if (!Array.isArray(values)) throw new Error(`Camera web API returned no value for ${key}`)
		const result = values.find((value): value is { key: string; value: number } => {
			if (typeof value !== 'object' || value === null) return false
			const record = value as { key?: unknown; value?: unknown }
			return record.key === key && typeof record.value === 'number'
		})
		if (result === undefined) throw new Error(`Camera web API returned no value for ${key}`)
		return result.value
	}

	async refreshZoomSpeeds(): Promise<void> {
		const values = await this.#request('POST', '/pt/get', { keys: ZoomSpeedDefinitions.map(({ key }) => key) })
		if (!Array.isArray(values)) throw new Error('Camera web API returned no zoom speed values')
		const speeds: ZoomSpeedValues = {}
		for (const value of values) {
			if (typeof value !== 'object' || value === null) continue
			const record = value as { key?: unknown; value?: unknown }
			const definition = ZoomSpeedDefinitions.find(({ key }) => key === record.key)
			if (definition !== undefined && typeof record.value === 'number') speeds[definition.id] = record.value
		}
		this.#instance.zoomSpeedsUpdated?.(speeds)
	}

	async movePanTilt(
		panDirection: -1 | 0 | 1,
		tiltDirection: -1 | 0 | 1,
		panSpeed: number,
		tiltSpeed: number,
	): Promise<void> {
		await this.#request('POST', '/pt/move-rel', {
			pan_dir: panDirection,
			tilt_dir: tiltDirection,
			pan_speed: panSpeed,
			tilt_speed: tiltSpeed,
		})
	}

	async moveZoom(direction: -1 | 0 | 1, speed: number): Promise<void> {
		await this.#request('POST', '/pt/zoom-rel', { zoom_dir: direction, zoom_speed: speed })
	}

	async point(
		method: 'home' | 'set' | 'clear' | 'recall',
		id: number,
		panSpeed: number,
		tiltSpeed: number,
	): Promise<void> {
		await this.#request('POST', '/pt/point', { method, id, pan_speed: panSpeed, tilt_speed: tiltSpeed })
	}

	async setAutoFocus(enabled: boolean): Promise<void> {
		await this.#request('POST', '/af/set', { key: 'af_auto', value: enabled ? 1 : 0 })
	}

	async moveFocus(direction: -1 | 0 | 1): Promise<void> {
		await this.#request('POST', '/af/set', { key: 'af_focus_rel', value: direction })
	}

	async refreshTracking(): Promise<void> {
		if (this.#trackingFields.length === 0) await this.#discoverTracking()
		const values: Record<string, TrackingValue> = {}
		for (const panel of ['Base1', 'Base2'] as const) {
			const fields = this.#trackingFields.filter((field) => field.panel === panel && field.key !== 'trackheight')
			if (fields.length === 0) continue
			const result = await this.#request('POST', `/${panel.toLowerCase()}/get`, {
				keys: fields.map(({ key }) => key),
			})
			this.#collectTrackingValues(fields, result, values)
		}
		const height = await this.#request('POST', '/status/get', { keys: [TrackingHeightField.key] })
		this.#collectTrackingValues([TrackingHeightField], height, values)
		this.#instance.trackingValuesUpdated?.(values)
	}

	async setTrackingValue(field: TrackingField, value: TrackingValue): Promise<void> {
		const supported = this.#trackingFields.find(({ id }) => id === field.id)
		if (supported === undefined) throw new Error(`Tracking setting ${field.label} is not supported by this camera`)
		field = supported
		if (field.key === 'TrackSwitch') {
			await this.#request('POST', '/Int/set', { key: 10, s32value0: Number(value) })
		} else if (field.key === 'debug') {
			await this.#request('POST', '/status/set', { method: 'debug', debug: Number(value) })
		} else if (field.key === 'posCorrect') {
			await this.#request('POST', '/base1/set', { method: 'poscorrect', poscorrect: String(value) })
		} else if (field.key === 'trackheight') {
			await this.#request('POST', '/status/set', { method: 'trackheight', trackheight: Number(value) })
		} else if (field.panel === 'Base2') {
			const fields = this.#trackingFields.filter((candidate) => candidate.panel === 'Base2')
			const current = await this.#request('POST', '/base2/get', { keys: fields.map(({ key }) => key) })
			const payload: Record<string, string> = {}
			if (Array.isArray(current)) {
				for (const entry of current) {
					if (typeof entry !== 'object' || entry === null) continue
					const record = entry as { key?: unknown; value?: unknown }
					if (typeof record.key === 'string') {
						payload[record.key] =
							typeof record.value === 'string' || typeof record.value === 'number' ? String(record.value) : ''
					}
				}
			}
			payload[field.key] = String(value)
			await this.#request('POST', '/base2/set', payload)
		} else {
			throw new Error(`Tracking field ${field.key} cannot be changed by this module`)
		}
		await this.refreshTracking()
	}

	async #connect(): Promise<void> {
		await this.#login()
		await this.#discoverTracking()
		await this.#refreshWebState()
		this.#scheduleTrackingPoll()
	}

	async #refreshWebState(): Promise<void> {
		await this.refreshTracking()
		await this.refreshZoomSpeeds()
	}

	async #discoverTracking(): Promise<void> {
		const fields: TrackingField[] = []
		for (const panel of ['Base1', 'Base2'] as const) {
			const abilities = await this.#request('GET', '/panel-ability', undefined, { panel })
			fields.push(...normalizeTrackingAbilities(panel, abilities))
		}
		fields.push(TrackingHeightField)
		this.#trackingFields = fields
		this.#instance.trackingSchemaUpdated?.(fields)
	}

	#collectTrackingValues(
		fields: readonly TrackingField[],
		result: unknown,
		values: Record<string, TrackingValue>,
	): void {
		if (!Array.isArray(result)) return
		const byKey = new Map(fields.map((field) => [field.key, field]))
		for (const entry of result) {
			if (typeof entry !== 'object' || entry === null) continue
			const record = entry as { key?: unknown; value?: unknown }
			const field = typeof record.key === 'string' ? byKey.get(record.key) : undefined
			if (field !== undefined && (typeof record.value === 'string' || typeof record.value === 'number')) {
				values[field.id] = record.value
			}
		}
	}

	#scheduleTrackingPoll(): void {
		if (this.#closed) return
		if (this.#trackingPollTimer !== undefined) clearTimeout(this.#trackingPollTimer)
		this.#trackingPollTimer = setTimeout(() => {
			this.#trackingPollTimer = undefined
			void this.#refreshWebState()
				.catch((reason) => this.#instance.log('warn', `Unable to refresh camera web state: ${String(reason)}`))
				.finally(() => this.#scheduleTrackingPoll())
		}, 10_000)
		this.#trackingPollTimer.unref()
	}

	async #login(): Promise<void> {
		if (this.#closed) throw new Error('Camera web API is closed')
		if (this.#credentials.password.length === 0) throw new Error('Camera web password is not configured')
		if (this.#loginPromise !== undefined) return this.#loginPromise
		this.#loginPromise = (async () => {
			const response = await this.#requestWithoutAuth('/auth/login', { ...this.#credentials, remember: false })
			const token = (response.data as { token?: unknown } | undefined)?.token
			if (typeof token !== 'string' || token.length === 0)
				throw new Error('Camera web login response did not contain an access token')
			this.#token = token
			this.#instance.updateStatus(InstanceStatus.Ok)
		})().finally(() => {
			this.#loginPromise = undefined
		})
		return this.#loginPromise
	}

	async #request(
		method: 'GET' | 'POST',
		path: string,
		body?: unknown,
		query?: Record<string, string>,
	): Promise<unknown> {
		if (this.#token === undefined) {
			try {
				await this.#login()
			} catch (reason) {
				this.#handleConnectionFailure(reason)
				throw reason
			}
		}
		try {
			return (await this.#requestWithoutAuth(path, body, this.#token, method, query)).data
		} catch (reason) {
			if (reason instanceof CameraApiError && reason.status === 401) {
				try {
					this.#token = undefined
					await this.#login()
					return (await this.#requestWithoutAuth(path, body, this.#token, method, query)).data
				} catch (retryReason) {
					this.#handleConnectionFailure(retryReason)
					throw retryReason
				}
			}
			if (!(reason instanceof CameraApiError) || reason.status === 401 || reason.status >= 500) {
				this.#handleConnectionFailure(reason)
			}
			throw reason
		}
	}

	async #requestWithoutAuth(
		path: string,
		body: unknown,
		token?: string,
		method: 'GET' | 'POST' = 'POST',
		query?: Record<string, string>,
	): Promise<CameraApiResponse> {
		const parameters = query === undefined ? '' : `?${new URLSearchParams(query).toString()}`
		const response = await this.#fetch(`http://${this.#host}/api${path}${parameters}`, {
			method,
			headers: {
				'Content-Type': 'application/json;charset=UTF-8',
				...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
			},
			...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
			signal: AbortSignal.timeout(5_000),
		})
		let result: CameraApiResponse
		try {
			result = (await response.json()) as CameraApiResponse
		} catch {
			throw new CameraApiError(
				`Camera web API returned HTTP ${response.status} without a valid JSON response`,
				response.status,
			)
		}
		if (!response.ok || (result.code !== 0 && result.code !== 200)) {
			throw new CameraApiError(
				result.message === undefined || result.message.length === 0
					? `Camera web API returned HTTP ${response.status}`
					: result.message,
				response.status,
			)
		}
		return result
	}

	#handleConnectionFailure(reason: unknown): void {
		if (this.#closed) return
		this.#token = undefined
		this.#instance.log(
			'error',
			`Camera web authentication failed: ${reason instanceof Error ? reason.message : String(reason)}`,
		)
		this.#instance.updateStatus(InstanceStatus.ConnectionFailure)
		if (this.#retryTimer !== undefined) clearTimeout(this.#retryTimer)
		this.#retryTimer = setTimeout(() => {
			this.#retryTimer = undefined
			this.#instance.updateStatus(InstanceStatus.Connecting)
			void this.#connect().catch((error) => this.#handleConnectionFailure(error))
		}, this.#retryMs)
		this.#retryTimer.unref()
	}
}

export async function setPresetRecallSpeeds(
	host: string,
	credentials: CameraWebCredentials,
	speeds: PresetRecallSpeeds,
	fetcher: typeof fetch = fetch,
): Promise<void> {
	await new CameraWebApi(
		host,
		credentials,
		{ log: () => undefined, updateStatus: () => undefined },
		fetcher,
	).setPresetRecallSpeeds(speeds)
}
