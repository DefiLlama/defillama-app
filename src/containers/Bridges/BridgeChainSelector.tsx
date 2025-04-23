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

	const matches = React.useMemo(() => {
		return matchSorter(options, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [options, searchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)
	console.log({ options })
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
				<Ariakit.Select className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium z-10">
					{currentChain}
					<Ariakit.SelectArrow className="ml-auto" />
				</Ariakit.Select>
				<Ariakit.SelectPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
					}}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
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
										className="group flex items-center gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-[#E6E6E6] dark:border-[#39393E]"
										render={<Ariakit.ComboboxItem />}
									>
										<span>{option.name}</span>
									</Ariakit.SelectItem>
								))}
							</Ariakit.ComboboxList>
							{matches.length > viewableMatches ? (
								<button
									className="w-full py-4 px-3 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.SelectPopover>
			</Ariakit.SelectProvider>
		</Ariakit.ComboboxProvider>
	)
}
