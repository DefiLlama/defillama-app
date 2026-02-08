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

export const SELECT_TRIGGER_VARIANTS = {
	default:
		'flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)',
	filter:
		'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium',
	'filter-responsive':
		'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto',
	pro: 'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
} as const

export type SelectTriggerVariant = keyof typeof SELECT_TRIGGER_VARIANTS

export const TAG_GROUP_VARIANTS = {
	default: {
		container:
			'flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)',
		button:
			'shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:hover:bg-transparent data-[active=true]:bg-(--old-blue) data-[active=true]:text-white'
	},
	responsive: {
		container:
			'flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) max-sm:w-full',
		button:
			'inline-flex max-sm:flex-1 items-center justify-center shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:hover:bg-transparent data-[active=true]:bg-(--old-blue) data-[active=true]:text-white'
	},
	pro: {
		container: 'text-sm flex items-center overflow-x-auto flex-nowrap w-fit border pro-border pro-text1',
		button:
			'shrink-0 px-3 py-1.5 whitespace-nowrap hover:pro-bg2 focus-visible:pro-bg2 data-[active=true]:bg-(--primary) data-[active=true]:text-white'
	}
} as const

export type TagGroupVariant = keyof typeof TAG_GROUP_VARIANTS
