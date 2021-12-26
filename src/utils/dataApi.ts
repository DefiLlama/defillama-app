import useSWR from 'swr'
import {
  CHART_API,
  PROTOCOLS_API,
  PROTOCOL_API,
  NFT_COLLECTIONS_API,
  NFT_COLLECTION_API,
  NFT_CHART_API,
  NFT_CHAINS_API,
  NFT_MARKETPLACES_API,
  NFT_SEARCH_API
} from '../constants/index'
import { standardizeProtocolName } from 'utils'
import Section from 'components/NFTCollectionPage/Section'

export function getProtocolNames(protocols) {
  return protocols.map(p => ({ name: p.name, symbol: p.symbol }))
}

export const basicPropertiesToKeep = ['tvl', 'name', 'symbol', 'chains', 'change_7d', 'change_1d', 'mcap']
export function keepNeededProperties(protocol: any, propertiesToKeep: string[] = basicPropertiesToKeep) {
  return propertiesToKeep.reduce((obj, prop) => {
    if (protocol[prop] !== undefined) {
      obj[prop] = protocol[prop]
    }
    return obj
  }, {})
}

const formatProtocolsData = ({
  chain = '',
  category = '',
  protocols = [],
  protocolProps = [...basicPropertiesToKeep, 'extraTvl'],
  totalExtraTvls = {}
}) => {
  let filteredProtocols = [...protocols]

  if (chain) {
    filteredProtocols = filteredProtocols.filter(({ chains = [] }) => chains.includes(chain))
  }

  if (category) {
    filteredProtocols = filteredProtocols.filter(
      ({ category: protocolCategory = '' }) =>
        category.toLowerCase() === (protocolCategory ? protocolCategory.toLowerCase() : '')
    )
  }

  filteredProtocols = filteredProtocols.map(protocol => {
    if (chain) {
      protocol.tvl = protocol.chainTvls[chain]
    }
    protocol.extraTvl = {}
    Object.entries(protocol.chainTvls).forEach(([sectionName, sectionTvl]) => {
      if (chain) {
        if (sectionName.startsWith(`${chain}-`)) {
          const sectionToAdd = sectionName.split('-')[1]
          protocol.extraTvl[sectionToAdd] = sectionTvl
          totalExtraTvls[sectionToAdd] = (totalExtraTvls[sectionToAdd] || 0) + sectionTvl
        }
      } else {
        const firstChar = sectionName[0]
        if (firstChar == firstChar.toLowerCase()) {
          protocol.extraTvl[sectionName] = sectionTvl
          totalExtraTvls[sectionName] = (totalExtraTvls[sectionName] || 0) + sectionTvl
        }
      }
    })
    return keepNeededProperties(protocol, protocolProps)
  })

  if (chain) {
    filteredProtocols = filteredProtocols.sort((a, b) => b.tvl - a.tvl)
  }

  return filteredProtocols
}

export async function getProtocolsPageData(category, chain) {
  const { protocols, chains } = await getProtocols()

  const filteredProtocols = formatProtocolsData({ chain, category, protocols })

  const chainsSet = new Set()

  filteredProtocols.forEach(({ chains }) => {
    chains.forEach(chain => chainsSet.add(chain))
  })
  return {
    filteredProtocols,
    chain: chain ?? 'All',
    category,
    chains: chains.filter(chain => chainsSet.has(chain))
  }
}

export async function getSimpleProtocolsPageData(propsToKeep) {
  const { protocols, chains } = await getProtocols()
  const filteredProtocols = formatProtocolsData({ protocols, protocolProps: propsToKeep })
  return { protocols: filteredProtocols, chains }
}

export async function getChainPageData(chain) {
  let chartData, protocols, chains
  try {
    ;[chartData, { protocols, chains }] = await Promise.all(
      [CHART_API + (chain ? '/' + chain : ''), PROTOCOLS_API].map(url => fetch(url).then(r => r.json()))
    )
  } catch (e) {
    return {
      notFound: true
    }
  }

  const totalExtraTvls = {}
  protocols = formatProtocolsData({ chain, protocols, totalExtraTvls })

  const currentTvl = chartData[chartData.length - 1].totalLiquidityUSD
  let tvlChange = 0
  if (chartData.length > 1) {
    tvlChange =
      ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) /
        chartData[chartData.length - 2].totalLiquidityUSD) *
      100
  }

  return {
    props: {
      ...(chain && { chain }),
      chainsSet: chains,
      filteredProtocols: protocols,
      chart: chartData.map(({ date, totalLiquidityUSD }) => [date, Math.trunc(totalLiquidityUSD)]),
      totalVolumeUSD: currentTvl,
      volumeChangeUSD: tvlChange,
      totalExtraTvls
    }
  }
}

export const getProtocols = () =>
  fetch(PROTOCOLS_API)
    .then(r => r.json())
    .then(({ protocols, chains, protocolCategories }) => ({
      protocolsDict: protocols.reduce((acc, curr) => {
        acc[standardizeProtocolName(curr.name)] = curr
        return acc
      }, {}),
      protocols,
      chains,
      categories: protocolCategories
    }))

