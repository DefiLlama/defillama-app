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
  NFT_SEARCH_API,
} from '../constants/index'
import { standardizeProtocolName } from 'utils'
import { getPercentChange } from 'hooks/data'

export function getProtocolNames(protocols) {
  return protocols.map((p) => ({ name: p.name, symbol: p.symbol }))
}

export const basicPropertiesToKeep = [
  'tvl',
  'name',
  'symbol',
  'chains',
  'change_1d',
  'change_7d',
  'change_1m',
  'tvlPrevDay',
  'tvlPrevWeek',
  'tvlPrevMonth',
  'mcap',
]
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

  filteredProtocols = filteredProtocols.map((protocol) => {
    if (chain) {
      protocol.tvl = protocol.chainTvls[chain] ?? 0
    }
    protocol.extraTvl = {}
    protocol.change_1d = getPercentChange(protocol.tvlPrevDay, protocol.tvl)
    protocol.change_7d = getPercentChange(protocol.tvlPrevWeek, protocol.tvl)
    protocol.change_1m = getPercentChange(protocol.tvlPrevMonth, protocol.tvl)

    Object.entries(protocol.chainTvls2).forEach(([sectionName, sectionTvl]) => {
      if (chain) {
        if (sectionName.startsWith(`${chain}-`)) {
          const sectionToAdd = sectionName.split('-')[1]
          protocol.extraTvl[sectionToAdd] = sectionTvl
        }
      } else {
        const firstChar = sectionName[0]
        if (firstChar === firstChar.toLowerCase() || sectionName === 'Offers' || sectionName === 'Treasury') {
          protocol.extraTvl[sectionName] = sectionTvl
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
    chains.forEach((chain) => chainsSet.add(chain))
  })
  return {
    filteredProtocols,
    chain: chain ?? 'All',
    category,
    chains: chains.filter((chain) => chainsSet.has(chain)),
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
      [CHART_API + (chain ? '/' + chain : ''), PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json()))
    )
  } catch (e) {
    return {
      notFound: true,
    }
  }

  const { tvl = [], staking = [], borrowed = [], pool2 = [], offers = [], treasury = [] } = chartData || {}

  const filteredProtocols = formatProtocolsData({ chain, protocols })

  let currentTvl = 0
  let tvlChange = 0
  let borrowedTvl = 0
  let borrowedTvlChange = 0
  let stakingTvl = 0
  let stakingTvlChange = 0
  let pool2Tvl = 0
  let pool2TvlChange = 0
  let offersTvl = 0
  let offersTvlChange = 0
  let treasuryTvl = 0
  let treasuryTvlChange = 0

  if (tvl.length > 1) {
    currentTvl = tvl[tvl.length - 1][1]
    tvlChange = ((tvl[tvl.length - 1][1] - tvl[tvl.length - 2][1]) / tvl[tvl.length - 2][1]) * 100
  }

  if (staking.length > 1) {
    stakingTvl = staking[staking.length - 1][1]
    stakingTvlChange =
      ((staking[staking.length - 1][1] - staking[staking.length - 2][1]) / staking[staking.length - 2][1]) * 100
  }

  if (borrowed.length > 1) {
    borrowedTvl = borrowed[borrowed.length - 1][1]
    borrowedTvlChange =
      ((borrowed[borrowed.length - 1][1] - borrowed[borrowed.length - 2][1]) / borrowed[borrowed.length - 2][1]) * 100
  }
  if (pool2.length > 1) {
    pool2Tvl = pool2[pool2.length - 1][1]
    pool2TvlChange = ((pool2[pool2.length - 1][1] - pool2[pool2.length - 2][1]) / pool2[pool2.length - 2][1]) * 100
  }
  if (offers.length > 1) {
    offersTvl = offers[offers.length - 1][1]
    offersTvlChange =
      ((offers[offers.length - 1][1] - offers[offers.length - 2][1]) / offers[offers.length - 2][1]) * 100
  }
  if (treasury.length > 1) {
    treasuryTvl = treasury[treasury.length - 1][1]
    treasuryTvlChange =
      ((treasury[treasury.length - 1][1] - treasury[treasury.length - 2][1]) / treasury[treasury.length - 2][1]) * 100
  }

  // TODO refactor and put all options into a single object with totalVolue, volumeChange, volumeCharts keys respectively
  const extraTvls = {
    staking: stakingTvl,
    borrowed: borrowedTvl,
    pool2: pool2Tvl,
    offers: offersTvl,
    treasury: treasuryTvl,
  }

  const extraTvlsChange = {
    staking: stakingTvlChange,
    borrowed: borrowedTvlChange,
    pool2: pool2TvlChange,
    offers: offersTvlChange,
    treasury: treasuryTvlChange,
  }

  const extraVolumesCharts = {
    staking: staking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
    borrowed: borrowed.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
    pool2: pool2.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
    offers: offers.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
    treasury: treasury.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
  }

  return {
    props: {
      ...(chain && { chain }),
      chainsSet: chains,
      filteredProtocols,
      chart: tvl.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
      totalVolumeUSD: currentTvl,
      volumeChangeUSD: tvlChange,
      extraTvls,
      extraTvlsChange,
      extraVolumesCharts,
    },
  }
}

export const getProtocols = () =>
  fetch(PROTOCOLS_API)
    .then((r) => r.json())
    .then(({ protocols, chains, protocolCategories }) => ({
      protocolsDict: protocols.reduce((acc, curr) => {
        acc[standardizeProtocolName(curr.name)] = curr
        return acc
      }, {}),
      protocols,
      chains,
      categories: protocolCategories,
    }))

export const getProtocol = (protocolName) => {
  try {
    return fetch(`${PROTOCOL_API}/${protocolName}`).then((r) => r.json())
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
    tvlList: tvl.filter((item) => item.date).map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD]),
    historicalChainTvls,
    chainTvls,
  }
}

