import { BaseSearch } from 'components/Search/OpenSearch/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from 'components/Search/OpenSearch/BaseSearch'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { chainIconUrl, standardizeProtocolName, tokenIconUrl } from 'utils'
import { useFetchProtocolsList } from 'utils/dataApi'
import placeholderImg from 'assets/placeholder.png'

const groupedChains = [
  { name: 'Non-EVM', route: '/chains/Non-EVM', logo: placeholderImg.src },
  { name: 'EVM', route: '/chains/EVM', logo: placeholderImg.src },
  { name: 'Rollup', route: '/chains/Rollup', logo: placeholderImg.src },
  { name: 'Cosmos', route: '/chains/Cosmos', logo: placeholderImg.src },
  { name: 'Parachain', route: '/chains/Parachain', logo: placeholderImg.src },
]

export enum SETS {
  PROTOCOLS = 'protocols',
  CHAINS = 'chains',
  GROUPED_CHAINS = 'grouped_chains',
}

interface IProtocolsChainsSearch extends ICommonSearchProps {
  includedSets?: SETS[]
  customPath?: IBaseSearchProps['customPath']
}

export default function ProtocolsChainsSearch(props: IProtocolsChainsSearch) {
  const { includedSets = Object.values(SETS), customPath } = props
  const { data, loading } = useFetchProtocolsList()
  const { pathname } = useRouter()
  const searchData: IBaseSearchProps['data'] = useMemo(() => {
    const includeChains = includedSets.includes(SETS.CHAINS)
    const getCustomPathChains = customPath ? customPath : (name) => `/chain/${name}`
    const chainData: IBaseSearchProps['data'] = includeChains
      ? data?.chains?.map((name) => ({
          logo: chainIconUrl(name),
          route: getCustomPathChains(name),
          name,
        })) ?? []
      : []
    const includeProtocols = includedSets.includes(SETS.PROTOCOLS)
    const getCustomPathProtocols = customPath ? customPath : (name) => `/protocol/${standardizeProtocolName(name)}`
    const protocolData = includeProtocols
      ? data?.protocols?.map((token) => ({
          ...token,
          name: token.name,
          symbol: token.symbol,
          logo: tokenIconUrl(token.name),
          route: getCustomPathProtocols(token.name),
        })) ?? []
      : []

    const sets = pathname.startsWith('/protocol') ? [...protocolData, ...chainData] : [...chainData, ...protocolData]
    if (includedSets.includes(SETS.GROUPED_CHAINS)) {
      let _groupedChains = groupedChains
      if (customPath) _groupedChains = groupedChains.map((gchain) => ({ ...gchain, route: customPath(gchain.name) }))
      sets.push(..._groupedChains)
    }

    return sets
  }, [data, pathname, customPath])

  return <BaseSearch {...props} data={searchData} loading={loading} />
}
