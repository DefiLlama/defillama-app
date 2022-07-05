import { getPercentChange, getPrevTvlFromChart, standardizeProtocolName } from '~/utils'
import type { IChainData, IChainGeckoId, IOracleProtocols, IProtocol, IStackedDataset } from '~/api/types'
import {
	CHART_API,
	CONFIG_API,
	FORK_API,
	HOURLY_PROTOCOL_API,
	ORACLE_API,
	PROTOCOLS_API,
	PROTOCOL_API
} from '~/constants'
import { formatProtocolsData } from './utils'

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
			categories: protocolCategories
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
		historicalChainTvls
	}
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
		chains: chains.filter((chain) => chainsSet.has(chain))
	}
}

export async function getSimpleProtocolsPageData(propsToKeep?: string[]) {
	const { protocols, chains } = await getProtocolsRaw()
	const filteredProtocols = formatProtocolsData({
		protocols,
		protocolProps: propsToKeep
	})
	return { protocols: filteredProtocols, chains }
}

export const getVolumeCharts = (data) => {
	const { tvl = [], staking = [], borrowed = [], pool2 = [], doublecounted = [] } = data || {}

	const chart = tvl.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)])

	const extraVolumesCharts = {
		staking: staking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		borrowed: borrowed.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		pool2: pool2.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		doublecounted: doublecounted.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)])
	}

	return {
		chart,
		extraVolumesCharts
	}
}

export async function getChainPageData(chain?: string) {
	const [chartData, { protocols, chains }] = await Promise.all(
		[CHART_API + (chain ? '/' + chain : ''), PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json()))
	)

	const filteredProtocols = formatProtocolsData({
		chain,
		protocols,
		removeBridges: true
	})

	const charts = getVolumeCharts(chartData)

	return {
		props: {
			...(chain && { chain }),
			chainsSet: chains,
			filteredProtocols,
			...charts
		}
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
				notFound: true
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
				chartData
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
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
				notFound: true
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
				parentTokens
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}

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
			notFound: true
		}
	} else {
		categories = [
			{ label: 'All', to: '/chains' },
			{ label: 'Non-EVM', to: '/chains/Non-EVM' }
		].concat(
			categories.map((category) => ({
				label: category,
				to: `/chains/${category}`
			}))
		)
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
				} catch (e) {}
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
					tvlPrevMonth: (propValue.tvlPrevMonth || 0) + (extraPropPerChain[chain][prop]?.tvlPrevMonth ?? 0)
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
				change_1m: getPercentChange(tvl, tvlPrevMonth)
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
			chainsGroupbyParent
		}
	}
}
