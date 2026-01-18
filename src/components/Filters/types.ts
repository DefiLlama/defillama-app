export type ToggleOption<T extends string = string> = {
	name: string
	key: T
	help: string | null
}
