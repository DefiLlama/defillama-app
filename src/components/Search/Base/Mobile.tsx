import { useState } from 'react'
import { useRouter } from 'next/router'
import { MobileInput } from './Input'
import { useDebounce } from '~/hooks/useDebounce'
import { useGetLiquidationSearchList } from '../Liquidations/hooks'
import { useGetStablecoinsSearchList } from '../Stablecoins/hooks'
import { MobileResults } from './Results/Mobile'
import { useGetAdaptorsSearchList } from '../Adaptors/hooks'
import { useFetchNftCollectionsList } from '~/api/categories/nfts/client'
import { useInstantSearch, useSearchBox } from 'react-instantsearch'
import { useFormatDefiSearchResults } from '../ProtocolsChains/hooks'
import { SearchV2 } from '../InstantSearch'
import { Icon } from '~/components/Icon'

export default function MobileSearch() {
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

	return (
		<>
			{display ? (
				<>
					<MobileInput
						value={inputValue}
						setValue={setInputValue}
						onSearchTermChange={(v) => refine(v)}
						hideInput={setDisplay}
					/>
					<MobileResults inputValue={debouncedInputValue} data={data} loading={status === 'loading'} />
				</>
			) : (
				<button onClick={() => setDisplay(true)} className="shadow p-3 rounded-lg bg-[#445ed0] text-white -my-[2px]">
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

	return (
		<>
			{display ? (
				<>
					<MobileInput
						value={inputValue}
						setValue={setInputValue}
						onSearchTermChange={onSearchTermChange}
						hideInput={setDisplay}
					/>
					<MobileResults inputValue={debouncedInputValue} data={data} loading={loading} onItemClick={onItemClick} />
				</>
			) : (
				<button onClick={() => setDisplay(true)} className="shadow p-3 rounded-lg bg-[#445ed0] text-white -my-[2px]">
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
