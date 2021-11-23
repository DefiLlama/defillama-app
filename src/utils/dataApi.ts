import useSWR from 'swr'
import {
  CHART_API,
  PROTOCOLS_API,
  PROTOCOL_API,
  NFT_COLLECTIONS_API,
  NFT_COLLECTION_API,
  NFT_CHARTS_API,
  NFT_STATISTICS_API
} from '../constants/index'
import { standardizeProtocolName } from 'utils'

function sumSection(protocols, sectionName) {
  return protocols.reduce((total, p) => total + (p[sectionName] ?? 0), 0)
}

export function getProtocolNames(protocols) {
  return protocols.map(p => ({ name: p.name, symbol: p.symbol }))
}

function addSection(protocol: any, section: string, chain: string | undefined) {
  const chainSectionName = chain === undefined ? section : `${chain}-${section}`
  if (protocol.chainTvls[chainSectionName] !== undefined) {
    protocol[section] = protocol.chainTvls[chainSectionName]
  }
}

export const basicPropertiesToKeep = ['tvl', 'name', 'symbol', 'chains', 'change_7d', 'change_1d', 'mcaptvl']
export function keepNeededProperties(protocol: any, propertiesToKeep: string[] = basicPropertiesToKeep) {
  return propertiesToKeep.reduce((obj, prop) => {
    if (protocol[prop] !== undefined) {
      obj[prop] = protocol[prop]
    }
    return obj
  }, {})
}

export async function getChainData(chain) {
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
  if (chain !== undefined) {
    protocols = protocols.filter(p => p.chains.includes(chain))
  }
  protocols = protocols.map(protocol => {
    if (chain !== undefined) {
      protocol.tvl = protocol.chainTvls[chain]
    }
    addSection(protocol, 'staking', chain)
    addSection(protocol, 'pool2', chain)
    return keepNeededProperties(protocol, [...basicPropertiesToKeep, 'staking', 'pool2'])
  })
  if (chain !== undefined) {
    protocols = protocols.sort((a, b) => b.tvl - a.tvl)
  }
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
      filteredTokens: protocols,
      chart: chartData.map(({ date, totalLiquidityUSD }) => [date, Math.trunc(totalLiquidityUSD)]),
      totalVolumeUSD: currentTvl,
      volumeChangeUSD: tvlChange,
      totalStaking: sumSection(protocols, 'staking'),
      totalPool2: sumSection(protocols, 'pool2')
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

// TODO Fix lambda function so we don't have to do this on front end
export const fuseProtocolData = (protocolsDict, protocolData, protocol) => {
  const historicalChainTvls = { ...(protocolData?.chainTvls ?? {}) }
  // Don't overwrite topTokens' chainTvls response
  delete protocolData.chainTvls
  const chainTvls = Object.fromEntries(
    Object.entries(protocolsDict[protocol].chainTvls).sort((a: any[], b: any[]) => b[1] - a[1])
  )

  return {
    ...(protocolsDict[protocol] || {}),
    ...protocolData,
    tvl: protocolData?.tvl.length > 0 ? protocolData?.tvl[protocolData?.tvl.length - 1]?.totalLiquidityUSD : 0,
    tvlList: protocolData?.tvl
      .filter(item => item.date)
      .map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD]),
    historicalChainTvls,
    chainTvls
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

export async function getNFTData(collection) {
  let chartData, collections, statistics

  try {
    ;[chartData, collections, statistics] = await Promise.all(
      [`${NFT_CHARTS_API}/all/dailyVolume`, NFT_COLLECTIONS_API, NFT_STATISTICS_API].map(url =>
        fetch(url).then(r => r.json())
      )
    )
  } catch (e) {
    console.log(e)
    return {
      notFound: true
    }
  }

  const { totalVolumeUSD, dailyVolumeUSD, dailyChange } = statistics

  return {
    props: {
      chart: chartData,
      collections,
      totalVolumeUSD,
      dailyVolumeUSD,
      dailyChange
    }
  }
}

export const getNFTCollections = () => fetch(NFT_COLLECTIONS_API).then(r => r.json())

export const getNFTCollection = slug => {
  try {
    return fetch(`${NFT_COLLECTION_API}/${slug}`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionChartData = slug => {
  try {
    return fetch(`${NFT_CHARTS_API}/${slug}/dailyVolume`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
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
