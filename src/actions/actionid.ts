import type { CompanionActionDefinition } from '@companion-module/base'
import type { CustomCommandActionId } from './custom-command.js'
import type { ExposureActionId } from './exposure.js'
import type { FocusActionId } from './focus.js'
import type { OSDActionId } from './osd.js'
import type { PanTiltActionId } from './pan-tilt.js'
import type { PowerActionId } from './power.js'
import type { PresetActionId } from './presets.js'
import type { WhiteBalanceActionId } from './white-balance.js'
import type { ZoomActionId } from './zoom.js'
import type { Lv20nCatalogActionId } from './lv20n-catalog.js'
import type { Lv20nInquiryActionId } from './lv20n-inquiries.js'
import type { CameraSelectionActionId } from './camera-selection.js'

/**
 * A helper type to apply to a complete `CompanionActionDefinitions` for an
 * action ID enum.
 */
export type ActionDefinitions<ActionId extends string> = Record<ActionId, CompanionActionDefinition>

/** All module action IDs. */
export type AvkansLv20nActionId =
	| CustomCommandActionId
	| ExposureActionId
	| FocusActionId
	| OSDActionId
	| PanTiltActionId
	| PowerActionId
	| PresetActionId
	| WhiteBalanceActionId
	| ZoomActionId
	| Lv20nCatalogActionId
	| Lv20nInquiryActionId
	| CameraSelectionActionId
