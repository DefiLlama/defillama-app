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
  CONFIG_API,
  HOURLY_PROTOCOL_API,
  ORACLE_API,
  FORK_API,
  YIELD_POOLS_API,
  YIELD_CHART_API,
  CG_TOKEN_API,
  PEGGED_API,
  PEGGEDS_API,
  PEGGEDCHART_API,
  PEGGEDPRICES_API,
} from '../constants/index'
import {
  getPercentChange,
  getPrevTvlFromChart,
  getPrevCirculatingFromChart,
  getPeggedDominance,
  standardizeProtocolName,
} from 'utils'

interface IProtocol {
  name: string
  symbol: string
  chains: string[]
  chainTvls: {
    [key: string]: {
      tvl: number
      tvlPrevDay: number
      tvlPrevWeek: number
      tvlPrevMonth: number
    }
  }
  tvl: {
    date: number
    totalLiquidityUSD: number
  }[]
}

interface IChainGeckoId {
  geckoId: string
  symbol: string
  cmcId: string
  categories: string[]
}

interface IChainData {
  [key: string]: [number, number][]
}

interface IStackedDataset {
  [key: number]: {
    [key: string]: {
      [key: string]: number
    }
  }
}

interface IOracleProtocols {
  [key: string]: number
}

export function getProtocolNames(protocols) {
  return protocols.map((p) => ({ name: p.name, symbol: p.symbol }))
}