export const getProtocol = protocolName => {
  try {
    return fetch(`${PROTOCOL_API}/${protocolName}`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const fuseProtocolData = (protocolData, protocol) => {
  const historicalChainTvls = protocolData?.chainTvls ?? {}
  const chainTvls = protocolData.currentChainTvls ?? {}
  const tvl = protocolData?.tvl ?? []

  return {
    ...protocolData,
    tvl: tvl.length > 0 ? tvl[tvl.length - 1]?.totalLiquidityUSD : 0,
    tvlList: tvl.filter(item => item.date).map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD]),
    historicalChainTvls,
    chainTvls
  }
}

export const getNFTStatistics = chart => {
  const { totalVolume, totalVolumeUSD } = (chart.length &&
    chart.reduce((volumes, data) => {
      if (volumes.totalVolumeUSD >= 0 && volumes.totalVolume >= 0) {
        volumes.totalVolumeUSD += data.volumeUSD ?? 0
        volumes.totalVolume += data.volume ?? 0
      } else {
        volumes.totalVolumeUSD = data.volumeUSD ?? 0
        volumes.totalVolume = data.volume ?? 0
      }
      return volumes
    }, {})) || {
    totalVolume: 0,
    totalVolumeUSD: 0
  }

  const dailyVolume = chart.length ? chart[chart.length - 1]?.volume || 0 : 0
  const dailyVolumeUSD = chart.length ? chart[chart.length - 1]?.volumeUSD || 0 : 0
  const dailyChange = chart.length
    ? ((dailyVolumeUSD - chart[chart.length - 2]?.volumeUSD) / chart[chart.length - 2]?.volumeUSD) * 100
    : 0

  return {
    totalVolumeUSD,
    totalVolume,
    dailyVolumeUSD,
    dailyVolume,
    dailyChange
  }
}

export const getNFTData = async () => {
  try {
    const chart = await fetch(NFT_CHART_API).then(r => r.json())
    const { data: collections } = await fetch(NFT_COLLECTIONS_API).then(r => r.json())
    const statistics = getNFTStatistics(chart)

    return {
      chart,
      collections,
      statistics
    }
  } catch (e) {
    console.log(e)
    return {
      chart: [],
      collections: [],
      statistics: {}
    }
  }
}

export const getNFTCollections = async (chain: string) => {
  try {
    const { data: collections } = await fetch(NFT_COLLECTIONS_API).then(r => r.json())
    return collections
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionsByChain = async (chain: string) => {
  try {
    const { data: collections } = await fetch(`${NFT_COLLECTIONS_API}/chain/${chain}`).then(r => r.json())
    return collections
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionsByMarketplace = async (marketplace: string) => {
  try {
    const { data: collections } = await fetch(`${NFT_COLLECTIONS_API}/marketplace/${marketplace}`).then(r => r.json())
    return collections
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollection = async slug => {
  try {
    const data = await fetch(`${NFT_COLLECTION_API}/${slug}`).then(r => r.json())
    return data.find(data => data.SK === 'overview')
  } catch (e) {
    console.log(e)
  }
}

export const getNFTChainChartData = async chain => {
  try {
    return fetch(`${NFT_CHART_API}/chain/${chain}`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTMarketplaceChartData = async marketplace => {
  try {
    return fetch(`${NFT_CHART_API}/marketplace/${marketplace}`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionChartData = async slug => {
  try {
    return fetch(`${NFT_CHART_API}/collection/${slug}`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTChainsData = async () => {
  try {
    return fetch(NFT_CHAINS_API).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTMarketplacesData = async () => {
  try {
    return fetch(NFT_MARKETPLACES_API).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTSearchResults = async (query: string) => {
  try {
    const { hits }: { hits: any } = await fetch(`${NFT_SEARCH_API}?query=${query}`).then(r => r.json())
    return hits.map(hit => hit._source)
  } catch (e) {
    console.log(e)
  }
}

// Client Side

const fetcher = (input: RequestInfo, init?: RequestInit) => fetch(input, init).then(res => res.json())

export const useFetchProtocol = protocolName => {
  const { data, error } = useSWR(protocolName ? `${PROTOCOL_API}/${protocolName}` : null, fetcher)
  return { data, error, loading: protocolName && !data && !error }
}

export const useGeckoProtocol = (gecko_id, defaultCurrency = 'usd') => {
  const { data, error } = useSWR(
    gecko_id ? `https://api.coingecko.com/api/v3/simple/price?ids=${gecko_id}&vs_currencies=${defaultCurrency}` : null,
    fetcher
  )
  return { data, error, loading: gecko_id && !data && !error }
}

//:00 -> adapters start running, they take up to 15mins
//:20 -> storeProtocols starts running, sets cache expiry to :21 of next hour
//:22 -> we rebuild all pages
function next22Minutedate() {
  const dt = new Date()
  dt.setHours(dt.getHours() + 1)
  dt.setMinutes(22)
  return dt
}

export function revalidate() {
  const current = Date.now()
  return Math.ceil((next22Minutedate().getTime() - current) / 1000)
}
