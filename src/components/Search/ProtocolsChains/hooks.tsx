import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { useFetchProtocolsList } from '~/api/categories/protocols/client'
import { chainIconUrl, nftCollectionIconUrl, standardizeProtocolName, tokenIconUrl } from '~/utils'
import { IBaseSearchProps, SETS, IGetSearchList } from '../types'
import placeholderImg from '~/assets/placeholder.png'
import { useFetchNftCollectionsList } from '~/api/categories/nfts/client'

const groupedChains = [
	{ name: 'Non-EVM', route: '/chains/Non-EVM', logo: placeholderImg.src },
	{ name: 'EVM', route: '/chains/EVM', logo: placeholderImg.src },
	{ name: 'Rollup', route: '/chains/Rollup', logo: placeholderImg.src },
	{ name: 'Cosmos', route: '/chains/Cosmos', logo: placeholderImg.src },
	{ name: 'Parachain', route: '/chains/Parachain', logo: placeholderImg.src },
	{ name: 'Chains - Polkadot', route: '/chains/Polkadot', logo: chainIconUrl('polkadot') },
	{ name: 'Chains - Kusama', route: '/chains/Kusama', logo: chainIconUrl('kusama') }
]

const getNameWithSymbol = (token: IBaseSearchProps['data'][0]) => {
	if (token.symbol !== '-' && !!token.symbol) return `${token.name} (${token.symbol})`

	return token.name
}

export interface IDefiSearchListProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
}

export function useGetDefiSearchList({
	includedSets = Object.values(SETS),
	customPath
}: IDefiSearchListProps): IGetSearchList {
	const { data, loading } = useFetchProtocolsList()
	//const { data: collections, loading: fetchingCollections } = useFetchNftCollectionsList()
	const collections = []
	const fetchingCollections = false

	const { pathname } = useRouter()

	const searchData: IBaseSearchProps['data'] = useMemo(() => {
		if (loading || fetchingCollections) return []

		const includeChains = includedSets?.includes(SETS.CHAINS)

		const getCustomPathChains = customPath ? customPath : (name) => `/chain/${name}`

		const chainData: IBaseSearchProps['data'] = includeChains
			? data?.chains?.map((name) => ({
					logo: chainIconUrl(name),
					route: getCustomPathChains(name),
					name,
					symbol: null
			  })) ?? []
			: []

		const includeProtocols = includedSets?.includes(SETS.PROTOCOLS)

		const getCustomPathProtocols = customPath ? customPath : (name) => `/protocol/${standardizeProtocolName(name)}`

		const protocolData = includeProtocols
			? data?.protocols?.map((token) => ({
					...token,
					name: getNameWithSymbol(token),
					symbol: token.symbol,
					logo: tokenIconUrl(token.name),
					route: getCustomPathProtocols(token.name)
			  })) ?? []
			: []

		const parentProtocols = includeProtocols
			? data?.parentProtocols?.map((token) => ({
					...token,
					name: getNameWithSymbol(token),
					symbol: token.symbol,
					logo: tokenIconUrl(token.name),
					route: getCustomPathProtocols(token.name)
			  })) ?? []
			: []

		const nftCollections =
			collections?.map((item) => ({
				name: item.name,
				symbol: null,
				logo: nftCollectionIconUrl(item.collectionId),
				route: `/nfts/collection/${item.collectionId}`
			})) ?? []

		const sets = pathname.startsWith('/nft')
			? [...nftCollections, ...chainData, ...parentProtocols, ...protocolData]
			: pathname.startsWith('/protocol')
			? [...parentProtocols, ...protocolData, ...chainData, ...nftCollections]
			: [...chainData, ...parentProtocols, ...protocolData, ...nftCollections]

		if (includedSets?.includes(SETS.GROUPED_CHAINS)) {
			let _groupedChains = groupedChains
			if (customPath)
				_groupedChains = groupedChains.map((gchain) => ({
					...gchain,
					route: customPath(gchain.name)
				}))
			sets.push(..._groupedChains)
		}

		return sets
	}, [data, pathname, customPath, includedSets, collections, fetchingCollections, loading])

	return { data: searchData, loading: loading || fetchingCollections }
}
