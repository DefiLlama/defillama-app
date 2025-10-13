import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import type { ISearchItem } from '~/components/Search/types'

interface IProps {
	options: ISearchItem[]
	currentChain: string
	handleClick: React.Dispatch<any>
}

export function BridgeChainSelector({ options, currentChain, handleClick }: IProps) {
	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)
	const matches = React.useMemo(() => {
		if (!deferredSearchValue) return options
		return matchSorter(options, deferredSearchValue, {
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [options, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	const comboboxRef = React.useRef<HTMLDivElement>(null)

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
			setValue={(value) => {
				React.startTransition(() => {
					setSearchValue(value)
				})
			}}
		>
			<Ariakit.SelectProvider
				value={currentChain}
				setValue={(values) => {
					handleClick(values)
				}}
			>
				<Ariakit.Select className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) p-2 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
					{currentChain}
					<Ariakit.SelectArrow className="ml-auto" />
				</Ariakit.Select>
				<Ariakit.SelectPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="max-sm:drawer z-10 flex h-[calc(100dvh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60dvh] lg:h-full lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
				>
					<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.PopoverDismiss>

					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="m-3 mb-0 rounded-md bg-white px-3 py-1 text-base dark:bg-black"
					/>

					{matches.length > 0 ? (
						<>
							<Ariakit.ComboboxList ref={comboboxRef}>
								{matches.slice(0, viewableMatches).map((option) => (
									<Ariakit.SelectItem
										key={`bridge-chain-${option.name}`}
										value={option.name}
										className="group flex shrink-0 cursor-pointer items-center gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
										render={<Ariakit.ComboboxItem />}
									>
										<span>{option.name}</span>
									</Ariakit.SelectItem>
								))}
								{matches.length > viewableMatches ? (
									<Ariakit.ComboboxItem
										value="__see_more__"
										setValueOnClick={false}
										hideOnClick={false}
										className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
										onClick={handleSeeMore}
									>
										See more...
									</Ariakit.ComboboxItem>
								) : null}
							</Ariakit.ComboboxList>
						</>
					) : (
						<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
					)}
				</Ariakit.SelectPopover>
			</Ariakit.SelectProvider>
		</Ariakit.ComboboxProvider>
	)
}
