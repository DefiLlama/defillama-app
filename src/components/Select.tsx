import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from './Icon'
import { NestedMenu, NestedMenuItem } from './NestedMenu'
import { Tooltip } from './Tooltip'

interface ISelect {
	allValues: ReadonlyArray<{ key: string; name: string; help?: string }> | ReadonlyArray<string>
	selectedValues: Array<string> | string
	setSelectedValues: React.Dispatch<React.SetStateAction<Array<string> | string>>
	label: React.ReactNode
	clearAll?: () => void
	toggleAll?: () => void
	selectOnlyOne?: (value: string) => void
	nestedMenu?: boolean
	labelType?: 'regular' | 'smol' | 'none'
	triggerProps?: Ariakit.SelectProps
	portal?: boolean
	placement?: Ariakit.SelectProviderProps['placement']
}

export function Select({
	allValues,
	selectedValues,
	setSelectedValues,
	label,
	clearAll,
	toggleAll,
	selectOnlyOne,
	nestedMenu,
	labelType = 'regular',
	triggerProps,
	portal,
	placement = 'bottom-start'
}: ISelect) {
	const valuesAreAnArrayOfStrings = typeof allValues[0] === 'string'

	const [viewableMatches, setViewableMatches] = React.useState(5)

	const canSelectOnlyOne = typeof selectedValues === 'string'

	const selectRef = React.useRef<HTMLDivElement>(null)

	const handleSeeMore = () => {
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
					{clearAll || toggleAll ? (
						<span className="sticky top-0 z-1 flex flex-wrap justify-between gap-1 border-b border-(--form-control-border) bg-(--bg-main) text-xs text-(--link)">
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
					{allValues.slice(0, viewableMatches + 1).map((option) => (
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
							<Ariakit.SelectItemCheck className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
						</NestedMenuItem>
					))}
					{allValues.length > viewableMatches ? (
						<Ariakit.SelectItem
							value="__see_more__"
							setValueOnClick={false}
							hideOnClick={false}
							className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
							onClick={() => setViewableMatches((prev) => prev + 20)}
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
				className="flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)"
				aria-label={`${label} dropdown`}
				{...triggerProps}
			>
				{labelType === 'smol' ? (
					<span className="flex items-center gap-1">
						<span className="text-2.5 flex min-w-4 items-center justify-center rounded-full border border-(--form-control-border) px-1 py-0.25 leading-none">
							{selectedValues.length}
						</span>
						<span>{label}</span>
					</span>
				) : labelType === 'regular' && selectedValues.length > 0 ? (
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
				className="max-sm:drawer z-10 flex h-[calc(100vh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] lg:h-full lg:max-h-[var(--popover-available-height)] dark:border-[hsl(204,3%,32%)]"
				portal={portal || false}
				ref={selectRef}
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				{allValues.length > 0 ? (
					<>
						{clearAll || toggleAll ? (
							<span className="sticky top-0 z-1 flex flex-wrap justify-between gap-1 border-b border-(--form-control-border) bg-(--bg-main) text-xs text-(--link)">
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

						{allValues.slice(0, viewableMatches + 1).map((option) => (
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
									{selectOnlyOne ? (
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
