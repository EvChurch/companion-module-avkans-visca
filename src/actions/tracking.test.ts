import { expect, test, vi } from 'vitest'
import type { AvkansLv20nInstance } from '../instance.js'
import type { TrackingField } from '../tracking.js'
import { MockContext } from '../__tests__/mock-context.js'
import { trackingActions } from './tracking.js'

const autoZoom: TrackingField = {
	id: 'base2_autozoomenablechk',
	panel: 'Base2',
	key: 'autoZoomEnableChk',
	label: 'Auto Zoom',
	component: 'Switch',
	default: 1,
}

test('creates a direct action for each tracking setting', async () => {
	const setTrackingValue = vi.fn()
	const instance = { setTrackingValue } as unknown as AvkansLv20nInstance
	const action = trackingActions(instance, [autoZoom]).tracking_set_base2_autozoomenablechk
	if (!action) throw new Error('missing tracking action')

	expect(action.name).toBe('Tracking: Auto Zoom')
	expect(action.options[0]).toMatchObject({
		type: 'dropdown',
		choices: [
			{ id: 0, label: 'Off' },
			{ id: 1, label: 'On' },
		],
	})
	await action.callback(
		{
			actionId: 'tracking_set_base2_autozoomenablechk',
			controlId: 'test',
			id: 'test',
			surfaceId: undefined,
			options: { value: 0 },
		},
		new MockContext(),
	)
	expect(setTrackingValue).toHaveBeenCalledWith(autoZoom, 0)
})
