import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useComboboxState } from 'ariakit'
import { Search } from 'react-feather'
import styled from 'styled-components'
import { useGetDexesSearchList } from '../Dexs/hooks'
import { useGetLiquidationSearchList } from '../Liquidations/hooks'
import { useGetNftsSearchList } from '../NFTs/hooks'
import { useGetDefiSearchList } from '../ProtocolsChains/hooks'
import { useGetStablecoinsSearchList } from '../Stablecoins/hooks'
import { useGetYieldsSearchList } from '../Yields/hooks'
import { Input } from './Input'
import { Results } from './Results'

export default function MobileSearch() {
	const { data, loading, onSearchTermChange } = useMobileSearchResult()({})

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
					<InputField state={combobox} placeholder="Search..." breadCrumbs={true} />
				</>
			) : (
				<Button onClick={() => combobox.toggle()}>
					<Search height={16} width={16} />
				</Button>
			)}
			{/* TODO handle onItemClick */}
			<Results state={combobox} data={data} loading={loading} />
		</>
	)
}

// TODO check for custom fns on nfts and yields page
const useMobileSearchResult = () => {
	const router = useRouter()

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

	return useGetDefiSearchList
}

const Button = styled.button`
	background: #445ed0;
	color: #ffffff;
	padding: 6px 10px;
	border-radius: 8px;
	filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%));
`

const InputField = styled(Input)`
	position: absolute;
	top: 8px;
	left: 8px;
	right: 8px;
	border-radius: 4px;
	z-index: 1;
`
