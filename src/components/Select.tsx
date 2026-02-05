import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import * as React from 'react'
import { Icon } from './Icon'
import { NestedMenu, NestedMenuItem } from './NestedMenu'
import type { ExcludeQueryKey, SelectValues, SelectTriggerVariant } from './selectTypes'
import { SELECT_TRIGGER_VARIANTS } from './selectTypes'
import { Tooltip } from './Tooltip'

// URL update helpers - used when includeQueryKey/excludeQueryKey is provided
// Encoding:
// - missing include+exclude => "all selected" (default)
// - include="None" => "none selected"
// - include=[...] or include="..." => explicit include selection(s)
// - exclude=[...] or exclude="..." => start from all, then remove excludes
const updateQueryFromSelected = (
	includeKey: string,
	excludeKey: ExcludeQueryKey,
	allKeys: string[],
	values: string[] | string | 'None' | null,
	defaultSelectedValues?: string[]
) => {
	const nextQuery: Record<string, any> = { ...Router.query }

	const setOrDelete = (key: string, value: string | string[] | null) => {
		if (value === null) delete nextQuery[key]
		else nextQuery[key] = value
	}

	const validSet = new Set(allKeys)
	const defaultSelected = defaultSelectedValues ? defaultSelectedValues.filter((value) => validSet.has(value)) : null
	const defaultIsAll = !defaultSelected || defaultSelected.length === allKeys.length

	let nextValues = values

	// Select all => default (no params)
	if (nextValues === null) {
		if (defaultIsAll) {
			setOrDelete(includeKey, null)
			setOrDelete(excludeKey, null)
			Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
			return
		}
		nextValues = allKeys
	}

	// None selected => explicit sentinel (and clear excludes)
	if (nextValues === 'None' || (Array.isArray(nextValues) && nextValues.length === 0)) {
		setOrDelete(includeKey, 'None')
		setOrDelete(excludeKey, null)
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
		return
	}

	// Single-select value: always write include="..."
	if (typeof nextValues === 'string') {
		if (defaultSelected?.length === 1 && defaultSelected[0] === nextValues) {
			setOrDelete(includeKey, null)
			setOrDelete(excludeKey, null)
			Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
			return
		}
		setOrDelete(includeKey, nextValues)
		setOrDelete(excludeKey, null)
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
		return
	}

	const selected = nextValues.filter((v) => validSet.has(v))
	const selectedSet = new Set(selected)

	// Default selection => no params
	const defaultSelection = defaultSelected ?? allKeys
	const defaultSelectionSet = new Set(defaultSelection)
	const isDefaultSelection =
		selected.length === defaultSelection.length && selected.every((value) => defaultSelectionSet.has(value))
	if (isDefaultSelection) {
		setOrDelete(includeKey, null)
		setOrDelete(excludeKey, null)
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
		return
	}

	const excluded = allKeys.filter((k) => !selectedSet.has(k))

	// Prefer whichever is shorter; if user deselects only a few from mostly-all, this flips to excludeKey
	const useExclude = excluded.length > 0 && excluded.length < selected.length

	if (useExclude) {
		setOrDelete(includeKey, null) // completely remove includeKey when using excludeKey
		setOrDelete(excludeKey, excluded.length === 1 ? excluded[0] : excluded)
	} else {
		setOrDelete(excludeKey, null)
		setOrDelete(includeKey, selected.length === 1 ? selected[0] : selected)
	}

	Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
}

interface ISelectBase {
	allValues: SelectValues
	selectedValues: Array<string> | string
	label: React.ReactNode
	nestedMenu?: boolean
	labelType?: 'regular' | 'smol' | 'none'
	variant?: SelectTriggerVariant
	triggerProps?: Ariakit.SelectProps
	portal?: boolean
	placement?: Ariakit.SelectProviderProps['placement']
	defaultSelectedValues?: string[]
}

interface ISelectWithUrlParams extends ISelectBase {
	includeQueryKey: string
	excludeQueryKey: ExcludeQueryKey
	defaultSelectedValues?: string[]
	setSelectedValues?: never
}

