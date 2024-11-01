import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useDebounce } from '~/hooks/useDebounce'
import { useGetLiquidationSearchList } from '../Liquidations/hooks'
import { useGetStablecoinsSearchList } from '../Stablecoins/hooks'
import { useGetAdaptorsSearchList } from '../Adaptors/hooks'
import { useFetchNftCollectionsList } from '~/api/categories/nfts/client'
import { useInstantSearch, useSearchBox } from 'react-instantsearch'
import { useFormatDefiSearchResults } from '../ProtocolsChains/hooks'
import { SearchV2 } from '../InstantSearch'
import { Icon } from '~/components/Icon'
import { ISearchItem } from '../types'
import { TokenLogo } from '~/components/TokenLogo'

export function MobileSearch() {
	const router = useRouter()
	return (
		<>
			{router.pathname === '/' ||
			router.pathname.startsWith('/protocol') ||
			router.pathname.startsWith('/protocols') ||
			router.pathname.startsWith('/chain') ? (
				<MobileSearchV2 />
			) : (
				<MobileSearchV1 />
			)}
		</>
	)
}

const MobileSearchV2 = () => {
	return (
		<SearchV2 indexName="protocols">
			<DefiSearch />
		</SearchV2>
	)
}

const DefiSearch = () => {
	const { refine } = useSearchBox()

	const { results, status } = useInstantSearch({ catchError: true })

	const data = useFormatDefiSearchResults(results)

	const [inputValue, setInputValue] = useState('')
	const [display, setDisplay] = useState(false)

	const debouncedInputValue = useDebounce(inputValue, 500)

	const [resultsLength, setResultsLength] = useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	const finalResults = useMemo(() => filterAnSortResults(data, debouncedInputValue), [debouncedInputValue, data])

	return (
		<>
			{display ? (
				<>
					<input
						placeholder="Search..."
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value)
							refine(e.target.value)
						}}
						autoFocus
						className="absolute top-2 left-2 right-2 p-3 rounded-t-md text-base bg-[var(--bg6)] text-[var(--text1)]"
					/>
					<button onClick={() => setDisplay(false)} className="absolute z-10 top-5 right-5">
						<span className="sr-only">Close Search</span>
						<Icon name="x" height={24} width={24} />
					</button>
					<div className="h-full max-h-[240px] overflow-y-auto bg-[var(--bg6)] rounded-b-md shadow z-10 absolute left-2 right-2 top-[56px]">
						{status === 'loading' ? (
							<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
						) : finalResults.length ? (
							<>
								{finalResults.slice(0, resultsLength + 1).map((token) => (
									<Row key={token.name} data={token} />
								))}

								{resultsLength < finalResults.length ? (
									<button
										className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
										onClick={showMoreResults}
									>
										See more...
									</button>
								) : null}
							</>
						) : (
							<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
						)}
					</div>
				</>
			) : (
				<button onClick={() => setDisplay(true)} className="shadow p-3 rounded-md bg-[#445ed0] text-white -my-[2px]">
					<span className="sr-only">Search</span>
					<Icon name="search" height={16} width={16} />
				</button>
			)}
		</>
	)
}
const useMobileSearchResult = () => {
	const router = useRouter()

	const stablecoinsSearchList = useGetStablecoinsSearchList()
	const liquidationSearchList = useGetLiquidationSearchList()
	const dexesSearchList = useGetDexesSearchList()
	const nftCollectionsList = useFetchNftCollectionsList()
	const feesSearchList = useGetFeesSearchList()

	if (router.pathname.startsWith('/stablecoin')) {
		return stablecoinsSearchList
	} else if (router.pathname.startsWith('/liquidations')) {
		return liquidationSearchList
	} else if (router.pathname.startsWith('/dex')) {
		return dexesSearchList
	} else if (router.pathname.startsWith('/nft')) {
		return nftCollectionsList
	} else if (router.pathname.startsWith('/fee')) {
		return feesSearchList
	} else {
		return { data: [], loading: false, onSearchTermChange: () => {}, onItemClick: () => {} }
	}
}

function MobileSearchV1() {
	const { data, loading, onSearchTermChange, onItemClick } = useMobileSearchResult()

	const [inputValue, setInputValue] = useState('')
	const [display, setDisplay] = useState(false)

	const debouncedInputValue = useDebounce(inputValue, 500)

	const [resultsLength, setResultsLength] = useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	const finalResults = useMemo(() => filterAnSortResults(data, debouncedInputValue), [debouncedInputValue, data])

	return (
		<>
			{display ? (
				<>
					<input
						placeholder="Search..."
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value)
							onSearchTermChange?.(e.target.value)
						}}
						autoFocus
						className="absolute top-2 left-2 right-2 p-3 rounded-t-md text-base bg-[var(--bg6)] text-[var(--text1)]"
					/>
					<button onClick={() => setDisplay(false)} className="absolute z-10 top-5 right-5">
						<span className="sr-only">Close Search</span>
						<Icon name="x" height={24} width={24} />
					</button>
					<div className="h-full max-h-[240px] overflow-y-auto bg-[var(--bg6)] rounded-b-md shadow z-10 absolute left-2 right-2 top-[56px]">
						{loading ? (
							<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
						) : finalResults.length ? (
							<>
								{finalResults.slice(0, resultsLength + 1).map((token) => (
									<Row key={token.name} data={token} onItemClick={onItemClick} />
								))}

								{resultsLength < finalResults.length ? (
									<button
										className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
										onClick={showMoreResults}
									>
										See more...
									</button>
								) : null}
							</>
						) : (
							<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
						)}
					</div>
				</>
			) : (
				<button onClick={() => setDisplay(true)} className="shadow p-3 rounded-md bg-[#445ed0] text-white -my-[2px]">
					<span className="sr-only">Search</span>
					<Icon name="search" height={16} width={16} />
				</button>
			)}
		</>
	)
}

function useGetFeesSearchList() {
	return useGetAdaptorsSearchList('fees')
}

function useGetDexesSearchList() {
	return useGetAdaptorsSearchList('dexs')
}

const filterAnSortResults = (data: Array<ISearchItem>, inputValue: string): Array<ISearchItem> => {
	if (!inputValue || inputValue === '') {
		return data
	}

	const results: Array<ISearchItem> = data.filter((item) =>
		item.name.toLowerCase().startsWith(inputValue.toLowerCase())
	)

	if (inputValue.length < 3) {
		return results
	}

	const { pools, tokens } = results.reduce(
		(acc, curr) => {
			if (curr.name.startsWith('Show all')) {
				acc.pools.push(curr)
			} else acc.tokens.push(curr)
			return acc
		},
		{ tokens: [], pools: [] }
	)

	return [...pools, ...tokens]
}

const Row = ({ data, onItemClick }: { data: any; onItemClick?: (data: any) => void }) => {
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	return (
		<button
			onClick={(e) => {
				if (onItemClick) {
					onItemClick(data)
				} else if (e.ctrlKey || e.metaKey) {
					window.open(data.route)
				} else {
					setLoading(true)
					router.push(data.route).then(() => {
						setLoading(false)
					})
				}
			}}
			disabled={loading}
			className="w-full p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer aria-selected:bg-[var(--bg2)] aria-disabled:opacity-50 aria-disabled:bg-[var(--bg2)]"
		>
			{data?.logo || data?.fallbackLogo ? <TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} /> : null}
			<span>{data.name}</span>
			{loading ? (
				<svg
					className="animate-spin -ml-1 mr-3 h-4 w-4"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			) : null}
		</button>
	)
}
