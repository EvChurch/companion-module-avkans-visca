import type { ActionDefinitions, AvkansLv20nActionId } from './actionid.js'
import { customCommandActions } from './custom-command.js'
import { exposureActions } from './exposure.js'
import { focusActions } from './focus.js'
import type { AvkansLv20nInstance } from '../instance.js'
import { osdActions } from './osd.js'
import { panTiltActions } from './pan-tilt.js'
import { powerActions } from './power.js'
import { presetActions } from './presets.js'
import { whiteBalanceActions } from './white-balance.js'
import { zoomActions } from './zoom.js'
import { lv20nCatalogActions } from './lv20n-catalog.js'
import { lv20nInquiryActions } from './lv20n-inquiries.js'

export function getActions(instance: AvkansLv20nInstance): ActionDefinitions<AvkansLv20nActionId> {
	return {
		...customCommandActions(instance),
		...exposureActions(instance),
		...focusActions(instance),
		...osdActions(instance),
		...panTiltActions(instance),
		...powerActions(instance),
		...presetActions(instance),
		...whiteBalanceActions(instance),
		...zoomActions(instance),
		...lv20nCatalogActions(instance),
		...lv20nInquiryActions(instance),
	}
}
