import type { CompanionOptionValues, SomeCompanionActionInputField } from '@companion-module/base'
import type { ActionDefinitions } from './actionid.js'
import { lv20nCommandGroups } from '../camera/lv20n-command-catalog.js'
import { createLv20nCommand } from '../camera/lv20n-command.js'
import type { Lv20nCommandGroup, Lv20nCommandParameter } from '../camera/lv20n-types.js'
import type { AvkansLv20nInstance } from '../instance.js'

export type Lv20nCatalogActionId = `lv20n_${(typeof lv20nCommandGroups)[number]['id']}`

const CommandOptionId = 'command'

function parameterVisibility(group: Lv20nCommandGroup, parameterId: string): string | undefined {
	if (group.commands.length === 1) return undefined

	const commandIds = group.commands
		.filter((command) => command.parameters.some((parameter) => parameter.id === parameterId))
		.map((command) => command.id)
	if (commandIds.length === group.commands.length) return undefined

	return commandIds.map((commandId) => `$(options:${CommandOptionId}) == '${commandId}'`).join(' || ')
}

function parameterLabel(group: Lv20nCommandGroup, parameter: Lv20nCommandParameter): string {
	const labels = new Set(
		group.commands
			.flatMap((command) => command.parameters)
			.filter((candidate) => candidate.id === parameter.id)
			.map((candidate) => candidate.label),
	)
	return labels.size === 1
		? parameter.label
		: parameter.id.replaceAll('_', ' ').replace(/^./, (initial) => initial.toUpperCase())
}

function parameterOption(group: Lv20nCommandGroup, parameter: Lv20nCommandParameter): SomeCompanionActionInputField {
	const isVisibleExpression = parameterVisibility(group, parameter.id)
	const label = parameterLabel(group, parameter)
	if (parameter.choices !== undefined) {
		return {
			type: 'dropdown',
			id: parameter.id,
			label,
			choices: parameter.choices.map(({ value, label }) => ({ id: value, label })),
			default: parameter.default,
			...(isVisibleExpression !== undefined ? { isVisibleExpression } : {}),
		}
	}

	return {
		type: 'number',
		id: parameter.id,
		label,
		min: parameter.min,
		max: parameter.max,
		default: parameter.default,
		...(isVisibleExpression !== undefined ? { isVisibleExpression } : {}),
	}
}

function groupOptions(group: Lv20nCommandGroup): SomeCompanionActionInputField[] {
	const options: SomeCompanionActionInputField[] = []
	if (group.commands.length > 1) {
		options.push({
			type: 'dropdown',
			id: CommandOptionId,
			label: 'Command',
			choices: group.commands.map((command) => ({
				id: command.id,
				label: command.name,
			})),
			default: group.commands[0].id,
		})
	}

	const parameters = new Map<string, Lv20nCommandParameter>()
	for (const command of group.commands) {
		for (const parameter of command.parameters) {
			parameters.set(parameter.id, parameters.get(parameter.id) ?? parameter)
		}
	}
	for (const parameter of parameters.values()) {
		options.push(parameterOption(group, parameter))
	}

	return options
}

function selectedCommand(group: Lv20nCommandGroup, options: CompanionOptionValues) {
	const commandId = group.commands.length === 1 ? group.commands[0].id : String(options[CommandOptionId])
	return group.commands.find((command) => command.id === commandId) ?? group.commands[0]
}

export function lv20nCatalogActions(instance: AvkansLv20nInstance): ActionDefinitions<Lv20nCatalogActionId> {
	const actions: Partial<ActionDefinitions<Lv20nCatalogActionId>> = {}

	for (const group of lv20nCommandGroups) {
		const actionId: Lv20nCatalogActionId = `lv20n_${group.id}`
		actions[actionId] = {
			name: `Camera control: ${group.name}`,
			description: `Control ${group.name.toLowerCase()} on the selected camera.`,
			options: groupOptions(group),
			callback: async ({ options }) => {
				const command = selectedCommand(group, options)
				const parameterValues = Object.fromEntries(
					command.parameters.map((parameter) => [parameter.id, Number(options[parameter.id])]),
				)

				try {
					await instance.sendCommandAndRefresh(group.id, createLv20nCommand(command, parameterValues))
				} catch (error) {
					instance.log(
						'error',
						`Unable to build LV20N ${group.name} / ${command.name} command: ${error instanceof Error ? error.message : error}`,
					)
				}
			},
		}
	}

	return actions as ActionDefinitions<Lv20nCatalogActionId>
}
