import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '../Icon'
import { NestedMenu, NestedMenuItem } from '../NestedMenu'
import { Tooltip } from '../Tooltip'
import { updateQueryFromSelected } from './query'
import type { ExcludeQueryKey, SelectValues, SelectTriggerVariant } from './types'
import { SELECT_TRIGGER_VARIANTS } from './types'

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
	const router = useRouter()
	const valuesAreAnArrayOfStrings = typeof allValues[0] === 'string'

	// Helper to extract keys from allValues
	const getAllKeys = React.useCallback(() => allValues.map((v) => (typeof v === 'string' ? v : v.key)), [allValues])

	// If includeQueryKey is provided, use URL-based functions; otherwise derive from setSelectedValues
	const setSelectedValues = includeQueryKey
		? (values: string[] | string) =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), values, defaultSelectedValues)
		: setSelectedValuesProp
	const clearAll = includeQueryKey
		? () =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), 'None', defaultSelectedValues)
		: () => setSelectedValuesProp([])
	const toggleAll = includeQueryKey
		? () =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), null, defaultSelectedValues)
		: () => setSelectedValuesProp(getAllKeys())
	const selectOnlyOne = includeQueryKey
		? (value: string) =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), [value], defaultSelectedValues)
		: (value: string) => setSelectedValuesProp([value])
	const toggleMultiValue = (value: string) => {
		const currentValues = Array.isArray(selectedValues) ? selectedValues : selectedValues ? [selectedValues] : []
		if (currentValues.includes(value)) {
			setSelectedValues(currentValues.filter((currentValue) => currentValue !== value))
			return
		}
		setSelectedValues([...currentValues, value])
	}

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
							render={
								<Ariakit.SelectItem
									value={valuesAreAnArrayOfStrings ? option : option.key}
									setValueOnClick={!showCheckboxes}
									hideOnClick={!showCheckboxes}
									onClick={
										showCheckboxes
											? (event) => {
													event.preventDefault()
													event.stopPropagation()
													toggleMultiValue(valuesAreAnArrayOfStrings ? option : option.key)
												}
											: undefined
									}
								/>
							}
							hideOnClick={false}
							className="flex shrink-0 cursor-pointer items-center justify-start gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
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
								<Ariakit.SelectItemCheck className="ml-auto flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
							) : (
								<Ariakit.SelectItemCheck className="ml-auto" />
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
								setValueOnClick={!showCheckboxes}
								hideOnClick={!showCheckboxes}
								onClick={
									showCheckboxes
										? (event) => {
												event.preventDefault()
												event.stopPropagation()
												toggleMultiValue(valuesAreAnArrayOfStrings ? option : option.key)
											}
										: undefined
								}
								className="group flex shrink-0 cursor-pointer items-center justify-start gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
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
									<Ariakit.SelectItemCheck className="ml-auto" />
								) : (
									<Ariakit.SelectItemCheck className="ml-auto flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
								)}
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