export const getNFTStatistics = (chart) => {
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
    totalVolumeUSD: 0,
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
    dailyChange,
  }
}

export const getNFTData = async () => {
  try {
    const chart = await fetch(NFT_CHART_API).then((r) => r.json())
    const { data: collections } = await fetch(NFT_COLLECTIONS_API).then((r) => r.json())
    const statistics = getNFTStatistics(chart)

    return {
      chart,
      collections,
      statistics,
    }
  } catch (e) {
    console.log(e)
    return {
      chart: [],
      collections: [],
      statistics: {},
    }
  }
}

export const getNFTCollections = async (chain: string) => {
  try {
    const { data: collections } = await fetch(NFT_COLLECTIONS_API).then((r) => r.json())
    return collections
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionsByChain = async (chain: string) => {
  try {
    const { data: collections } = await fetch(`${NFT_COLLECTIONS_API}/chain/${chain}`).then((r) => r.json())
    return collections
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionsByMarketplace = async (marketplace: string) => {
  try {
    const { data: collections } = await fetch(`${NFT_COLLECTIONS_API}/marketplace/${marketplace}`).then((r) => r.json())
    return collections
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollection = async (slug) => {
  try {
    const data = await fetch(`${NFT_COLLECTION_API}/${slug}`).then((r) => r.json())
    return data.find((data) => data.SK === 'overview')
  } catch (e) {
    console.log(e)
  }
}

export const getNFTChainChartData = async (chain) => {
  try {
    return fetch(`${NFT_CHART_API}/chain/${chain}`).then((r) => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTMarketplaceChartData = async (marketplace) => {
  try {
    return fetch(`${NFT_CHART_API}/marketplace/${marketplace}`).then((r) => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionChartData = async (slug) => {
  try {
    return fetch(`${NFT_CHART_API}/collection/${slug}`).then((r) => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTChainsData = async () => {
  try {
    return fetch(NFT_CHAINS_API).then((r) => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTMarketplacesData = async () => {
  try {
    return fetch(NFT_MARKETPLACES_API).then((r) => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTSearchResults = async (query: string) => {
  try {
    if (query) {
      const { hits }: { hits: any } = await fetch(`${NFT_SEARCH_API}?query=${query}`).then((r) => r.json())
      return hits.map((hit) => hit._source)
    }
    return []
  } catch (e) {
    console.log(e)
  }
}

// Client Side

const fetcher = (input: RequestInfo, init?: RequestInit) => fetch(input, init).then((res) => res.json())

export const useFetchProtocol = (protocolName) => {
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

export const useDenominationPriceHistory = (gecko_id: string, utcStartTime: string) => {
  let url = `https://api.coingecko.com/api/v3/coins/${gecko_id}/market_chart/range?vs_currency=usd&from=${utcStartTime}&to=${Math.floor(
    Date.now() / 1000
  )}`

  const { data, error } = useSWR(gecko_id ? url : null, fetcher)

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
