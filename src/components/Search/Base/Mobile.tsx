import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Search } from 'react-feather'
import styled from 'styled-components'
import { MobileInput } from './Input'
import { useDebounce } from '~/hooks'
// import { useGetLiquidationSearchList } from '../Liquidations/hooks'
import { IDefiSearchListProps, useGetDefiSearchList } from '../ProtocolsChains/hooks'
import { useGetStablecoinsSearchList } from '../Stablecoins/hooks'
import { MobileResults } from './Results/Mobile'
import { useGetAdaptorsSearchList } from '../Adaptors/hooks'
import { useFetchNftCollectionsList } from '~/api/categories/nfts/client'

export default function MobileSearch() {
	const { data, loading, onSearchTermChange, onItemClick } = useMobileSearchResult()(
		{} as boolean & IDefiSearchListProps
	)

	const [inputValue, setInputValue] = useState('')
	const [display, setDisplay] = useState(false)

	const debouncedInputValue = useDebounce(inputValue, 500)

	useEffect(() => {
		if (onSearchTermChange) onSearchTermChange(debouncedInputValue)
	}, [debouncedInputValue, onSearchTermChange])

	return (
		<>
			{display ? (
				<>
					<MobileInput value={inputValue} setValue={setInputValue} hideInput={setDisplay} />
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

	// if (router.pathname.startsWith('/liquidations')) {
	// 	return useGetLiquidationSearchList
	// }

	if (router.pathname.startsWith('/dex')) {
		return useGetDexesSearchList
	}

	if (router.pathname.startsWith('/nft')) {
		return useFetchNftCollectionsList
	}

	if (router.pathname.startsWith('/fee')) {
		return useGetFeesSearchList
	}

	return useGetDefiSearchList
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
