export const ZoomSpeedDefinitions = [
	{ id: 'zoom_speed', key: 'zoom_speed', label: 'Zoom speed', min: 1, max: 8 },
	{ id: 'preset_zoom_speed', key: 'preset_z_speed', label: 'Preset zoom speed', min: 1, max: 8 },
] as const

export type ZoomSpeedId = (typeof ZoomSpeedDefinitions)[number]['id']
export type ZoomSpeedValues = Partial<Record<ZoomSpeedId, number>>

export function zoomSpeedFeedbackId(id: ZoomSpeedId): string {
	return `camera_${id}`
}
