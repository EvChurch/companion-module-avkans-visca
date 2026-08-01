import type { CommandBytes } from '../visca/command.js'

export interface Lv20nParameterChoice {
	readonly value: number
	readonly label: string
}

export interface Lv20nCommandParameter {
	readonly id: string
	readonly label: string
	readonly min: number
	readonly max: number
	readonly default: number
	readonly nibbles: readonly number[]
	readonly choices?: readonly Lv20nParameterChoice[]
}

export interface Lv20nCommandSpec {
	readonly workbookRow: number
	readonly id: string
	readonly groupId: string
	readonly groupName: string
	readonly name: string
	readonly bytes: CommandBytes
	readonly parameters: readonly Lv20nCommandParameter[]
	readonly description: string
}

export interface Lv20nCommandGroup {
	readonly id: string
	readonly name: string
	readonly commands: readonly Lv20nCommandSpec[]
}

export type Lv20nCommandParameterValues = Readonly<Record<string, number>>
