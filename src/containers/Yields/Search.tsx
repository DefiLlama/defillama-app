import * as React from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'

export function YieldsSearch({
	lend = false,
	searchData,
	value
}: {
	lend?: boolean
	searchData: Array<{ name: string; symbol: string; logo?: string; fallbackLogo?: string }>
	value: string
}) {
	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)

	const matches = React.useMemo(() => {
		if (!deferredSearchValue) return searchData
		return matchSorter(searchData, deferredSearchValue, {
			keys: [(item) => item.name.replace('₮', 'T'), (item) => item.symbol.replace('₮', 'T')],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [searchData, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	const [open, setOpen] = React.useState(false)

	return (
		<div className="relative flex flex-col rounded-md">
			<Ariakit.ComboboxProvider
				defaultValue={value ?? ''}
				setValue={(value) => {
					React.startTransition(() => {
						setSearchValue(value)
					})
				}}
				open={open}
				setOpen={setOpen}
			>
				<Input placeholder={lend ? 'Collateral Token' : 'Token to Borrow'} open={open} setOpen={setOpen} />
				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					sameWidth
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="max-sm:drawer z-10 flex max-h-[var(--popover-available-height)] flex-col overflow-auto overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100vh-80px)]"
				>
					<input
						placeholder={lend ? 'Collateral Token' : 'Token to Borrow'}
						onChange={(e) => {
							setSearchValue?.(e.target.value)
						}}
						className="mb-4 rounded-md border border-(--form-control-border) bg-white p-4 text-base text-black sm:hidden dark:bg-[#22242a] dark:text-white"
					/>
					{matches.length ? (
						<>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Row key={option.name} data={option} lend={lend} setOpen={setOpen} />
							))}

							{matches.length > viewableMatches ? (
								<button
									className="w-full px-4 pt-4 pb-7 text-left text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
					)}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
		</div>
	)
}

interface IInputProps {
	open: boolean
	setOpen?: React.Dispatch<React.SetStateAction<boolean>>
	placeholder: string
	autoFocus?: boolean
	withValue?: boolean
	onSearchTermChange?: (value: string) => void
}

function Input({ placeholder, onSearchTermChange, open, setOpen }: IInputProps) {
	return (
		<>
			<button onClick={(prev) => setOpen(!prev)} className="absolute top-2 left-2 opacity-50">
				{open ? (
					<>
						<span className="sr-only">Close Search</span>
						<Icon name="x" height={18} width={18} />
					</>
				) : (
					<>
						<span className="sr-only">Open Search</span>
						<Icon name="search" height={16} width={16} />
					</>
				)}
			</button>

			<Ariakit.Combobox
				placeholder={placeholder}
				autoSelect
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 pl-7 text-base text-black dark:text-white"
			/>
		</>
	)
}

const Row = ({ data, lend, setOpen }) => {
	const [loading, setLoading] = React.useState(false)
	const router = useRouter()

	const { lend: lendQuery, borrow, ...queryParams } = router.query

	const [targetParam, restParam] = lend ? ['lend', 'borrow'] : ['borrow', 'lend']

	return (
		<Ariakit.ComboboxItem
			value={data.name}
			onClick={() => {
				setLoading(true)
				router
					.push(
						{
							pathname: router.pathname,
							query: {
								[targetParam]: data.symbol,
								[restParam]: router.query[restParam] || '',
								...queryParams
							}
						},
						undefined,
						{ shallow: true }
					)
					.then(() => {
						setLoading(false)
						setOpen(false)
					})
			}}
			focusOnHover
			disabled={loading}
			className="flex cursor-pointer items-center gap-4 p-3 text-(--text-primary) outline-hidden hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:opacity-50 data-active-item:bg-(--primary-hover)"
		>
			<span>{data.symbol === 'USD_Stables' ? 'All USD Stablecoins' : `${data.name}`}</span>
			{loading ? (
				<svg
					className="mr-3 -ml-1 h-4 w-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			) : null}
		</Ariakit.ComboboxItem>
	)
}
