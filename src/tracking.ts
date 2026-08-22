import type { DropdownChoice } from '@companion-module/base'

export type TrackingPanel = 'Base1' | 'Base2'
export type TrackingComponent = 'Switch' | 'Select' | 'Slider'
export type TrackingValue = string | number

export interface TrackingField {
	id: string
	panel: TrackingPanel
	key: string
	label: string
	component: TrackingComponent
	choices?: DropdownChoice[]
	min?: number
	max?: number
	step?: number
	default: TrackingValue
}

interface CameraTrackingAbility {
	key?: unknown
	component?: unknown
	feature?: unknown
	default?: unknown
}

const labels: Record<string, string> = {
	TrackSwitch: 'Track Mode',
	posCorrect: 'Position Correction',
	debug: 'Debug',
	trackheight: 'Tracking Height',
	tiltMotionEnableChk: 'Tilt Motion',
	outsidePlatformEnableChk: 'Tracking Outside Podium',
	autoZoomEnableChk: 'Auto Zoom',
	sensitivity: 'Sensitivity',
	trackSpeed: 'Tracking Speed',
	lostTime: 'Target Lost Time',
	zoomLimit: 'Zoom Limit',
	PowerOnStatus: 'Power-on Tracking State',
	lostPosition: 'Target Lost Position',
	VideoAutoSwitch: 'Automatic Video Switch',
	SDIoutput: 'SDI Output',
	HDMIoutput: 'HDMI Output',
	USBswitch: 'USB Switch',
	hostSwitch: 'Host Switch',
	switchPriority: 'Priority Switch',
	MultiTargetDeal: 'Multiple Target Handling',
	gestureRecognition: 'Gesture Recognition',
	checkSensitivity: 'Check Sensitivity',
	lensSensitivity: 'Lens Sensitivity',
}

const supportedBase1Keys = new Set(['TrackSwitch', 'posCorrect', 'debug'])

function humanize(value: string): string {
	return value
		.replace(/^.*\./, '')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase())
}

export function trackingFieldId(panel: TrackingPanel, key: string): string {
	return `${panel.toLowerCase()}_${key.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}`
}

function choices(feature: unknown): DropdownChoice[] | undefined {
	if (!Array.isArray(feature)) return undefined
	const values = feature.flatMap((choice): DropdownChoice[] => {
		if (typeof choice !== 'object' || choice === null) return []
		const record = choice as { label?: unknown; value?: unknown }
		if (typeof record.value !== 'string' && typeof record.value !== 'number') return []
		const label = typeof record.label === 'string' || typeof record.label === 'number' ? record.label : record.value
		return [{ id: record.value, label: humanize(String(label)) }]
	})
	return values.length === 0 ? undefined : values
}

export function normalizeTrackingAbilities(panel: TrackingPanel, abilities: unknown): TrackingField[] {
	if (!Array.isArray(abilities)) return []
	return abilities.flatMap((ability): TrackingField[] => {
		if (typeof ability !== 'object' || ability === null) return []
		const { key, component, feature, default: defaultValue } = ability as CameraTrackingAbility
		if (typeof key !== 'string') return []
		if (panel === 'Base1' && !supportedBase1Keys.has(key)) return []
		if (component !== 'Switch' && component !== 'Select' && component !== 'Slider') return []
		const field: TrackingField = {
			id: trackingFieldId(panel, key),
			panel,
			key,
			label: labels[key] ?? humanize(key),
			component,
			default: typeof defaultValue === 'string' || typeof defaultValue === 'number' ? defaultValue : 0,
		}
		if (component === 'Select') field.choices = choices(feature)
		if (component === 'Slider' && typeof feature === 'object' && feature !== null) {
			const limits = feature as { min?: unknown; max?: unknown; step?: unknown }
			if (typeof limits.min === 'number') field.min = limits.min
			if (typeof limits.max === 'number') field.max = limits.max
			if (typeof limits.step === 'number') field.step = limits.step
		}
		return [field]
	})
}

export const TrackingHeightField: TrackingField = {
	id: trackingFieldId('Base1', 'trackheight'),
	panel: 'Base1',
	key: 'trackheight',
	label: labels.trackheight,
	component: 'Slider',
	min: 0,
	max: 200,
	step: 10,
	default: 0,
}

export function trackingVariableId(field: TrackingField): string {
	return `tracking_${field.id}`
}

export function mergeTrackingFields(collections: Iterable<readonly TrackingField[]>): TrackingField[] {
	const merged = new Map<string, TrackingField>()
	for (const fields of collections) for (const field of fields) merged.set(field.id, field)
	return [...merged.values()].sort((left, right) => left.label.localeCompare(right.label))
}
