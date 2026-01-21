export type SelectOption = {
	key: string
	name: string
	help?: string
	isCustom?: boolean
	customIndex?: number
}

export type SelectValues = ReadonlyArray<SelectOption> | ReadonlyArray<string>

export type ExcludeQueryKey = `exclude${string}`

export type MultiSelectOption = {
	value: string
	label: string
	disabled?: boolean
	logo?: string
	isChild?: boolean
}
