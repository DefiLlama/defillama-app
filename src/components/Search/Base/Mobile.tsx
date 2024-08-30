import { useState } from 'react'
import { useRouter } from 'next/router'
import { Search } from 'react-feather'
import styled from 'styled-components'
import { MobileInput } from './Input'
import { useDebounce } from '~/hooks'
import { useGetLiquidationSearchList } from '../Liquidations/hooks'
import { useGetStablecoinsSearchList } from '../Stablecoins/hooks'
import { MobileResults } from './Results/Mobile'
import { useGetAdaptorsSearchList } from '../Adaptors/hooks'
import { useFetchNftCollectionsList } from '~/api/categories/nfts/client'
import { useInstantSearch, useSearchBox } from 'react-instantsearch'
import { useFormatDefiSearchResults } from '../ProtocolsChains/hooks'
import { SearchV2 } from '../InstantSearch'

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
				<Button onClick={() => setDisplay(true)}>
					<Search height={16} width={16} />
				</Button>
			)}
		</>
	)
}

function MobileSearchV1() {
	const { data, loading, onSearchTermChange, onItemClick } = useMobileSearchResult()({} as boolean)

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
				<Button onClick={() => setDisplay(true)}>
					<Search height={16} width={16} />
				</Button>
			)}
		</>
	)
}

const useMobileSearchResult = () => {
	const router = useRouter()

	if (router.pathname.startsWith('/stablecoin')) {
		return useGetStablecoinsSearchList
	}

	if (router.pathname.startsWith('/liquidations')) {
		return useGetLiquidationSearchList
	}

	if (router.pathname.startsWith('/dex')) {
		return useGetDexesSearchList
	}

	if (router.pathname.startsWith('/nft')) {
		return useFetchNftCollectionsList
	}

	if (router.pathname.startsWith('/fee')) {
		return useGetFeesSearchList
	}

	return (props: any) => ({ data: [], loading: false, onSearchTermChange: null, onItemClick: null })
}

function useGetFeesSearchList() {
	return useGetAdaptorsSearchList('fees')
}

function useGetDexesSearchList() {
	return useGetAdaptorsSearchList('dexs')
}

const Button = styled.button`
	background: #445ed0;
	color: #ffffff;
	padding: 6px 10px;
	border-radius: 8px;
	box-shadow: ${({ theme }) => theme.shadow};
`
