import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useComboboxState } from 'ariakit'
import { Search } from 'react-feather'
import styled from 'styled-components'
import { useGetDexesSearchList } from '../Dexs/hooks'
import { useGetLiquidationSearchList } from '../Liquidations/hooks'
import { useGetNftsSearchList } from '../NFTs/hooks'
import { IDefiSearchListProps, useGetDefiSearchList } from '../ProtocolsChains/hooks'
import { useGetStablecoinsSearchList } from '../Stablecoins/hooks'
import { useGetTokensSearchListMobile, useGetYieldsSearchList } from '../Yields/hooks'
import { Input } from './Input'
import { Results } from './Results'
import { useGetInvestorsList } from '../Raises/hooks'

export default function MobileSearch() {
	const { data, loading, onSearchTermChange, onItemClick } = useMobileSearchResult()(
		{} as boolean & IDefiSearchListProps
	)

	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		list: data.map((x) => x.name)
	})

	useEffect(() => {
		if (onSearchTermChange) onSearchTermChange(combobox.value)
	}, [combobox.value, onSearchTermChange])

	// Resets combobox value when popover is collapsed
	if (!combobox.mounted && combobox.value) {
		combobox.setValue('')
	}

	return (
		<>
			{combobox.mounted ? (
				<>
					<InputField state={combobox} placeholder="Search..." breadCrumbs={true} autoFocus />
				</>
			) : (
				<Button onClick={() => combobox.toggle()}>
					<Search height={16} width={16} />
				</Button>
			)}

			<Results state={combobox} data={data} loading={loading} onItemClick={onItemClick} />
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

const InputField = styled(Input)`
	position: absolute;
	top: 8px;
	left: 8px;
	right: 8px;
	border-radius: 4px;
	z-index: 1;
`
