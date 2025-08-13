import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import type { ISearchItem } from '~/components/Search/types'
import { matchSorter } from 'match-sorter'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IProps {
	options: ISearchItem[]
	currentChain: string
	handleClick: React.Dispatch<any>
}

export function BridgeChainSelector({ options, currentChain, handleClick }: IProps) {
	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)
	const matches = React.useMemo(() => {
		return matchSorter(options, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [options, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	// return <SelectWithCombobox allValues={options} selectedValues={currentChain} setSelectedValues={handleClick} />
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
				<Ariakit.Select className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium z-10">
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
					className="flex flex-col bg-(--bg-main) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md text-base py-1 px-3 m-3 mb-0"
					/>

					{matches.length > 0 ? (
						<>
							<Ariakit.ComboboxList>
								{matches.slice(0, viewableMatches + 1).map((option) => (
									<Ariakit.SelectItem
										key={`bridge-chain-${option.name}`}
										value={option.name}
										className="group flex items-center gap-4 py-2 px-3 shrink-0 hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover) cursor-pointer last-of-type:rounded-b-md border-b border-(--form-control-border)"
										render={<Ariakit.ComboboxItem />}
									>
										<span>{option.name}</span>
									</Ariakit.SelectItem>
								))}
							</Ariakit.ComboboxList>
							{matches.length > viewableMatches ? (
								<button
									className="w-full py-4 px-3 text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="text-(--text-primary) py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.SelectPopover>
			</Ariakit.SelectProvider>
		</Ariakit.ComboboxProvider>
	)
}