export const categoryToPegType = {
  stablecoins: 'peggedUSD',
}
export const peggedPropertiesToKeep = [
  'circulating',
  'minted',
  'unreleased',
  'mcap',
  'name',
  'symbol',
  'gecko_id',
  'chains',
  'price',
  'change_1d',
  'change_7d',
  'change_1m',
  'circulatingPrevDay',
  'circulatingPrevWeek',
  'circulatingPrevMonth',
]
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
  'mcaptvl',
  'category',
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
  oracle = null,
  fork = null,
  category = '',
  protocols = [],
  protocolProps = [...basicPropertiesToKeep, 'extraTvl'],
  removeBridges = false,
}) => {
  let filteredProtocols = [...protocols]

  if (removeBridges) {
    filteredProtocols = filteredProtocols.filter(({ category }) => category !== 'Bridge')
  }

  if (chain) {
    filteredProtocols = filteredProtocols.filter(({ chains = [] }) => chains.includes(chain))
  }

  if (oracle) {
    filteredProtocols = filteredProtocols.filter(({ oracles = [] }) => oracles.includes(oracle))
  }

  if (fork) {
    filteredProtocols = filteredProtocols.filter(({ forkedFrom = [] }) => forkedFrom.includes(fork))
  }

  if (category) {
    filteredProtocols = filteredProtocols.filter(
      ({ category: protocolCategory = '' }) =>
        category.toLowerCase() === (protocolCategory ? protocolCategory.toLowerCase() : '')
    )
  }

  filteredProtocols = filteredProtocols.map((protocol) => {
    if (chain) {
      protocol.tvl = protocol.chainTvls[chain]?.tvl ?? 0
      protocol.tvlPrevDay = protocol.chainTvls[chain]?.tvlPrevDay ?? null
      protocol.tvlPrevWeek = protocol.chainTvls[chain]?.tvlPrevWeek ?? null
      protocol.tvlPrevMonth = protocol.chainTvls[chain]?.tvlPrevMonth ?? null
    }
    protocol.extraTvl = {}
    protocol.change_1d = getPercentChange(protocol.tvl, protocol.tvlPrevDay)
    protocol.change_7d = getPercentChange(protocol.tvl, protocol.tvlPrevWeek)
    protocol.change_1m = getPercentChange(protocol.tvl, protocol.tvlPrevMonth)
    protocol.mcaptvl = protocol.mcap && protocol.tvl ? protocol.mcap / protocol.tvl : null

    Object.entries(protocol.chainTvls).forEach(([sectionName, sectionTvl]) => {
      if (chain) {
        if (sectionName.startsWith(`${chain}-`)) {
          const sectionToAdd = sectionName.split('-')[1]
          protocol.extraTvl[sectionToAdd] = sectionTvl
        }
      } else {
        const firstChar = sectionName[0]
        if (firstChar === firstChar.toLowerCase()) {
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

const formatPeggedAssetsData = ({
  chain = '',
  category = '',
  peggedAssets = [],
  chartDataByPeggedAsset = [],
  peggedNameToIndexObj = {},
  peggedAssetProps = [...peggedPropertiesToKeep],
}) => {
  let filteredPeggedAssets = [...peggedAssets]
  if (chain) {
    filteredPeggedAssets = filteredPeggedAssets.filter(({ chains = [] }) => chains.includes(chain))
  }

  if (category) {
    filteredPeggedAssets = filteredPeggedAssets.filter(
      ({ category: peggedCategory = '' }) =>
        category.toLowerCase() === (peggedCategory ? peggedCategory.toLowerCase() : '')
    )
  }

  filteredPeggedAssets = filteredPeggedAssets.map((pegged) => {
    let pegType = pegged.pegType
    if (chain) {
      const chainCirculating = pegged.chainCirculating[chain]
      pegged.circulating = chainCirculating ? chainCirculating.current[pegType] ?? 0 : 0
      pegged.circulatingPrevDay = chainCirculating ? chainCirculating.circulatingPrevDay[pegType] ?? null : null
      pegged.circulatingPrevWeek = chainCirculating ? chainCirculating.circulatingPrevWeek[pegType] ?? null : null
      pegged.circulatingPrevMonth = chainCirculating ? chainCirculating.circulatingPrevMonth[pegType] ?? null : null
    } else {
      pegged.circulating = pegged.circulating[pegType] ?? 0
      pegged.circulatingPrevDay = pegged.circulatingPrevDay[pegType] ?? null
      pegged.circulatingPrevWeek = pegged.circulatingPrevWeek[pegType] ?? null
      pegged.circulatingPrevMonth = pegged.circulatingPrevMonth[pegType] ?? null
    }
    const chartIndex = peggedNameToIndexObj[pegged.name]
    const chart = chartDataByPeggedAsset[chartIndex] ?? null

    pegged.mcap = chart?.[chart.length - 1]?.mcap ?? null
    const mcapPrevDay = chart?.[chart.length - 1 - 1]?.mcap ?? null
    const mcapPrevWeek = chart?.[chart.length - 1 - 7]?.mcap ?? null
    const mcapPrevMonth = chart?.[chart.length - 1 - 30]?.mcap ?? null
    pegged.change_1d = getPercentChange(pegged.mcap, mcapPrevDay)
    pegged.change_7d = getPercentChange(pegged.mcap, mcapPrevWeek)
    pegged.change_1m = getPercentChange(pegged.mcap, mcapPrevMonth)

    return keepNeededProperties(pegged, peggedAssetProps)
  })

  if (chain) {
    filteredPeggedAssets = filteredPeggedAssets.sort((a, b) => b.mcap - a.mcap)
  }

  return filteredPeggedAssets
}

const formatPeggedChainsData = ({
  pegType,
  chainList = [],
  peggedChartDataByChain = [],
  chainDominances = {},
  chainsData = [],
}) => {
  let filteredPeggedAssets = peggedChartDataByChain.map((chart, i) => {
    let chainData = {} as any
    const chainName = chainList[i]
    const chainDominance = chainDominances[chainName] ?? null

    const currentTimestamp = Date.now() / 1000
    const secondsInMonth = 2592000
    const latestChainTVLCharts = chainsData?.[i]?.tvl ?? null
    const latestChainTVLItem = latestChainTVLCharts?.[latestChainTVLCharts.length - 1]
    const latestChainTVL =
      currentTimestamp - secondsInMonth < (latestChainTVLItem?.[0] ?? 0) ? latestChainTVLItem[1] : null

    chainData.name = chainName
    chainData.circulating = getPrevCirculatingFromChart(chart, 0, 'totalCirculating', pegType)
    chainData.mcap = chart[chart.length - 1]?.mcap ?? 0
    chainData.unreleased = getPrevCirculatingFromChart(chart, 0, 'unreleased', pegType)
    chainData.bridgedTo = getPrevCirculatingFromChart(chart, 0, 'bridgedTo', pegType)
    chainData.minted = getPrevCirculatingFromChart(chart, 0, 'minted', pegType)
    chainData.circulatingPrevDay = getPrevCirculatingFromChart(chart, 1, 'totalCirculating', pegType)
    chainData.circulatingPrevWeek = getPrevCirculatingFromChart(chart, 7, 'totalCirculating', pegType)
    chainData.circulatingPrevMonth = getPrevCirculatingFromChart(chart, 30, 'totalCirculating', pegType)

    chainData.change_1d = getPercentChange(chainData.circulating, chainData.circulatingPrevDay)
    chainData.change_7d = getPercentChange(chainData.circulating, chainData.circulatingPrevWeek)
    chainData.change_1m = getPercentChange(chainData.circulating, chainData.circulatingPrevMonth)

    chainData.dominance = chainDominance
      ? { name: chainDominance.symbol, value: getPeggedDominance(chainDominance, chainData.mcap) }
      : null

    chainData.mcaptvl = (chainData.mcap && latestChainTVL && chainData.mcap / latestChainTVL) ?? null
    if (chainData.mcaptvl == 0) {
      chainData.mcaptvl = null
    }

    return chainData
  })

  filteredPeggedAssets = filteredPeggedAssets.sort((a, b) => b.mcap - a.mcap)

  return filteredPeggedAssets
}

export async function getProtocolsPageData(category?: string, chain?: string) {
  const { protocols, chains } = await getProtocols()

  const chainsSet = new Set()

  protocols.forEach(({ chains, category: pCategory }) => {
    chains.forEach((chain) => {
      if (!category || !chain) {
        chainsSet.add(chain)
      } else {
        if (pCategory?.toLowerCase() === category?.toLowerCase() && chains.includes(chain)) {
          chainsSet.add(chain)
        }
      }
    })
  })

  let filteredProtocols = formatProtocolsData({ category, protocols, chain })

  return {
    filteredProtocols,
    chain: chain ?? 'All',
    category,
    chains: chains.filter((chain) => chainsSet.has(chain)),
  }
}

export async function getSimpleProtocolsPageData(propsToKeep) {
  const { protocols, chains } = await getProtocolsRaw()
  const filteredProtocols = formatProtocolsData({
    protocols,
    protocolProps: propsToKeep,
  })
  return { protocols: filteredProtocols, chains }
}

export async function getPeggedOverviewPageData(category, chain) {
  const { peggedAssets, chains } = await getPeggedAssets()
  const chartData = await fetch(PEGGEDCHART_API + (chain ? '/' + chain : '')).then((r) => r.json())

  let chartDataByPeggedAsset = []
  let peggedAssetNames: string[] = []
  let peggedNameToIndexObj: object = {}
  chartDataByPeggedAsset = await Promise.all(
    peggedAssets.map(async (elem, i) => {
      peggedAssetNames.push(elem.symbol) // fix
      peggedNameToIndexObj[elem.name] = i
      for (let i = 0; i < 5; i++) {
        try {
          if (!chain) {
            return await fetch(`${PEGGEDCHART_API}/?peggedAsset=${elem.gecko_id}`).then((resp) => resp.json())
          }
          return await fetch(`${PEGGEDCHART_API}/${chain}?peggedAsset=${elem.gecko_id}`).then((resp) => resp.json())
        } catch (e) { }
      }
      throw new Error(`${CHART_API}/${elem} is broken`)
    })
  )

  let peggedAreaChartData = chartDataByPeggedAsset.reduce((total, charts, i) => {
    if (!charts.length) return total
    charts.forEach((chart) => {
      if (chart.date > 1596248105 && chart.mcap) {
        if (!(chain && chart.date < 1652241600)) {  // for individual chains data is currently only backfilled to May 11, 2022
          total[chart.date] = total[chart.date] || {}
          total[chart.date][peggedAssetNames[i]] = chart.mcap
        }
      }
    })
    return total
  }, {})

  peggedAreaChartData = Object.entries(peggedAreaChartData).map(([date, chart]) => {
    if (typeof chart === 'object') {
      return {
        date: date,
        ...chart,
      }
    }
  })

  let peggedMcapChartData = []
  peggedMcapChartData = await fetch(`${PEGGEDCHART_API}`).then((resp) => resp.json())

  let peggedAreaMcapData = {}
  peggedMcapChartData.map((chart) => {
    if (chart.date > 1596248105 && chart.mcap) {
      peggedAreaMcapData[chart.date] = peggedAreaMcapData[chart.date] || {}
      peggedAreaMcapData[chart.date]['Total Stablecoins Market Cap'] = chart.mcap
    }
  })

  peggedAreaMcapData = Object.keys(peggedAreaMcapData).map((date) => {
    return {
      date: date,
      ...peggedAreaMcapData[date],
    }
  })

  const pegType = categoryToPegType[category]
  const stackedDataset = Object.entries(
    chartDataByPeggedAsset.reduce((total: IStackedDataset, charts, i) => {
      if (!charts.length) return total
      charts.forEach((chart) => {
        const peggedName = peggedAssetNames[i]
        const circulating = chart.mcap // should rename this variable; useCalcGroupExtraPeggedByDay accesses it
        const date = chart.date
        if (date < 1596248105) return
        if (chain && chart.date < 1652241600) return // for individual chains data is currently only backfilled to May 11, 2022
        if (circulating !== null && circulating !== 0) {
          if (total[date] == undefined) {
            total[date] = {}
          }
          const b = total[date][peggedName]
          total[date][peggedName] = { ...b, circulating: circulating ?? 0 }
        }
      })
      return total
    }, {})
  )

  const chainList = await chains.sort((a, b) => b.mcap - a.mcap).map((chain) => chain.name)
  const chainsSet = new Set()

  peggedAssets.forEach(({ chains, category: pCategory }) => {
    chains.forEach((chain) => {
      if (!category || !chain) {
        chainsSet.add(chain)
      } else {
        if (pCategory?.toLowerCase() === category?.toLowerCase() && chainList.includes(chain)) {
          chainsSet.add(chain)
        }
      }
    })
  })

  const filteredPeggedAssets = formatPeggedAssetsData({
    category,
    peggedAssets,
    chartDataByPeggedAsset,
    peggedNameToIndexObj,
    chain,
  })

  const peggedChartType = stackedDataset.length > 30 ? 'Area' : 'Pie'

  return {
    peggedcategory: category,
    chains: chainList.filter((chain) => chainsSet.has(chain)),
    filteredPeggedAssets,
    chartData,
    peggedAreaChartData,
    peggedAreaMcapData,
    stackedDataset,
    peggedChartType,
    chain: chain ?? 'All',
  }
}

export async function getPeggedChainsPageData(category) {
  const { peggedAssets, chains } = await getPeggedAssets()
  const { chainCoingeckoIds } = await fetch(CONFIG_API).then((r) => r.json())

  const chartData = await fetch(PEGGEDCHART_API).then((r) => r.json())

  const chainList = await chains.sort((a, b) => b.mcap - a.mcap).map((chain) => chain.name)
  const chainsSet = new Set()

  const chainsData: IChainData[] = await Promise.all(
    chainList.map(async (elem: string) => {
      if (chainCoingeckoIds[elem]) {
        for (let i = 0; i < 5; i++) {
          try {
            return await fetch(`${CHART_API}/${elem}`).then((resp) => resp.json())
          } catch (e) { }
        }
        throw new Error(`${CHART_API}/${elem} is broken`)
      } else return null
    })
  )

  let chainsGroupbyParent = {}
  chainList.forEach((chain) => {
    const parent = chainCoingeckoIds[chain]?.parent
    if (parent) {
      if (!chainsGroupbyParent[parent.chain]) {
        chainsGroupbyParent[parent.chain] = {}
      }
      for (const type of parent.types) {
        if (!chainsGroupbyParent[parent.chain][type]) {
          chainsGroupbyParent[parent.chain][type] = []
        }
        chainsGroupbyParent[parent.chain][type].push(chain)
      }
    }
  })

  peggedAssets.forEach(({ chains, category: pCategory }) => {
    chains.forEach((chain) => {
      if (!category || !chain) {
        chainsSet.add(chain)
      } else {
        if (pCategory?.toLowerCase() === category?.toLowerCase() && chainList.includes(chain)) {
          chainsSet.add(chain)
        }
      }
    })
  })

  let peggedChartDataByChain = []
  peggedChartDataByChain = await Promise.all(
    chainList.map(async (chain) => {
      for (let i = 0; i < 5; i++) {
        try {
          const res = await fetch(`${PEGGEDCHART_API}/${chain}`).then((resp) => resp.json())
          return res
        } catch (e) { }
      }
      throw new Error(`${PEGGEDCHART_API}/${chain} is broken`)
    })
  )

  let peggedAreaChainData = peggedChartDataByChain.reduce((total, charts, i) => {
    if (!charts.length) return total
    charts.forEach((chart) => {
      const chainName = chainList[i]
      if (chart.date > 1652241600 && chart.mcap) {
        total[chart.date] = total[chart.date] || {}
        total[chart.date][chainName] = chart.mcap
      }
    })
    return total
  }, {})

  peggedAreaChainData = Object.entries(peggedAreaChainData).map(([date, chart]) => {
    if (typeof chart === 'object') {
      return {
        date: date,
        ...chart,
      }
    }
  })

  let peggedMcapChartData = []
  peggedMcapChartData = await fetch(`${PEGGEDCHART_API}`).then((resp) => resp.json())

  let peggedAreaMcapData = {}
  peggedMcapChartData.map((chart) => {
    if (chart.date > 1596248105 && chart.mcap) {
      peggedAreaMcapData[chart.date] = peggedAreaMcapData[chart.date] || {}
      peggedAreaMcapData[chart.date]['Total Stablecoins Market Cap'] = chart.mcap
    }
  })

  peggedAreaMcapData = Object.keys(peggedAreaMcapData).map((date) => {
    return {
      date: date,
      ...peggedAreaMcapData[date],
    }
  })

  let chainDominances = {}
  peggedChartDataByChain.map((charts, i) => {
    const lastChart = charts[charts.length - 1]
    if (!lastChart) return
    const greatestChainMcap = lastChart.greatestChainMcap
    const chainName = chainList[i]
    chainDominances[chainName] = greatestChainMcap
  })

  const pegType = categoryToPegType[category]
  const stackedDataset = Object.entries(
    peggedChartDataByChain.reduce((total: IStackedDataset, charts, i) => {
      if (!charts.length) return total
      charts.forEach((chart) => {
        const chainName = chainList[i]
        const circulating = chart.mcap // should rename this variable; useCalcGroupExtraPeggedByDay accesses it
        const date = chart.date
        if (date < 1652241600) return
        if (circulating !== null && circulating !== 0) {
          if (total[date] == undefined) {
            total[date] = {}
          }
          const b = total[date][chainName]
          total[date][chainName] = { ...b, circulating: circulating ?? 0 }
        }
      })
      return total
    }, {})
  )

  const chainCirculatings = formatPeggedChainsData({
    pegType,
    chainList,
    peggedChartDataByChain,
    chainDominances,
    chainsData,
  })

  const peggedChartType = stackedDataset.length > 30 ? 'Area' : 'Pie'

  return {
    peggedcategory: category,
    chainCirculatings,
    chartData,
    peggedAreaChainData,
    peggedAreaMcapData,
    stackedDataset,
    peggedChartType,
    chainList,
    chainsGroupbyParent,
  }
}

export const getVolumeCharts = (data) => {
  const { tvl = [], staking = [], borrowed = [], pool2 = [], doublecounted = [] } = data || {}

  const chart = tvl.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)])

  const extraVolumesCharts = {
    staking: staking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
    borrowed: borrowed.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
    pool2: pool2.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
    doublecounted: doublecounted.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
  }

  return {
    chart,
    extraVolumesCharts,
  }
}

export async function getChainPageData(chain) {
  const [chartData, { protocols, chains }] = await Promise.all(
    [CHART_API + (chain ? '/' + chain : ''), PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json()))
  )

  const filteredProtocols = formatProtocolsData({ chain, protocols, removeBridges: true })

  const charts = getVolumeCharts(chartData)

  return {
    props: {
      ...(chain && { chain }),
      chainsSet: chains,
      filteredProtocols,
      ...charts,
    },
  }
}

export async function getOraclePageData(oracle = null) {
  try {
    const [{ chart = {}, oracles = {} }, { protocols }] = await Promise.all(
      [ORACLE_API, PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json()))
    )

    const oracleExists = !oracle || oracles[oracle]

    if (!oracleExists) {
      return {
        notFound: true,
      }
    }

    const filteredProtocols = formatProtocolsData({ oracle, protocols })

    let chartData = Object.entries(chart)

    const oraclesUnique = Object.entries(chartData[chartData.length - 1][1])
      .sort((a, b) => b[1].tvl - a[1].tvl)
      .map((orc) => orc[0])

    if (oracle) {
      let data = []
      chartData.forEach(([date, tokens]) => {
        const value = tokens[oracle]
        if (value) {
          data.push([date, value])
        }
      })
      chartData = data
    }

    const oraclesProtocols: IOracleProtocols = {}

    for (const orc in oracles) {
      oraclesProtocols[orc] = oracles[orc]?.length
    }

    let oracleLinks = [{ label: 'All', to: `/oracles` }].concat(
      oraclesUnique.map((o: string) => ({ label: o, to: `/oracles/${o}` }))
    )

    return {
      props: {
        tokens: oraclesUnique,
        tokenLinks: oracleLinks,
        token: oracle,
        tokensProtocols: oraclesProtocols,
        filteredProtocols,
        chartData,
      },
    }
  } catch (e) {
    console.log(e)
    return {
      notFound: true,
    }
  }
}

export async function getForkPageData(fork = null) {
  try {
    const [{ chart = {}, forks = {} }, { protocols }] = await Promise.all(
      [FORK_API, PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json()))
    )

    const forkExists = !fork || forks[fork]

    if (!forkExists) {
      return {
        notFound: true,
      }
    }

    let chartData = Object.entries(chart)

    const forksUnique = Object.entries(chartData[chartData.length - 1][1])
      .sort((a, b) => b[1].tvl - a[1].tvl)
      .map((fr) => fr[0])

    const protocolsData = formatProtocolsData({ protocols })

    let parentTokens = []

    if (fork) {
      let data = []
      chartData.forEach(([date, tokens]) => {
        const value = tokens[fork]
        if (value) {
          data.push([date, value])
        }
      })
      chartData = data
      const protocol = protocolsData.find((p) => p.name.toLowerCase() === fork.toLowerCase())
      if (protocol) {
        parentTokens.push(protocol)
      }
    } else {
      forksUnique.forEach((fork) => {
        const protocol = protocolsData.find((p) => p.name.toLowerCase() === fork.toLowerCase())
        if (protocol) {
          parentTokens.push(protocol)
        }
      })
    }

    const forksProtocols = {}

    for (const frk in forks) {
      forksProtocols[frk] = forks[frk]?.length
    }

    let forkLinks = [{ label: 'All', to: `/forks` }].concat(
      forksUnique.map((o: string) => ({ label: o, to: `/forks/${o}` }))
    )

    const filteredProtocols = formatProtocolsData({ fork, protocols })

    return {
      props: {
        tokens: forksUnique,
        tokenLinks: forkLinks,
        token: fork,
        tokensProtocols: forksProtocols,
        filteredProtocols,
        chartData,
        parentTokens,
      },
    }
  } catch (e) {
    console.log(e)
    return {
      notFound: true,
    }
  }
}

export const getProtocolsRaw = () => fetch(PROTOCOLS_API).then((r) => r.json())

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

export const getProtocol = async (protocolName: string) => {
  try {
    const data: IProtocol = await fetch(`${PROTOCOL_API}/${protocolName}`).then((r) => r.json())
    const tvl = data?.tvl ?? []
    if (tvl.length < 7) {
      const hourlyData = await fetch(`${HOURLY_PROTOCOL_API}/${protocolName}`).then((r) => r.json())
      return { ...hourlyData, isHourlyChart: true }
    } else return data
  } catch (e) {
    console.log(e)
  }
}

export const fuseProtocolData = (protocolData) => {
  const tvlBreakdowns = protocolData?.currentChainTvls ?? {}

  const tvl = protocolData?.tvl ?? []

  const tvlChartData = tvl.filter((item) => item.date).map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD])

  const historicalChainTvls = protocolData?.chainTvls ?? {}

  const tvlByChain =
    Object.entries(protocolData?.currentChainTvls ?? {})?.sort(
      (a: [string, number], b: [string, number]) => b[1] - a[1]
    ) ?? []

  const onlyChains = tvlByChain.filter((c) => {
    const name = c[0]

    if (name[0] === name[0]?.toLowerCase() || name.includes('-')) {
      return false
    } else return true
  })

  const chains = onlyChains.length === 0 ? protocolData.chains : [onlyChains[0][0]]

  return {
    ...protocolData,
    tvl: tvl.length > 0 ? tvl[tvl.length - 1]?.totalLiquidityUSD : 0,
    tvlChartData,
    tvlBreakdowns,
    tvlByChain,
    chains,
    historicalChainTvls,
  }
}

