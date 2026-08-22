import { InstanceStatus } from '@companion-module/base'

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
		void this.#login().catch((reason) => this.#handleConnectionFailure(reason))
	}

	close(): void {
		this.#closed = true
		this.#token = undefined
		if (this.#retryTimer !== undefined) clearTimeout(this.#retryTimer)
		this.#retryTimer = undefined
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
	}

	async setPtValue(key: string, value: number): Promise<void> {
		await this.#request('/pt/set', { key, value })
	}

	async getPtValue(key: string): Promise<number> {
		const values = await this.#request('/pt/get', { keys: [key] })
		if (!Array.isArray(values)) throw new Error(`Camera web API returned no value for ${key}`)
		const result = values.find((value): value is { key: string; value: number } => {
			if (typeof value !== 'object' || value === null) return false
			const record = value as { key?: unknown; value?: unknown }
			return record.key === key && typeof record.value === 'number'
		})
		if (result === undefined) throw new Error(`Camera web API returned no value for ${key}`)
		return result.value
	}

	async movePanTilt(
		panDirection: -1 | 0 | 1,
		tiltDirection: -1 | 0 | 1,
		panSpeed: number,
		tiltSpeed: number,
	): Promise<void> {
		await this.#request('/pt/move-rel', {
			pan_dir: panDirection,
			tilt_dir: tiltDirection,
			pan_speed: panSpeed,
			tilt_speed: tiltSpeed,
		})
	}

	async moveZoom(direction: -1 | 0 | 1, speed: number): Promise<void> {
		await this.#request('/pt/zoom-rel', { zoom_dir: direction, zoom_speed: speed })
	}

	async point(
		method: 'home' | 'set' | 'clear' | 'recall',
		id: number,
		panSpeed: number,
		tiltSpeed: number,
	): Promise<void> {
		await this.#request('/pt/point', { method, id, pan_speed: panSpeed, tilt_speed: tiltSpeed })
	}

	async setAutoFocus(enabled: boolean): Promise<void> {
		await this.#request('/af/set', { key: 'af_auto', value: enabled ? 1 : 0 })
	}

	async moveFocus(direction: -1 | 0 | 1): Promise<void> {
		await this.#request('/af/set', { key: 'af_focus_rel', value: direction })
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

	async #request(path: string, body: unknown): Promise<unknown> {
		if (this.#token === undefined) {
			try {
				await this.#login()
			} catch (reason) {
				this.#handleConnectionFailure(reason)
				throw reason
			}
		}
		try {
			return (await this.#requestWithoutAuth(path, body, this.#token)).data
		} catch (reason) {
			if (reason instanceof CameraApiError && reason.status === 401) {
				try {
					this.#token = undefined
					await this.#login()
					return (await this.#requestWithoutAuth(path, body, this.#token)).data
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

	async #requestWithoutAuth(path: string, body: unknown, token?: string): Promise<CameraApiResponse> {
		const response = await this.#fetch(`http://${this.#host}/api${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8',
				...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
			},
			body: JSON.stringify(body),
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
			void this.#login().catch((error) => this.#handleConnectionFailure(error))
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
