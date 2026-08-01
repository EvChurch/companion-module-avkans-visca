import type {
	CompanionMigrationAction,
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
} from '@companion-module/base'
import { tryUpdateCustomCommandsWithCommandParamOptions } from './actions/custom-command.js'
import { tryUpdatePresetAndSpeedEncodingsInActions, tryUpdateRecallSetPresetActions } from './actions/presets.js'
import type { RawConfig } from './config.js'

function ActionUpdater(
	tryUpdate: (action: CompanionMigrationAction) => boolean,
): CompanionStaticUpgradeScript<RawConfig> {
	return (_context: CompanionUpgradeContext<RawConfig>, props: CompanionStaticUpgradeProps<RawConfig>) => {
		return {
			updatedActions: props.actions.filter(tryUpdate),
			updatedConfig: null,
			updatedFeedbacks: [],
		}
	}
}

export const UpgradeScripts = [
	ActionUpdater(tryUpdateCustomCommandsWithCommandParamOptions),
	ActionUpdater(tryUpdateRecallSetPresetActions),
	ActionUpdater(tryUpdatePresetAndSpeedEncodingsInActions),
] satisfies CompanionStaticUpgradeScript<RawConfig>[]
