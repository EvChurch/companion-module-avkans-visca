import type {
	CompanionMigrationAction,
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
} from '@companion-module/base'
import { tryUpdateCustomCommandsWithCommandParamOptions } from './actions/custom-command.js'
import { tryUpdatePresetAndSpeedEncodingsInActions, tryUpdateRecallSetPresetActions } from './actions/presets.js'
import type { AvkansLv20nSecrets, RawConfig } from './config.js'

function ActionUpdater(
	tryUpdate: (action: CompanionMigrationAction) => boolean,
): CompanionStaticUpgradeScript<RawConfig, AvkansLv20nSecrets> {
	return (
		_context: CompanionUpgradeContext<RawConfig>,
		props: CompanionStaticUpgradeProps<RawConfig, AvkansLv20nSecrets>,
	) => {
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
] satisfies CompanionStaticUpgradeScript<RawConfig, AvkansLv20nSecrets>[]