interface ISelectWithState extends ISelectBase {
	includeQueryKey?: never
	excludeQueryKey?: never
	setSelectedValues: React.Dispatch<React.SetStateAction<Array<string> | string>>
}

type ISelect = ISelectWithUrlParams | ISelectWithState

export function Select({
	allValues,
	selectedValues,
	setSelectedValues: setSelectedValuesProp,
	label,
	nestedMenu,
	labelType = 'regular',
	variant,
	triggerProps,
	portal,
	placement = 'bottom-start',
	includeQueryKey,
	excludeQueryKey,
	defaultSelectedValues
}: ISelect) {
	const valuesAreAnArrayOfStrings = typeof allValues[0] === 'string'

	// Helper to extract keys from allValues
	const getAllKeys = React.useCallback(() => allValues.map((v) => (typeof v === 'string' ? v : v.key)), [allValues])

	// If includeQueryKey is provided, use URL-based functions; otherwise derive from setSelectedValues
	const setSelectedValues = includeQueryKey
		? (values: string[] | string) =>
				updateQueryFromSelected(includeQueryKey, excludeQueryKey!, getAllKeys(), values, defaultSelectedValues)
		: setSelectedValuesProp
	const clearAll = includeQueryKey
		? () => updateQueryFromSelected(includeQueryKey, excludeQueryKey!, getAllKeys(), 'None', defaultSelectedValues)
		: () => setSelectedValuesProp([])
	const toggleAll = includeQueryKey
		? () => updateQueryFromSelected(includeQueryKey, excludeQueryKey!, getAllKeys(), null, defaultSelectedValues)
		: () => setSelectedValuesProp(getAllKeys())
	const selectOnlyOne = includeQueryKey
		? (value: string) =>
				updateQueryFromSelected(includeQueryKey, excludeQueryKey!, getAllKeys(), [value], defaultSelectedValues)
		: (value: string) => setSelectedValuesProp([value])

	const [viewableMatches, setViewableMatches] = React.useState(6)

	const canSelectOnlyOne = typeof selectedValues === 'string'
	const showCheckboxes = !canSelectOnlyOne
	const selectedCount = canSelectOnlyOne ? (selectedValues ? 1 : 0) : selectedValues.length

	const selectRef = React.useRef<HTMLDivElement>(null)

	const handleSeeMore = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		const previousCount = viewableMatches
		setViewableMatches((prev) => prev + 20)

		// Focus on the first newly loaded item after a brief delay
		setTimeout(() => {
			const items = selectRef.current?.querySelectorAll('[role="option"]')
			if (items && items.length > previousCount) {
				const firstNewItem = items[previousCount] as HTMLElement
				firstNewItem?.focus()
			}
		}, 0)
	}

	if (nestedMenu) {
		return (
			<Ariakit.SelectProvider
				value={selectedValues}
				setValue={(values) => {
					setSelectedValues(values)
				}}
			>
				<NestedMenu label={label} render={<Ariakit.Select />}>
					{showCheckboxes ? (
						<span className="sticky top-0 z-1 flex flex-wrap justify-between gap-1 border-b border-(--form-control-border) bg-(--bg-main) text-xs text-(--link)">
							<button onClick={clearAll} className="p-3">
								Deselect All
							</button>
							<button onClick={toggleAll} className="p-3">
								Select All
							</button>
						</span>
					) : null}
					{allValues.slice(0, viewableMatches).map((option) => (
						<NestedMenuItem
							key={valuesAreAnArrayOfStrings ? option : option.key}
							render={<Ariakit.SelectItem value={valuesAreAnArrayOfStrings ? option : option.key} />}
							hideOnClick={false}
							className="flex shrink-0 cursor-pointer items-center justify-between gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							{valuesAreAnArrayOfStrings ? (
								<span>{option}</span>
							) : option.help ? (
								<Tooltip content={option.help}>
									<span className="mr-1">{option.name}</span>
									<Icon name="help-circle" height={15} width={15} />
								</Tooltip>
							) : (
								<span>{option.name}</span>
							)}
							{showCheckboxes ? (
								<Ariakit.SelectItemCheck className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
							) : (
								<Ariakit.SelectItemCheck />
							)}
						</NestedMenuItem>
					))}
					{allValues.length > viewableMatches ? (
						<Ariakit.SelectItem
							value="__see_more__"
							setValueOnClick={false}
							hideOnClick={false}
							className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								setViewableMatches((prev) => prev + 20)
							}}
						>
							See more...
						</Ariakit.SelectItem>
					) : null}
				</NestedMenu>
			</Ariakit.SelectProvider>
		)
	}

	return (
		<Ariakit.SelectProvider
			value={selectedValues}
			setValue={(values) => {
				setSelectedValues(values)
			}}
			placement={placement}
		>
			<Ariakit.Select
				className={SELECT_TRIGGER_VARIANTS[variant ?? 'default']}
				aria-label={`${label} dropdown`}
				{...triggerProps}
			>
				{labelType === 'smol' ? (
					<span className="flex items-center gap-1">
						<span className="flex min-w-4 items-center justify-center rounded-full border border-(--form-control-border) px-1 py-0.25 text-[10px] leading-none">
							{selectedCount}
						</span>
						<span>{label}</span>
					</span>
				) : labelType === 'regular' && selectedCount > 0 ? (
					<>
						<span>{label}: </span>
						<span className="text-(--link)">
							{canSelectOnlyOne
								? selectedValues
								: selectedValues.length > 2
									? `${selectedValues[0]} + ${selectedValues.length - 1} others`
									: selectedValues.join(', ')}
						</span>
					</>
				) : (
					<>{label}</>
				)}
				<Ariakit.SelectArrow />
			</Ariakit.Select>
			<Ariakit.SelectPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="z-10 flex min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:h-[calc(100dvh-80px)] max-sm:drawer max-sm:rounded-b-none sm:max-h-[min(400px,60dvh)] lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
				portal={portal || false}
				ref={selectRef}
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				{allValues.length > 0 ? (
					<>
						{showCheckboxes ? (
							<span className="sticky top-0 z-1 flex flex-wrap justify-between gap-1 border-b border-(--form-control-border) bg-(--bg-main) text-xs text-(--link)">
								<button onClick={clearAll} className="p-3">
									Deselect All
								</button>
								<button onClick={toggleAll} className="p-3">
									Select All
								</button>
							</span>
						) : null}

						{allValues.slice(0, viewableMatches).map((option) => (
							<Ariakit.SelectItem
								key={`${label}-${valuesAreAnArrayOfStrings ? option : option.key}`}
								value={valuesAreAnArrayOfStrings ? option : option.key}
								className="group flex shrink-0 cursor-pointer items-center justify-between gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
							>
								{valuesAreAnArrayOfStrings ? (
									<span>{option}</span>
								) : option.help ? (
									<Tooltip content={option.help}>
										<span className="mr-1">{option.name}</span>
										<Icon name="help-circle" height={15} width={15} />
									</Tooltip>
								) : (
									<span>{option.name}</span>
								)}
								<div className="flex items-center gap-2">
									{showCheckboxes ? (
										<button
											onClick={(e) => {
												e.stopPropagation()
												selectOnlyOne(valuesAreAnArrayOfStrings ? option : option.key)
											}}
											className="invisible text-xs font-medium text-(--link) underline group-hover:visible group-focus-visible:visible"
										>
											Only
										</button>
									) : null}
									{canSelectOnlyOne ? (
										<Ariakit.SelectItemCheck />
									) : (
										<Ariakit.SelectItemCheck className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
									)}
								</div>
							</Ariakit.SelectItem>
						))}
						{allValues.length > viewableMatches ? (
							<Ariakit.SelectItem
								value="__see_more__"
								setValueOnClick={false}
								hideOnClick={false}
								className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
								onClick={handleSeeMore}
							>
								See more...
							</Ariakit.SelectItem>
						) : null}
					</>
				) : (
					<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
				)}
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
}
