import { type InputValue, Regex, type SomeCompanionConfigField } from '@companion-module/base'
import type { Branded } from './utils/brand.js'

/**
 * The `TConfig` object type used to store instance configuration info.
 *
 * Nothing ensures that Companion config objects conform to the `TConfig` type
 * specified by a module.  Therefore we leave this type underdefined, not
 * well-defined, so that configuration info will be defensively processed.  (We
 * use `AvkansLv20nConfig` to ensure configuration data is well-typed.  See
 * `validateConfig` for details.)
 */
export interface RawConfig {
	[key: string]: InputValue | undefined
}

/** The id of the debug-logging config option. */
const DebugLoggingOptionId = 'debugLogging'
const TransportModeOptionId = 'transportMode'
const DefaultCameraWebUsername = 'admin'

export type TransportMode = 'raw' | 'visca-over-ip'

export const CameraSlots = [1, 2, 3, 4] as const
export type CameraSlot = (typeof CameraSlots)[number]
export type CameraTarget = 'active' | CameraSlot

export interface ConfiguredCamera {
	slot: CameraSlot
	name: string
	host: Host
	username: string
}

export type CameraWebPasswordOptionId = `camera${CameraSlot}Password`
export type AvkansLv20nSecrets = Partial<Record<CameraWebPasswordOptionId, string>>

export function cameraWebPasswordOptionId(slot: CameraSlot): CameraWebPasswordOptionId {
	return `camera${slot}Password`
}

const DefaultTransportMode: TransportMode = 'raw'

/** Compute the config fields list for this module. */
export function getConfigFields(): SomeCompanionConfigField[] {
	const fields: SomeCompanionConfigField[] = [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'Each enabled camera needs its own web login. Also configure the LV20N Control Protocol page for TCP, Server mode, and the same VISCA fallback port used below.',
		},
	]
	for (const slot of CameraSlots) {
		fields.push(
			{
				type: 'textinput',
				id: `camera${slot}Name`,
				label: `Camera ${slot} name`,
				width: 6,
				default: `Camera ${slot}`,
			},
			{
				type: 'textinput',
				id: `camera${slot}Host`,
				label: `Camera ${slot} IP (leave blank to disable)`,
				width: 6,
				default: '',
			},
			{
				type: 'textinput',
				id: `camera${slot}Username`,
				label: `Camera ${slot} web username`,
				width: 6,
				default: DefaultCameraWebUsername,
				required: true,
			},
			{
				type: 'secret-text',
				id: cameraWebPasswordOptionId(slot),
				label: `Camera ${slot} web password`,
				width: 6,
				default: '',
			},
		)
	}
	fields.push(
		{
			type: 'dropdown',
			id: TransportModeOptionId,
			label: 'VISCA transport',
			width: 6,
			choices: [
				{ id: 'raw', label: 'Raw VISCA over TCP (LV20N default)' },
				{ id: 'visca-over-ip', label: 'VISCA over IP framing' },
			],
			default: DefaultTransportMode,
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'VISCA TCP port',
			width: 6,
			default: '1259',
			regex: Regex.PORT,
			required: true,
		},
		{
			type: 'checkbox',
			id: DebugLoggingOptionId,
			label: 'Log extra info during connection operations, for debugging purposes',
			default: false,
			width: 6,
		},
	)
	return fields
}

/** Validated config information for the camera connection being manipulated. */
export type AvkansLv20nConfig = {
	cameras: Record<CameraSlot, { name: string; host: string; username: string }>

	/** The TCP/IP port used to connect to the camera. */
	port: number

	/** How VISCA payloads are framed on the TCP connection. */
	[TransportModeOptionId]: TransportMode

	/**
	 * Whether to perform debug logging of extensive details concerning the
	 * connection: messages sent and received, internal command/inquiry/reply
	 * handling state, etc.
	 */
	[DebugLoggingOptionId]: boolean
}

/**
 * Instance config suitable for use at instance creation before initialization
 * with an actual config.
 */
export function noCameraConfig(): AvkansLv20nConfig {
	return {
		// Empty host ensures that these options won't trigger a connection.
		cameras: Object.fromEntries(
			CameraSlots.map((slot) => [slot, { name: `Camera ${slot}`, host: '', username: DefaultCameraWebUsername }]),
		) as Record<CameraSlot, { name: string; host: string; username: string }>,
		port: DefaultPort,
		transportMode: DefaultTransportMode,
		debugLogging: false,
	}
}

/**
 * Validate `config` as validly-encoded options, massaging options into type
 * conformance as necessary.
 */
export function validateConfig(config: RawConfig): AvkansLv20nConfig {
	const cameras = Object.fromEntries(
		CameraSlots.map((slot) => [
			slot,
			{
				name: toCameraName(config[`camera${slot}Name`], slot),
				host: toHost(config[`camera${slot}Host`]),
				username: toCameraWebUsername(config[`camera${slot}Username`]),
			},
		]),
	) as Record<CameraSlot, { name: string; host: string; username: string }>
	return {
		cameras,
		port: toPort(config.port),
		transportMode: toTransportMode(config[TransportModeOptionId]),
		debugLogging: toDebugLogging(config[DebugLoggingOptionId]),
	}
}

function toCameraWebUsername(value: InputValue | undefined): string {
	const username = value === undefined ? '' : String(value).trim()
	return username || DefaultCameraWebUsername
}

function toCameraName(value: InputValue | undefined, slot: CameraSlot): string {
	const name = value === undefined ? '' : String(value).trim()
	return name || `Camera ${slot}`
}

export function cameraRoster(config: AvkansLv20nConfig): ConfiguredCamera[] {
	return CameraSlots.flatMap((slot) => {
		const camera = config.cameras[slot]
		return isValidHost(camera.host) ? [{ slot, name: camera.name, host: camera.host, username: camera.username }] : []
	})
}

export function cameraSlotsWithChangedHosts(oldConfig: AvkansLv20nConfig, newConfig: AvkansLv20nConfig): CameraSlot[] {
	return CameraSlots.filter((slot) => oldConfig.cameras[slot].host !== newConfig.cameras[slot].host)
}

const ipRegExp = new RegExp(Regex.IP.slice(1, -1))

/** A valid hostname as well-formed IP address. */
export type Host = Branded<string, 'config-host-valid-ip'>

/** Determine whether the supplied string is a valid hostname. */
export function isValidHost(str: string): str is Host {
	return ipRegExp.test(str)
}

function toHost(host: RawConfig['host']): string {
	if (host !== undefined) {
		const str = String(host)
		if (isValidHost(str)) {
			return str
		}
	}

	return ''
}

const DefaultPort = 1259

const portRegExp = new RegExp(Regex.PORT.slice(1, -1))

function toPort(port: RawConfig['port']): number {
	if (port !== undefined) {
		const portStr = String(port)
		if (portRegExp.test(portStr)) {
			return Number(portStr)
		}
	}

	return DefaultPort
}

function toTransportMode(value: RawConfig[typeof TransportModeOptionId]): TransportMode {
	return value === 'visca-over-ip' ? value : DefaultTransportMode
}

const toDebugLogging = Boolean
