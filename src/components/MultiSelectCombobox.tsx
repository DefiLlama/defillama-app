import { startTransition, useDeferredValue, useMemo, useRef, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Icon } from './Icon'

export const MultiSelectCombobox = ({
	data,
	placeholder,
	selectedValues,
	setSelectedValues
}: {
	data: Array<{ label: string; value: string; logo?: string }>
	placeholder: string
	selectedValues: string[]
	setSelectedValues: (values: string[]) => void
}) => {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const matches = useMemo(() => {
		if (!deferredSearchValue) return data

		return matchSorter(data, deferredSearchValue, {
			keys: ['label'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [data, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(10)

	const [open, setOpen] = useState(false)

	const comboboxRef = useRef<HTMLDivElement>(null)

	const handleSeeMore = () => {
		const previousCount = viewableMatches
		setViewableMatches((prev) => prev + 20)

		// Focus on the first newly loaded item after a brief delay
		setTimeout(() => {
			const items = comboboxRef.current?.querySelectorAll('[role="option"]')
			if (items && items.length > previousCount) {
				const firstNewItem = items[previousCount] as HTMLElement
				firstNewItem?.focus()
			}
		}, 0)
	}

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			selectedValue={selectedValues}
			setSelectedValue={setSelectedValues}
			setValue={(value) => {
				startTransition(() => {
					setSearchValue(value)
				})
			}}
			open={open}
			setOpen={setOpen}
		>
			<span className="relative flex w-full flex-1 flex-wrap items-center gap-1 rounded-md border-2 border-transparent focus-within:border-2 focus-within:border-(--primary)">
				{selectedValues.length > 0 ? (
					<div className="flex flex-wrap items-center gap-1 pl-1">
						{selectedValues.map((value) => (
							<button
								key={`mutliselectcombobox-selected-${value}`}
								className="flex items-center gap-1 rounded-md border-(--old-blue) bg-(--link-button) p-1.5 text-xs font-medium hover:bg-(--link-button-hover)"
								onClick={() => {
									setSelectedValues(selectedValues.filter((v) => v !== value))
								}}
							>
								<span>{value}</span>
								<Icon name="x" className="h-3 w-3" />
							</button>
						))}
					</div>
				) : null}
				<Ariakit.Combobox placeholder={placeholder} className="w-full flex-1 px-3 py-2 text-base outline-none" />
				{open ? (
					<Icon name="x" className="absolute top-0 right-2 bottom-0 my-auto h-4 w-4" />
				) : (
					<Icon name="chevron-down" className="absolute top-0 right-2 bottom-0 my-auto h-4 w-4" />
				)}
			</span>
			<Ariakit.ComboboxPopover
				unmountOnHide
				hideOnInteractOutside
				preventBodyScroll
				gutter={6}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="max-sm:drawer z-10 flex h-[calc(100dvh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60dvh] lg:h-full lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
				portal
				sameWidth
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				<span className="relative mb-2 p-3">
					<input
						placeholder="Search..."
						className="w-full rounded-md bg-white px-3 py-1 text-base dark:bg-black"
						onChange={(e) => {
							startTransition(() => {
								setSearchValue(e.target.value)
							})
						}}
					/>
				</span>

				<Ariakit.ComboboxList ref={comboboxRef}>
					{matches.slice(0, viewableMatches).map((item) => (
						<Ariakit.ComboboxItem
							key={`multi-select-${item.value}`}
							value={item.value}
							hideOnClick
							className="group flex shrink-0 cursor-pointer items-center gap-2 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							{item.logo ? <img src={item.logo} alt={item.label} className="h-5 w-5 shrink-0 rounded-full" /> : null}
							<span>{item.label}</span>
							<Ariakit.ComboboxItemCheck />
						</Ariakit.ComboboxItem>
					))}
					{matches.length > viewableMatches ? (
						<Ariakit.ComboboxItem
							value="__see_more__"
							setValueOnClick={false}
							selectValueOnClick={false}
							hideOnClick={false}
							className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
							onClick={handleSeeMore}
						>
							See more...
						</Ariakit.ComboboxItem>
					) : null}
				</Ariakit.ComboboxList>
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}
