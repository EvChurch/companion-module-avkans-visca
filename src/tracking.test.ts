import { describe, expect, test } from 'vitest'
import { normalizeTrackingAbilities, TrackingHeightField, trackingFieldId } from './tracking.js'

describe('tracking ability schema', () => {
	test('normalizes switches, choices, and sliders with user-facing labels', () => {
		const fields = normalizeTrackingAbilities('Base2', [
			{ key: 'autoZoomEnableChk', component: 'Switch', default: 1 },
			{
				key: 'lostPosition',
				component: 'Select',
				default: 2,
				feature: [
					{ label: 'opts.home', value: 0 },
					{ label: 'opts.current_position', value: 2 },
				],
			},
			{ key: 'trackSpeed', component: 'Slider', default: 5, feature: { min: 1, max: 10, step: 1 } },
		])

		expect(fields).toEqual([
			expect.objectContaining({ id: 'base2_autozoomenablechk', label: 'Auto Zoom', component: 'Switch' }),
			expect.objectContaining({
				id: 'base2_lostposition',
				label: 'Target Lost Position',
				choices: [
					{ id: 0, label: 'Home' },
					{ id: 2, label: 'Current Position' },
				],
			}),
			expect.objectContaining({ id: 'base2_trackspeed', min: 1, max: 10, step: 1 }),
		])
	})

	test('excludes interactive regions and exposes tracking height separately', () => {
		const fields = normalizeTrackingAbilities('Base1', [
			{ key: 'TrackSwitch', component: 'Select', default: 0, feature: [{ label: 'Off', value: 0 }] },
			{ key: 'ShowArea', component: 'Switch', default: 0 },
			{ key: 'PreArea', component: 'Button', default: 0 },
		])
		expect(fields.map(({ key }) => key)).toEqual(['TrackSwitch'])
		expect(TrackingHeightField.id).toBe(trackingFieldId('Base1', 'trackheight'))
	})
})
