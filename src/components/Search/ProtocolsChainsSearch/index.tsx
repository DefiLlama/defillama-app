import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'
import { chainIconUrl, standardizeProtocolName, tokenIconUrl } from '~/utils'
import { useFetchProtocolsList } from '~/api/categories/protocols/client'
import placeholderImg from '~/assets/placeholder.png'
import { DesktopProtocolFilters, MobileProtocolFilters } from '~/components/Filters/protocols'

const groupedChains = [
	{ name: 'Non-EVM', route: '/chains/Non-EVM', logo: placeholderImg.src },
	{ name: 'EVM', route: '/chains/EVM', logo: placeholderImg.src },
	{ name: 'Rollup', route: '/chains/Rollup', logo: placeholderImg.src },
	{ name: 'Cosmos', route: '/chains/Cosmos', logo: placeholderImg.src },
	{ name: 'Parachain', route: '/chains/Parachain', logo: placeholderImg.src },
	{ name: 'Chains - Polkadot', route: '/chains/Polkadot', logo: chainIconUrl('polkadot') },
	{ name: 'Chains - Kusama', route: '/chains/Kusama', logo: chainIconUrl('kusama') }
]

export enum SETS {
	PROTOCOLS = 'protocols',
	CHAINS = 'chains',
	GROUPED_CHAINS = 'grouped_chains'
}

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
}

const getNameWithSymbol = (token: IBaseSearchProps['data'][0]) => {
	if (token.symbol !== '-' && !!token.symbol) return `${token.name} (${token.symbol})`
	return token.name
}

export default function ProtocolsChainsSearch(props: IProtocolsChainsSearch) {
	const { includedSets = Object.values(SETS), customPath, options } = props

	const { data, loading } = useFetchProtocolsList()

	const { pathname } = useRouter()

	const searchData: IBaseSearchProps['data'] = useMemo(() => {
		const includeChains = includedSets.includes(SETS.CHAINS)

		const getCustomPathChains = customPath ? customPath : (name) => `/chain/${name}`

		const chainData: IBaseSearchProps['data'] = includeChains
			? data?.chains?.map((name) => ({
					logo: chainIconUrl(name),
					route: getCustomPathChains(name),
					name
			  })) ?? []
			: []
		const includeProtocols = includedSets.includes(SETS.PROTOCOLS)

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

		const sets = pathname.startsWith('/protocol') ? [...protocolData, ...chainData] : [...chainData, ...protocolData]

		if (includedSets.includes(SETS.GROUPED_CHAINS)) {
			let _groupedChains = groupedChains
			if (customPath)
				_groupedChains = groupedChains.map((gchain) => ({
					...gchain,
					route: customPath(gchain.name)
				}))
			sets.push(..._groupedChains)
		}

		return sets
	}, [data, pathname, customPath, includedSets])

	return <BaseSearch {...props} data={searchData} loading={loading} filters={<TvlOptions options={options} />} />
}

const TvlOptions = ({ options }: { options?: { name: string; key: string }[] }) => {
	const router = useRouter()

	if (router.pathname?.includes('/protocol/') && (!options || options.length === 0)) return null

	return (
		<>
			<DesktopProtocolFilters options={options} />

			<MobileProtocolFilters options={options} />
		</>
	)
}
