import { IList, IStep, SearchDefault } from 'components/Search/OpenSearch'
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

export default function Search({ step }: { step: IStep }) {
  const { data, loading } = useFetchProtocolsList()

  const { pathname } = useRouter()

  const searchData: IList[] = useMemo(() => {
    const chainData: IList[] =
      data?.chains?.map((name) => ({
        logo: chainIconUrl(name),
        route: `/chain/${name}`,
        name,
      })) ?? []

    const protocolData =
      data?.protocols?.map((token) => ({
        ...token,
        name: `${token.name} (${token.symbol})`,
        logo: tokenIconUrl(token.name),
        route: `/protocol/${standardizeProtocolName(token.name)}`,
      })) ?? []

    return pathname.startsWith('/protocol')
      ? [...protocolData, ...chainData, ...groupedChains]
      : [...chainData, ...protocolData, ...groupedChains]
  }, [data, pathname])

  return <SearchDefault data={searchData} loading={loading} step={step} />
}
