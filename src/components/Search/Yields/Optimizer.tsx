import * as React from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { matchSorter } from 'match-sorter'
import * as Ariakit from '@ariakit/react'

export function YieldsSearch({ lend = false, searchData, value }) {
	const [searchValue, setSearchValue] = React.useState('')

	const matches = React.useMemo(() => {
		return matchSorter(
			Object.values(searchData) as Array<{ name: string; symbol: string; logo?: string; fallbackLogo?: string }>,
			searchValue,
			{
				baseSort: (a, b) => (a.index < b.index ? -1 : 1),
				keys: ['name', 'symbol'],
				threshold: matchSorter.rankings.CONTAINS
			}
		)
	}, [searchData, searchValue])

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
						className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
					}}
					className="flex flex-col bg-[var(--bg1)] rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] max-sm:h-[70vh] sm:max-h-[60vh]"
				>
					<input
						placeholder={lend ? 'Collateral Token' : 'Token to Borrow'}
						onChange={(e) => {
							setSearchValue?.(e.target.value)
						}}
						className="p-4 mb-4 rounded-md text-sm bg-white text-black dark:bg-[#22242a] dark:text-white border border-black/10 dark:border-white/10 sm:hidden"
					/>
					{matches.length ? (
						<>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Row key={option.name} data={option} lend={lend} setOpen={setOpen} />
							))}

							{matches.length > viewableMatches ? (
								<button
									className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
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
			<button onClick={(prev) => setOpen(!prev)} className="absolute top-[10px] left-[6px] opacity-50">
				{open ? (
					<>
						<span className="sr-only">Close Search</span>
						<Icon name="x" height={20} width={20} />
					</>
				) : (
					<>
						<span className="sr-only">Open Search</span>
						<Icon name="search" height={18} width={18} />
					</>
				)}
			</button>

			<Ariakit.Combobox
				placeholder={placeholder}
				autoSelect
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="p-2 pl-8 rounded-md text-sm bg-white text-black dark:bg-[#22242a] dark:text-white border border-black/10 dark:border-white/10"
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
			className="p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] aria-disabled:opacity-50 outline-none"
		>
			{data?.logo || data?.fallbackLogo ? <TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} /> : null}
			<span>{data.symbol === 'USD_Stables' ? 'All USD Stablecoins' : `${data.name}`}</span>
			{loading ? (
				<svg
					className="animate-spin -ml-1 mr-3 h-4 w-4"
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