export const getPeggedAssets = () =>
  fetch(PEGGEDS_API + '?includeChains=true' + '&includePrices=true')
    .then((r) => r.json())
    .then(({ peggedAssets, chains }) => ({
      protocolsDict: peggedAssets.reduce((acc, curr) => {
        acc[standardizeProtocolName(curr.name)] = curr
        return acc
      }, {}),
      peggedAssets,
      chains,
    }))

export const getPeggedPrices = () => fetch(PEGGEDPRICES_API).then((r) => r.json())

export const getPeggedBridgeInfo = () =>
  fetch('https://cocoahomology-datasets.s3.amazonaws.com/bridgeInfo.json').then((r) => r.json())

export const getChainsPageData = async (category: string) => {
  const [res, { chainCoingeckoIds }] = await Promise.all(
    [PROTOCOLS_API, CONFIG_API].map((apiEndpoint) => fetch(apiEndpoint).then((r) => r.json()))
  )

  let categories = []
  for (const chain in chainCoingeckoIds) {
    chainCoingeckoIds[chain].categories?.forEach((category) => {
      if (!categories.includes(category)) {
        categories.push(category)
      }
    })
  }

  const categoryExists = categories.includes(category) || category === 'All' || category === 'Non-EVM'

  if (!categoryExists) {
    return {
      notFound: true,
    }
  } else {
    categories = [
      { label: 'All', to: '/chains' },
      { label: 'Non-EVM', to: '/chains/Non-EVM' },
    ].concat(categories.map((category) => ({ label: category, to: `/chains/${category}` })))
  }

  const chainsUnique: string[] = res.chains.filter((t: string) => {
    const chainCategories = chainCoingeckoIds[t]?.categories ?? []
    if (category === 'All') {
      return true
    } else if (category === 'Non-EVM') {
      return !chainCategories.includes('EVM')
    } else {
      return chainCategories.includes(category)
    }
  })

  let chainsGroupbyParent = {}
  chainsUnique.forEach((chain) => {
    const parent = chainCoingeckoIds[chain]?.parent
    if (parent) {
      if (!chainsGroupbyParent[parent.chain]) {
        chainsGroupbyParent[parent.chain] = {}
      }
      for (const type of parent.types) {
        if (!chainsGroupbyParent[parent.chain][type]) {
          chainsGroupbyParent[parent.chain][type] = []
        }
        chainsGroupbyParent[parent.chain][type].push(chain)
      }
    }
  })

  const chainsData: IChainData[] = await Promise.all(
    chainsUnique.map(async (elem: string) => {
      for (let i = 0; i < 5; i++) {
        try {
          return await fetch(`${CHART_API}/${elem}`).then((resp) => resp.json())
        } catch (e) { }
      }
      throw new Error(`${CHART_API}/${elem} is broken`)
    })
  )

  const chainMcaps = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(chainCoingeckoIds)
      .map((v: IChainGeckoId) => v.geckoId)
      .join(',')}&vs_currencies=usd&include_market_cap=true`
  ).then((res) => res.json())
  const numProtocolsPerChain = {}
  const extraPropPerChain = {}

  res.protocols.forEach((protocol: IProtocol) => {
    protocol.chains.forEach((chain) => {
      numProtocolsPerChain[chain] = (numProtocolsPerChain[chain] || 0) + 1
    })
    Object.entries(protocol.chainTvls).forEach(([propKey, propValue]) => {
      if (propKey.includes('-')) {
        const prop = propKey.split('-')[1].toLowerCase()
        const chain = propKey.split('-')[0]
        if (extraPropPerChain[chain] === undefined) {
          extraPropPerChain[chain] = {}
        }
        extraPropPerChain[chain][prop] = {
          tvl: (propValue.tvl || 0) + (extraPropPerChain[chain][prop]?.tvl ?? 0),
          tvlPrevDay: (propValue.tvlPrevDay || 0) + (extraPropPerChain[chain][prop]?.tvlPrevDay ?? 0),
          tvlPrevWeek: (propValue.tvlPrevWeek || 0) + (extraPropPerChain[chain][prop]?.tvlPrevWeek ?? 0),
          tvlPrevMonth: (propValue.tvlPrevMonth || 0) + (extraPropPerChain[chain][prop]?.tvlPrevMonth ?? 0),
        }
      }
    })
  })

  const tvlData = chainsData.map((d) => d.tvl)
  const chainTvls = chainsUnique
    .map((chainName, i) => {
      const tvl = getPrevTvlFromChart(tvlData[i], 0)
      const tvlPrevDay = getPrevTvlFromChart(tvlData[i], 1)
      const tvlPrevWeek = getPrevTvlFromChart(tvlData[i], 7)
      const tvlPrevMonth = getPrevTvlFromChart(tvlData[i], 30)
      const mcap = chainMcaps[chainCoingeckoIds[chainName]?.geckoId]?.usd_market_cap
      const mcaptvl = mcap && tvl && mcap / tvl

      return {
        tvl,
        tvlPrevDay,
        tvlPrevWeek,
        tvlPrevMonth,
        mcap: mcap || null,
        mcaptvl: mcaptvl || null,
        name: chainName,
        symbol: chainCoingeckoIds[chainName]?.symbol ?? '-',
        protocols: numProtocolsPerChain[chainName],
        extraTvl: extraPropPerChain[chainName] || {},
        change_1d: getPercentChange(tvl, tvlPrevDay),
        change_7d: getPercentChange(tvl, tvlPrevWeek),
        change_1m: getPercentChange(tvl, tvlPrevMonth),
      }
    })
    .sort((a, b) => b.tvl - a.tvl)

  const stackedDataset = Object.entries(
    chainsData.reduce((total: IStackedDataset, chains, i) => {
      const chainName = chainsUnique[i]
      Object.entries(chains).forEach(([tvlType, values]) => {
        values.forEach((value) => {
          if (value[0] < 1596248105) return
          if (total[value[0]] === undefined) {
            total[value[0]] = {}
          }
          const b = total[value[0]][chainName]
          total[value[0]][chainName] = { ...b, [tvlType]: value[1] }
        })
      })
      return total
    }, {})
  )

  return {
    props: {
      chainsUnique,
      chainTvls,
      stackedDataset,
      category,
      categories,
      chainsGroupbyParent,
    },
  }
}

export const getPeggedAssetPageData = async (category: string, peggedasset: string) => {
  const [res, { chainCoingeckoIds }] = await Promise.all(
    [`${PEGGED_API}/${peggedasset}`, CONFIG_API].map((apiEndpoint) => fetch(apiEndpoint).then((r) => r.json()))
  )

  let categories = []
  for (const chain in chainCoingeckoIds) {
    chainCoingeckoIds[chain].categories?.forEach((category) => {
      if (!categories.includes(category)) {
        categories.push(category)
      }
    })
  }

  const categoryExists = categories.includes(category) || category === 'All' || category === 'Non-EVM'

  if (!categoryExists) {
    return {
      notFound: true,
    }
  } else {
    categories = [
      { label: 'All', to: `/peggedasset/${peggedasset}` },
      { label: 'Non-EVM', to: `/peggedasset/${peggedasset}/Non-EVM` },
    ].concat(categories.map((category) => ({ label: category, to: `/peggedasset/${peggedasset}/${category}` })))
  }

  const chainsUnique: string[] = res.chains.filter((t: string) => {
    const chainCategories = chainCoingeckoIds[t]?.categories ?? []
    if (category === 'All') {
      return true
    } else if (category === 'Non-EVM') {
      return !chainCategories.includes('EVM')
    } else {
      return chainCategories.includes(category)
    }
  })

  let chainsGroupbyParent = {}
  chainsUnique.forEach((chain) => {
    const parent = chainCoingeckoIds[chain]?.parent
    if (parent) {
      if (!chainsGroupbyParent[parent.chain]) {
        chainsGroupbyParent[parent.chain] = {}
      }
      for (const type of parent.types) {
        if (!chainsGroupbyParent[parent.chain][type]) {
          chainsGroupbyParent[parent.chain][type] = []
        }
        chainsGroupbyParent[parent.chain][type].push(chain)
      }
    }
  })

  const chainsData: any[] = await Promise.all(
    chainsUnique.map(async (elem: string) => {
      return res.chainBalances[elem].tokens
    })
  )

  const bridgeInfo = await getPeggedBridgeInfo()
  const peggedSymbol = res.symbol
  const pegType = res.pegType
  const chainCirculatings = chainsUnique
    .map((chainName, i) => {
      const circulating: number = getPrevCirculatingFromChart(chainsData[i], 0, 'circulating', pegType)
      const unreleased: number = getPrevCirculatingFromChart(chainsData[i], 0, 'unreleased', pegType)
      let bridgedTo: number = getPrevCirculatingFromChart(chainsData[i], 0, 'bridgedTo', pegType)
      const bridges: any = getPrevCirculatingFromChart(chainsData[i], 0, 'bridgedTo', 'bridges')
      const circulatingPrevDay: number = getPrevCirculatingFromChart(chainsData[i], 1, 'circulating', pegType)
      const circulatingPrevWeek: number = getPrevCirculatingFromChart(chainsData[i], 7, 'circulating', pegType)
      const circulatingPrevMonth: number = getPrevCirculatingFromChart(chainsData[i], 30, 'circulating', pegType)
      const change_1d = getPercentChange(circulating, circulatingPrevDay)
      const change_7d = getPercentChange(circulating, circulatingPrevWeek)
      const change_1m = getPercentChange(circulating, circulatingPrevMonth)

      return {
        circulating,
        unreleased,
        change_1d,
        change_7d,
        change_1m,
        circulatingPrevDay,
        circulatingPrevWeek,
        circulatingPrevMonth,
        bridgedAmount: bridgedTo,
        bridges,
        name: chainName,
        symbol: chainCoingeckoIds[chainName]?.symbol ?? '-',
      }
    })
    .sort((a, b) => b.circulating - a.circulating)

  const stackedDataset = Object.entries(
    chainsData.reduce((total: IStackedDataset, chains, i) => {
      const chainName = chainsUnique[i]
      chains.forEach((circulating) => {
        const date = circulating.date
        if (date < 1652932800) return // data on all chains for an asset is on only backfilled to May 20, 2022
        if (total[date] === undefined) {
          total[date] = {}
        }
        const b = total[date][chainName]
        total[date][chainName] = {
          ...b,
          circulating: circulating.circulating ? circulating.circulating[pegType] ?? 0 : 0,
          unreleased: circulating.unreleased ? circulating.unreleased[pegType] ?? 0 : 0,
        }
      })
      return total
    }, {})
  )

  return {
    props: {
      chainsUnique,
      chainCirculatings,
      category,
      categories,
      stackedDataset,
      peggedSymbol,
      pegType,
      bridgeInfo,
    },
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

export async function getYieldPageData(query = null) {
  try {
    // note(!) the api supports direct queries of chain or projectName
    // however, i have no clue yet how to make sure that the chainList is complete for the
    // filter section on the PageViews. so to get around this for now i just always load the full
    // batch of data and filter on the next.js server side.
    // this only affects /chain/[chain] and /project/[project]. for /pool/[pool] we are filtering
    // on the db level (see `getYieldPoolData`)
    let pools = (await fetch(YIELD_POOLS_API).then((r) => r.json())).data

    // remove anchor cause UST dead
    pools = pools.filter((p) => p.project !== 'anchor')

    const chainList = [...new Set(pools.map((p) => p.chain))]
    const projectList = [...new Set(pools.map((p) => p.project))]

    // for chain, project and pool queries
    if (query !== null && Object.keys(query)[0] !== 'token') {
      const queryKey = Object.keys(query)[0]
      const queryVal = Object.values(query)[0]
      pools = pools.filter((p) => p[queryKey] === queryVal)
    }

    return {
      props: {
        pools,
        chainList,
        projectList,
      },
    }
  } catch (e) {
    console.log(e)
    return {
      notFound: true,
    }
  }
}

export async function fetchCGMarketsData() {
  const urls = []
  const maxPage = 10
  for (let page = 1; page <= maxPage; page++) {
    urls.push(`${CG_TOKEN_API.replace('<PLACEHOLDER>', `${page}`)}`)
  }

  const promises = urls.map((url) => fetch(url).then((resp) => resp.json()))
  return await Promise.all(promises)
}

export function getCGMarketsDataURLs() {
  const urls = []
  const maxPage = 10
  for (let page = 1; page <= maxPage; page++) {
    urls.push(`${CG_TOKEN_API.replace('<PLACEHOLDER>', `${page}`)}`)
  }
  return urls
}

export async function retryCoingeckoRequest(func, retries) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await func()
      return resp
    } catch (e) {
      if ((i + 1) % 3 === 0 && retries > 3) {
        await new Promise((resolve) => setTimeout(resolve, 10e3))
      }
      continue
    }
  }
  return {}
}

// Client Side
export const fetcher = (input: RequestInfo, init?: RequestInit) => fetch(input, init).then((res) => res.json())
export const arrayFetcher = (init?: RequestInit, ...urlArr: RequestInfo[]) => Promise.all(urlArr.map((url => fetcher(url, init))))

export const useFetchProtocolsList = () => {
  const { data, error } = useSWR(PROTOCOLS_API, fetcher)
  return { data, error, loading: !data && !error }
}

export const useFetchPeggedList = () => {
  const { data, error } = useSWR(PEGGEDS_API, fetcher)
  return { data, error, loading: !data && !error }
}

export const useFetchProtocol = (protocolName) => {
  const { data, error } = useSWR(protocolName ? `${PROTOCOL_API}/${protocolName}` : null, fetcher)

  const { data: hourlyData, error: hourlyDataError } = useSWR(
    protocolName && data?.length < 7 ? `${HOURLY_PROTOCOL_API}/${protocolName}` : null,
    fetcher
  )

  const loading = protocolName && ((!data && !error) || (data.length < 7 && (!hourlyData || !hourlyDataError)))

  return { data, error, loading }
}

export const useGeckoProtocol = (gecko_id, defaultCurrency = 'usd') => {
  const { data, error } = useSWR(
    gecko_id ? `https://api.coingecko.com/api/v3/simple/price?ids=${gecko_id}&vs_currencies=${defaultCurrency}` : null,
    fetcher
  )
  return { data, error, loading: gecko_id && !data && !error }
}

export const useDenominationPriceHistory = ({ geckoId, utcStartTime }: { geckoId?: string; utcStartTime: number }) => {
  let url = `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart/range?vs_currency=usd&from=${utcStartTime}&to=`

  // append end time to fetcher params to keep query key consistent b/w renders and avoid over fetching
  const { data, error } = useSWR(geckoId ? url : null, (url) => fetcher(url + Math.floor(Date.now() / 1000)))

  return { data, error, loading: geckoId && !data && !error }
}

// all unique pools
export const useYieldPoolsData = () => {
  const { data, error } = useSWR(YIELD_POOLS_API, fetcher)
  return { data, error, loading: !data && !error }
}
// single pool
export const useYieldPoolData = (poolId) => {
  const url = `${YIELD_POOLS_API}?pool=${poolId}`
  const { data, error } = useSWR(poolId ? url : null, fetcher)
  return { data, error, loading: !data && !error }
}

// single pool chart data
export const useYieldChartData = (poolId) => {
  const url = `${YIELD_CHART_API}/${poolId}`
  const { data, error } = useSWR(poolId ? url : null, fetcher)
  return { data, error, loading: !data && !error }
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
