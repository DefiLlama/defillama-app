import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import * as React from 'react'
import { NestedMenu, NestedMenuItem } from './NestedMenu'
import { Tooltip } from './Tooltip'
import { Icon } from './Icon'

interface ISelectWithCombobox {
	allValues:
		| Array<{ key: string; name: string; help?: string; isCustom?: boolean; customIndex?: number }>
		| Array<string>
	selectedValues: Array<string>
	setSelectedValues: React.Dispatch<React.SetStateAction<Array<string>>>
	label: string
	clearAll?: () => void
	toggleAll?: () => void
	selectOnlyOne?: (value: string) => void
	nestedMenu?: boolean
	labelType?: 'regular' | 'smol' | 'none'
	triggerProps?: Ariakit.SelectProps
	customFooter?: React.ReactNode
	onEditCustomColumn?: (idx: number) => void
	onDeleteCustomColumn?: (idx: number) => void
	portal?: boolean
}

export function SelectWithCombobox({
	allValues,
	selectedValues,
	setSelectedValues,
	label,
	clearAll,
	toggleAll,
	selectOnlyOne,
	nestedMenu,
	labelType,
	triggerProps,
	customFooter,
	onEditCustomColumn,
	onDeleteCustomColumn,
	portal
}: ISelectWithCombobox) {
	const [searchValue, setSearchValue] = React.useState('')

	const valuesAreAnArrayOfStrings = typeof allValues[0] === 'string'

	const matches = React.useMemo(() => {
		if (valuesAreAnArrayOfStrings) {
			return matchSorter(allValues as Array<string>, searchValue, {
				baseSort: (a, b) => (a.index < b.index ? -1 : 1),
				threshold: matchSorter.rankings.CONTAINS
			})
		}

		return matchSorter(allValues as Array<{ name: string }>, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [valuesAreAnArrayOfStrings, allValues, searchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

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
					}}
				>
					<NestedMenu label={label} render={<Ariakit.Select />}>
						<Ariakit.Combobox
							placeholder="Search..."
							autoFocus
							className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
						/>
						{clearAll || toggleAll ? (
							<span className="sticky z-1 top-0 flex flex-wrap justify-between gap-1 bg-(--bg1) text-(--link) text-xs border-b border-(--form-control-border)">
								{clearAll ? (
									<button onClick={clearAll} className="p-3">
										Clear
									</button>
								) : null}
								{toggleAll ? (
									<button onClick={toggleAll} className="p-3">
										Toggle all
									</button>
								) : null}
							</span>
						) : null}
						{matches.slice(0, viewableMatches + 1).map((option) => (
							<NestedMenuItem
								key={valuesAreAnArrayOfStrings ? option : option.key}
								render={<Ariakit.SelectItem value={valuesAreAnArrayOfStrings ? option : option.key} />}
								hideOnClick={false}
								className="flex items-center justify-between gap-4 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer last-of-type:rounded-b-md border-b border-(--form-control-border)"
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
								<Ariakit.SelectItemCheck className="h-3 w-3 flex items-center justify-center rounded-xs shrink-0 border border-[#28a2b5]" />
							</NestedMenuItem>
						))}
						{matches.length > viewableMatches ? (
							<button
								className="w-full py-4 px-3 text-(--link) hover:bg-(--bg2) focus-visible:bg-(--bg2)"
								onClick={() => setViewableMatches((prev) => prev + 20)}
							>
								See more...
							</button>
						) : null}
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
				}}
			>
				<Ariakit.Select
					className="bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer text-(--text1) flex-nowrap"
					{...triggerProps}
				>
					{labelType === 'smol' ? (
						<span className="flex items-center gap-1">
							<span className="text-[10px] -my-2 rounded-full min-w-4 flex items-center justify-center border border-(--form-control-border) p-px">
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
					className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
					portal={portal || false}
				>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md text-base py-1 px-3 m-3 mb-0"
					/>

					{matches.length > 0 ? (
						<>
							{clearAll || toggleAll ? (
								<span className="sticky z-1 top-0 flex flex-wrap justify-between gap-1 bg-(--bg1) text-(--link) text-xs border-b border-(--form-control-border)">
									{clearAll ? (
										<button onClick={clearAll} className="p-3">
											Clear
										</button>
									) : null}
									{toggleAll ? (
										<button onClick={toggleAll} className="p-3">
											Toggle all
										</button>
									) : null}
								</span>
							) : null}
							<Ariakit.ComboboxList>
								{matches.slice(0, viewableMatches + 1).map((option) => {
									const isCustom = typeof option === 'object' && option.isCustom
									return (
										<Ariakit.SelectItem
											key={`${label}-${valuesAreAnArrayOfStrings ? option : option.key}`}
											value={valuesAreAnArrayOfStrings ? option : option.key}
											className="group flex items-center gap-2 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer last-of-type:rounded-b-md border-b border-(--form-control-border)"
											render={<Ariakit.ComboboxItem />}
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
											{isCustom && typeof option.customIndex === 'number' && (
												<span className="flex gap-1 ml-2">
													<button
														type="button"
														tabIndex={-1}
														className="p-1 rounded-sm hover:bg-(--btn-hover-bg)"
														onClick={(e) => {
															e.stopPropagation()
															onEditCustomColumn && onEditCustomColumn(option.customIndex!)
														}}
														title="Edit custom column"
													>
														<Icon name="settings" height={14} width={14} />
													</button>
													<button
														type="button"
														tabIndex={-1}
														className="p-1 rounded-sm hover:bg-red-100 dark:hover:bg-red-900"
														onClick={(e) => {
															e.stopPropagation()
															onDeleteCustomColumn && onDeleteCustomColumn(option.customIndex!)
														}}
														title="Delete custom column"
													>
														<Icon name="trash-2" height={14} width={14} />
													</button>
												</span>
											)}
											{selectOnlyOne ? (
												<button
													onClick={(e) => {
														e.stopPropagation()
														selectOnlyOne(valuesAreAnArrayOfStrings ? option : option.key)
													}}
													className="font-medium text-xs text-(--link) underline hidden group-hover:inline-block group-focus-visible:inline-block"
												>
													Only
												</button>
											) : null}
											<Ariakit.SelectItemCheck className="ml-auto h-3 w-3 flex items-center justify-center rounded-xs shrink-0 border border-[#28a2b5]" />
										</Ariakit.SelectItem>
									)
								})}
							</Ariakit.ComboboxList>
							{matches.length > viewableMatches ? (
								<button
									className="w-full py-4 px-3 text-(--link) hover:bg-(--bg2) focus-visible:bg-(--bg2)"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
							{customFooter ? (
								<div className="mt-2 border-t border-(--form-control-border) pt-2">{customFooter}</div>
							) : null}
						</>
					) : (
						<p className="text-(--text1) py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.SelectPopover>
			</Ariakit.SelectProvider>
		</Ariakit.ComboboxProvider>
	)
}
