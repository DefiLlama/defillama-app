import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { useRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { NestedMenu, NestedMenuItem } from '~/components/NestedMenu'
import { Tooltip } from '~/components/Tooltip'
import { updateQueryFromSelected } from './query'
import type { ExcludeQueryKey, SelectOption, SelectTriggerVariant, SelectValues } from './types'
import { SELECT_TRIGGER_VARIANTS } from './types'

interface ISelectWithComboboxBase {
	allValues: SelectValues
	selectedValues: Array<string>
	label: string
	nestedMenu?: boolean
	labelType?: 'regular' | 'smol' | 'none'
	variant?: SelectTriggerVariant
	triggerProps?: Ariakit.SelectProps
	customFooter?: React.ReactNode
	onEditCustomColumn?: (idx: number) => void
	onDeleteCustomColumn?: (idx: number) => void
	portal?: boolean
	onValuesChange?: (values: string[], label: string) => void
	defaultSelectedValues?: string[]
}

interface ISelectWithComboboxUrlParams extends ISelectWithComboboxBase {
	includeQueryKey: string
	excludeQueryKey: ExcludeQueryKey
	defaultSelectedValues?: string[]
	setSelectedValues?: never
}

interface ISelectWithComboboxState extends ISelectWithComboboxBase {
	includeQueryKey?: never
	excludeQueryKey?: never
	setSelectedValues: React.Dispatch<React.SetStateAction<Array<string>>>
}

type ISelectWithCombobox = ISelectWithComboboxUrlParams | ISelectWithComboboxState

export function SelectWithCombobox({
	allValues,
	selectedValues,
	setSelectedValues: setSelectedValuesProp,
	label,
	nestedMenu,
	labelType,
	variant,
	triggerProps,
	customFooter,
	onEditCustomColumn,
	onDeleteCustomColumn,
	portal,
	includeQueryKey,
	excludeQueryKey,
	onValuesChange,
	defaultSelectedValues
}: ISelectWithCombobox) {
	const router = useRouter()
	const valuesAreAnArrayOfStrings = typeof allValues[0] === 'string'
	const showCheckboxes = Array.isArray(selectedValues)

	const isStringValue = React.useCallback((value: string | SelectOption): value is string => {
		return typeof value === 'string'
	}, [])

	const getOptionKey = React.useCallback(
		(value: string | SelectOption) => {
			return isStringValue(value) ? value : value.key
		},
		[isStringValue]
	)
	const setSelectedValuesFromState = React.useCallback(
		(values: string[]) => {
			if (setSelectedValuesProp) {
				setSelectedValuesProp(values)
			}
		},
		[setSelectedValuesProp]
	)

	// Helper to extract keys from allValues
	const getAllKeys = React.useCallback(() => allValues.map((v) => (typeof v === 'string' ? v : v.key)), [allValues])

	// If includeQueryKey is provided, use URL-based functions; otherwise derive from setSelectedValues
	const setSelectedValues: (values: string[]) => void = includeQueryKey
		? (values: string[]) =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), values, defaultSelectedValues)
		: setSelectedValuesFromState
	const clearAll = includeQueryKey
		? () =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), 'None', defaultSelectedValues)
		: () => setSelectedValuesFromState([])
	const toggleAll = includeQueryKey
		? () =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), null, defaultSelectedValues)
		: () => setSelectedValuesFromState(getAllKeys())
	const selectOnlyOne = includeQueryKey
		? (value: string) =>
				updateQueryFromSelected(router, includeQueryKey, excludeQueryKey!, getAllKeys(), [value], defaultSelectedValues)
		: (value: string) => setSelectedValuesFromState([value])

	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)

	const matches = React.useMemo(() => {
		if (!deferredSearchValue) return allValues

		if (valuesAreAnArrayOfStrings) {
			return matchSorter(
				allValues.filter((value): value is string => typeof value === 'string'),
				deferredSearchValue,
				{
					threshold: matchSorter.rankings.CONTAINS
				}
			)
		}

		return matchSorter(
			allValues.filter((value): value is SelectOption => typeof value !== 'string'),
			deferredSearchValue,
			{
				keys: ['name'],
				threshold: matchSorter.rankings.CONTAINS
			}
		)
	}, [valuesAreAnArrayOfStrings, allValues, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	const comboboxRef = React.useRef<HTMLDivElement>(null)

	const handleSeeMore = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		const previousCount = viewableMatches
		setViewableMatches((prev) => prev + 20)

		// Focus on the first newly loaded item after a brief delay
		setTimeout(() => {
			const items = comboboxRef.current?.querySelectorAll('[role="option"]')
			if (items && items.length > previousCount) {
				const firstNewItem = items.item(previousCount)
				if (firstNewItem instanceof HTMLElement) {
					firstNewItem.focus()
				}
			}
		}, 0)
	}

	if (nestedMenu) {
		return (
			<Ariakit.ComboboxProvider
				resetValueOnHide
				setValue={(value) => {
					React.startTransition(() => {
						setSearchValue(value)
					})
				}}
			>
				<Ariakit.SelectProvider
					value={selectedValues}
					setValue={(values) => {
						setSelectedValues(values)
						onValuesChange?.(values, label)
					}}
				>
					<NestedMenu label={label} render={<Ariakit.Select />}>
						<Ariakit.Combobox
							placeholder="Search..."
							className="m-3 mb-0 rounded-md bg-white px-3 py-2 text-base dark:bg-black"
						/>
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
						<Ariakit.ComboboxList>
							{matches.slice(0, viewableMatches).map((option) => (
								<NestedMenuItem
									key={getOptionKey(option)}
									render={<Ariakit.SelectItem value={getOptionKey(option)} />}
									hideOnClick={false}
									className="flex shrink-0 cursor-pointer items-center justify-start gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
								>
									{isStringValue(option) ? (
										<span>{option}</span>
									) : !isStringValue(option) && option.help ? (
										<Tooltip content={option.help}>
											<span className="mr-1">{option.name}</span>
											<Icon name="help-circle" height={15} width={15} />
										</Tooltip>
									) : (
										<span className="inline-flex items-center gap-1.5">
											{isStringValue(option) ? option : option.name}
											{isStringValue(option) ? null : option.icon}
										</span>
									)}
									{showCheckboxes ? (
										<Ariakit.SelectItemCheck className="ml-auto flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
									) : (
										<Ariakit.SelectItemCheck className="ml-auto" />
									)}
								</NestedMenuItem>
							))}
							{matches.length > viewableMatches ? (
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
						</Ariakit.ComboboxList>
					</NestedMenu>
				</Ariakit.SelectProvider>
			</Ariakit.ComboboxProvider>
		)
	}

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				React.startTransition(() => {
					setSearchValue(value)
				})
			}}
		>
			<Ariakit.SelectProvider
				value={selectedValues}
				setValue={(values) => {
					setSelectedValues(values)
					onValuesChange?.(values, label)
				}}
			>
				<Ariakit.Select
					className={SELECT_TRIGGER_VARIANTS[variant ?? 'default']}
					aria-label={`${label} dropdown`}
					{...triggerProps}
				>
					{labelType === 'smol' ? (
						<span className="flex items-center gap-1">
							<span className="flex min-w-4 items-center justify-center rounded-full border border-(--form-control-border) px-1 py-0.25 text-[10px] leading-none">
								{selectedValues.length}
							</span>
							<span>{label}</span>
						</span>
					) : labelType === 'regular' && selectedValues.length > 0 ? (
						<>
							<span>{label}: </span>
							<span className="text-(--link)">
								{selectedValues.length > 2
									? `${selectedValues[0]} + ${selectedValues.length - 1} others`
									: selectedValues.join(', ')}
							</span>
						</>
					) : (
						<span>{label}</span>
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
				>
					<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.PopoverDismiss>

					<span className="relative mb-2 p-3">
						<Ariakit.Combobox
							placeholder="Search..."
							className="w-full rounded-md bg-white px-3 py-1 text-base dark:bg-black"
						/>
					</span>
					{matches.length > 0 ? (
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
							<Ariakit.ComboboxList ref={comboboxRef}>
								{matches.slice(0, viewableMatches).map((option) => {
									const isCustom = typeof option === 'object' && option.isCustom
									const customIndex = typeof option === 'object' ? option.customIndex : undefined
									return (
										<Ariakit.SelectItem
											key={`${label}-${getOptionKey(option)}`}
											value={getOptionKey(option)}
											className="group flex shrink-0 cursor-pointer items-center justify-start gap-2 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md last-of-type:border-b-0 hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
											render={<Ariakit.ComboboxItem />}
										>
											{isStringValue(option) ? (
												<span>{option}</span>
											) : !isStringValue(option) && option.help ? (
												<Tooltip content={option.help}>
													<span className="mr-1">{option.name}</span>
													<Icon name="help-circle" height={15} width={15} />
												</Tooltip>
											) : (
												<span className="inline-flex items-center gap-1.5">
													{isStringValue(option) ? option : option.name}
													{isStringValue(option) ? null : option.icon}
												</span>
											)}
											{isCustom && typeof customIndex === 'number' ? (
												<span className="ml-2 flex gap-1">
													<button
														type="button"
														tabIndex={-1}
														className="rounded-sm p-1 hover:bg-(--btn-hover-bg)"
														onClick={(e) => {
															e.stopPropagation()
															onEditCustomColumn?.(customIndex)
														}}
														title="Edit custom column"
													>
														<Icon name="settings" height={14} width={14} />
													</button>
													<button
														type="button"
														tabIndex={-1}
														className="rounded-sm p-1 hover:bg-red-100 dark:hover:bg-red-900"
														onClick={(e) => {
															e.stopPropagation()
															onDeleteCustomColumn?.(customIndex)
														}}
														title="Delete custom column"
													>
														<Icon name="trash-2" height={14} width={14} />
													</button>
												</span>
											) : null}
											{showCheckboxes ? (
												<button
													onClick={(e) => {
														e.stopPropagation()
														selectOnlyOne(getOptionKey(option))
													}}
													className="invisible text-xs font-medium text-(--link) underline group-hover:visible group-focus-visible:visible"
												>
													Only
												</button>
											) : null}
											{showCheckboxes ? (
												<Ariakit.SelectItemCheck className="ml-auto flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
											) : (
												<Ariakit.SelectItemCheck className="ml-auto" />
											)}
										</Ariakit.SelectItem>
									)
								})}

								{matches.length > viewableMatches ? (
									<Ariakit.SelectItem
										value="__see_more__"
										setValueOnClick={false}
										hideOnClick={false}
										className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
										onClick={handleSeeMore}
										render={<Ariakit.ComboboxItem />}
									>
										See more...
									</Ariakit.SelectItem>
								) : null}
							</Ariakit.ComboboxList>
							{customFooter ? <>{customFooter}</> : null}
						</>
					) : (
						<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
					)}
				</Ariakit.SelectPopover>
			</Ariakit.SelectProvider>
		</Ariakit.ComboboxProvider>
	)
}
