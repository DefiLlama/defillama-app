import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Search } from 'react-feather'
import styled from 'styled-components'
import { useGetDexesSearchList } from '../Dexs/hooks'
import { useGetLiquidationSearchList } from '../Liquidations/hooks'
import { useGetNftsSearchList } from '../NFTs/hooks'
import { IDefiSearchListProps, useGetDefiSearchList } from '../ProtocolsChains/hooks'
import { useGetStablecoinsSearchList } from '../Stablecoins/hooks'
import { useGetTokensSearchListMobile, useGetYieldsSearchList } from '../Yields/hooks'
import { MobileInput } from './Input'
import { useGetInvestorsList } from '../Raises/hooks'
import { useDebounce } from '~/hooks'
import { MobileResults } from './Results/Mobile'

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

	if (router.pathname.startsWith('/yields/optimizer') || router.pathname.startsWith('/yields/strategy')) {
		return useGetTokensSearchListMobile
	}

	if (router.pathname.startsWith('/yields')) {
		return useGetYieldsSearchList
	}

	if (router.pathname.startsWith('/stablecoin')) {
		return useGetStablecoinsSearchList
	}

	if (router.pathname.startsWith('/liquidations')) {
		return useGetLiquidationSearchList
	}

	if (router.pathname.startsWith('/dex')) {
		return useGetDexesSearchList
	}

	if (router.pathname.startsWith('/nfts')) {
		return useGetNftsSearchList
	}

	if (router.pathname.startsWith('/raises')) {
		return useGetInvestorsList
	}

	return useGetDefiSearchList
}

const Button = styled.button`
	background: #445ed0;
	color: #ffffff;
	padding: 6px 10px;
	border-radius: 8px;
	box-shadow: ${({ theme }) => theme.shadow};
`
