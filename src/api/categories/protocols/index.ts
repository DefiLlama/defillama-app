import { mapValues } from 'lodash'

import { capitalizeFirstLetter, getColorFromNumber, standardizeProtocolName } from '~/utils'
import type { IFusedProtocolData, IOracleProtocols, IProtocolResponse } from '~/api/types'
import {
	ACTIVE_USERS_API,
	CATEGORY_API,
	FORK_API,
	HOURLY_PROTOCOL_API,
	ORACLE_API,
	PROTOCOLS_API,
	PROTOCOL_API,
	PROTOCOL_EMISSIONS_API,
	PROTOCOL_EMISSIONS_LIST_API,
	PROTOCOL_EMISSION_API,
	YIELD_POOLS_API,
	LSD_RATES_API,
	CHAINS_ASSETS,
	CHART_API,
	ETF_OVERVIEW_API,
	ETF_HISTORY_API,
	CHAINS_API_V2,
	CHAIN_ASSETS_FLOWS,
	BRIDGEINFLOWS_API,
	CATEGORY_RETURNS_API,
	CATEGORY_RETURNS_CHART_API
} from '~/constants'
import { BasicPropsToKeep, formatProtocolsData } from './utils'
import {
	getChainPageData as getChainPageDataByType,
	getChainsPageData as getChainsPageDataByType
} from '~/api/categories/adaptors'
import { getPeggedAssets } from '../stablecoins'
import { fetchWithErrorLogging } from '~/utils/async'
import { fetchOverCache, fetchOverCacheJson } from '~/utils/perf'
import { getFeesAndRevenueProtocolsByChain } from '../fees'
import { getDexVolumeByChain } from '../dexs'
import { sluggify } from '~/utils/cache-client'

export const getProtocolsRaw = () => fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json())

export const getProtocols = () =>
	fetchWithErrorLogging(PROTOCOLS_API)
		.then((r) => r.json())
		.then(({ protocols, chains, parentProtocols }) => ({
			protocolsDict: protocols.reduce((acc, curr) => {
				acc[standardizeProtocolName(curr.name)] = curr
				return acc
			}, {}),
			protocols,
			chains,
			parentProtocols
		}))

export const getProtocol = async (protocolName: string) => {
	try {
		const data: IProtocolResponse = await fetchOverCache(`${PROTOCOL_API}/${protocolName}`).then((res) => res.json())

		if (!data || (data as any).statusCode === 400) {
			throw new Error((data as any).body)
		}

		let isNewlyListedProtocol = true

		Object.values(data.chainTvls).forEach((chain) => {
			if (chain.tvl?.length > 7) {
				isNewlyListedProtocol = false
			}
		})

		if (isNewlyListedProtocol && !data.isParentProtocol) {
			const hourlyData = await fetchOverCacheJson(`${HOURLY_PROTOCOL_API}/${protocolName}`)

			return { ...hourlyData, isHourlyChart: true }
		} else return data
	} catch (e) {
		console.log('[ERROR] generating ', `${PROTOCOL_API}/${protocolName}`, e)

		return null
	}
}

export const getAllProtocolEmissions = async () => {
	try {
		const res = await fetchWithErrorLogging(`${PROTOCOL_EMISSIONS_API}`).then((res) => res.json())
		const coins = await fetchWithErrorLogging(`https://coins.llama.fi/prices/current/${res.filter(p => p.gecko_id).map(p => "coingecko:" + p.gecko_id).join(',')}`).then((res) => res.json())
		const parsedRes = res
		return parsedRes
			.map((protocol) => {
				try {
					let event = protocol.events?.find((e) => e.timestamp >= Date.now() / 1000)
					let upcomingEvent = []

					if (!event || (event.noOfTokens.length === 1 && event.noOfTokens[0] === 0)) {
						upcomingEvent = [{ timestamp: null }]
					} else {
						const comingEvents = protocol.events.filter((e) => e.timestamp === event.timestamp)
						upcomingEvent = [...comingEvents]
					}
					const coin = coins.coins["coingecko:" + protocol.gecko_id]
					const tSymbol = coin?.symbol ?? null

					return {
						...protocol,
						upcomingEvent,
						tPrice: coin?.price ?? null,
						tSymbol
					}
				} catch (e) {
					console.log("error", protocol.name, e)
					return null
				}
			}).filter(Boolean)
			.sort((a, b) => {
				const x = a.upcomingEvent?.[0]?.timestamp
				const y = b.upcomingEvent?.[0]?.timestamp
				// equal items sort equally
				if (x === y) {
					return 0
				}

				// nulls sort after anything else
				if (x === null) {
					return 1
				}
				if (y === null) {
					return -1
				}

				return x < y ? -1 : 1
			})
	} catch (e) {
		console.log(e)
		return []
	}
}

export const getProtocolEmissons = async (protocolName: string) => {
	try {
		const list = await fetchWithErrorLogging(PROTOCOL_EMISSIONS_LIST_API).then((r) => r.json())
		if (!list.includes(protocolName))
			return { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } }

		const allEmmisions = await fetchWithErrorLogging(`${PROTOCOL_EMISSIONS_API}`).then((r) => r.json())

		const res = await fetchWithErrorLogging(`${PROTOCOL_EMISSION_API}/${protocolName}`)
			.then((r) => r.json())
			.then((r) => JSON.parse(r.body))

		const { metadata, name, futures } = res

		const documentedData = res.documentedData ?? {}
		const realTimeData = res.realTimeData ?? {}

		const protocolEmissions = { documented: {}, realtime: {} }
		const emissionCategories = { documented: [], realtime: [] }

		const prices = await fetchWithErrorLogging(`https://coins.llama.fi/prices/current/${metadata.token}?searchWidth=4h`)
			.then((res) => res.json())
			.catch((err) => {
				console.log(err)
				return {}
			})

		const tokenPrice = prices?.coins?.[metadata.token] ?? {}

		documentedData.data?.forEach((emission) => {
			const label = emission.label
				.split(' ')
				.map((l) => capitalizeFirstLetter(l))
				.join(' ')

			if (emissionCategories['documented'].includes(label)) {
				return
			}

			emissionCategories['documented'].push(label)

			emission.data.forEach((value) => {
				if (!protocolEmissions['documented'][value.timestamp]) {
					protocolEmissions['documented'][value.timestamp] = {}
				}

				protocolEmissions['documented'][value.timestamp] = {
					...protocolEmissions['documented'][value.timestamp],
					[label]: value.unlocked
				}
			})
		})

		realTimeData.data?.forEach((emission) => {
			const label = emission.label
				.split(' ')
				.map((l) => capitalizeFirstLetter(l))
				.join(' ')

			if (emissionCategories['realtime'].includes(label)) {
				return
			}

			emissionCategories['realtime'].push(label)

			emission.data.forEach((value) => {
				if (!protocolEmissions['realtime'][value.timestamp]) {
					protocolEmissions['realtime'][value.timestamp] = {}
				}

				protocolEmissions['realtime'][value.timestamp] = {
					...protocolEmissions['realtime'][value.timestamp],
					[label]: value.unlocked
				}
			})
		})

		const chartData = {
			documented: Object.entries(protocolEmissions['documented']).map(
				([date, values]: [string, { [key: string]: number }]) => ({
					date,
					...values
				})
			),
			realtime: Object.entries(protocolEmissions['realtime']).map(
				([date, values]: [string, { [key: string]: number }]) => ({
					date,
					...values
				})
			)
		}

		const pieChartData = {
			documented: Object.entries(chartData.documented[chartData.documented.length - 1] || {})
				.filter(([key]) => key !== 'date')
				.map(([name, value]) => ({ name, value })),
			realtime: Object.entries(chartData.realtime[chartData.realtime.length - 1] || {})
				.filter(([key]) => key !== 'date')
				.map(([name, value]) => ({ name, value }))
		}

		const stackColors = { documented: {}, realtime: {} }

		pieChartData['documented'].forEach(({ name }, index) => {
			stackColors['documented'][name] = getColorFromNumber(index, 6)
		})
		pieChartData['realtime'].forEach(({ name }, index) => {
			stackColors['realtime'][name] = getColorFromNumber(index, 6)
		})

		if (protocolName == 'looksrare') {
			tokenPrice.symbol = 'LOOKS'
		}

		return {
			chartData,
			pieChartData,
			stackColors,
			meta: allEmmisions?.find((p) => p?.token === metadata?.token) ?? {},
			sources: metadata?.sources ?? [],
			notes: metadata?.notes ?? [],
			events: metadata?.events ?? [],
			token: metadata?.token ?? null,
			geckoId: res?.gecko_id ?? null,
			tokenAllocation: {
				documented: documentedData.tokenAllocation ?? {},
				realtime: realTimeData.tokenAllocation ?? {}
			},
			futures: futures ?? {},
			categories: emissionCategories,
			categoriesBreakdown: res?.categories ?? null,
			hallmarks: {
				documented: documentedData.data?.length > 0 ? [[Date.now() / 1000, 'Today']] : [],
				realtime: realTimeData.data?.length > 0 ? [[Date.now() / 1000, 'Today']] : []
			},
			name: name || null,
			tokenPrice
		}
	} catch (e) {
		console.log(e)

		return { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } }
	}
}

export const fuseProtocolData = (protocolData: IProtocolResponse): IFusedProtocolData => {
	const tvlBreakdowns = protocolData?.currentChainTvls ?? {}

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

	const chains = onlyChains.length === 0 ? protocolData?.chains ?? [] : [onlyChains[0][0]]

	return {
		...protocolData,
		tvlBreakdowns,
		tvlByChain,
		chains,
		historicalChainTvls
	}
}

// used in /protocols/[category]
export async function getProtocolsPageData(category?: string, chain?: string) {
	const { protocols, chains, parentProtocols } = await getProtocols()
	const normalizedCategory = category?.toLowerCase().replace(' ', '_')
	const feesRes = await getFeesAndRevenueProtocolsByChain({
		chain
	})
	const volumesRes = await getDexVolumeByChain({
		chain,
		excludeTotalDataChart: true,
		excludeTotalDataChartBreakdown: true
	})

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

	let categoryChart = null
	if (chain) {
		try {
			categoryChart = (
				await fetchWithErrorLogging(`${CHART_API}/categories/${normalizedCategory}`).then((r) => r.json())
			)[chain?.toLowerCase()]
		} catch (e) {
			categoryChart = null
		}
	} else {
		const res = await fetchWithErrorLogging(`${CATEGORY_API}`).then((r) => r.json())
		categoryChart = Object.entries(res.chart)
			.map(([date, value]) => [date, value[category]?.tvl])
			.filter(([_, val]) => !!val)
	}

	let filteredProtocols = formatProtocolsData({ category, protocols, chain })

	return {
		categoryChart,
		filteredProtocols,
		chain: chain ?? 'All',
		protocols,
		fees: feesRes,
		volumes: volumesRes.protocols,
		category,
		chains: chains.filter((chain) => chainsSet.has(chain)),
		parentProtocols
	}
}
// - used in /airdrops, /protocols, /recent, /top-gainers-and-losers, /top-protocols, /watchlist
export async function getSimpleProtocolsPageData(propsToKeep?: BasicPropsToKeep) {
	const { protocols, chains, parentProtocols } = await getProtocolsRaw()

	const filteredProtocols = formatProtocolsData({
		protocols,
		protocolProps: propsToKeep
	})

	return { protocols: filteredProtocols, chains, parentProtocols }
}

// - used in /oracles and /oracles/[name]
export async function getOraclePageData(oracle = null, chain = null) {
	try {
		const [{ chart = {}, chainChart = {}, oracles = {}, chainsByOracle: chainsByOracleData }, { protocols }] =
			await Promise.all([ORACLE_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json())))

		const oracleExists = !oracle || oracles[oracle]

		if (!oracleExists) {
			return {
				notFound: true
			}
		}

		const filteredProtocols = formatProtocolsData({ oracle, protocols, chain })

		let chartData = Object.entries(chart)
		const chainChartData = chain
			? Object.entries(chainChart)
					.map(([date, data]) => {
						const chainName = chain
						const chainData = Object.entries(data[oracle] || {})
							.map(([name, value]) =>
								name.includes(chainName) ? [name.replace(chainName, '').replace('-', '') || 'tvl', value] : null
							)
							.filter(Boolean)
						return Object.values(chainData).length ? [date, Object.fromEntries(chainData)] : null
					})
					.filter(Boolean)
			: null

		const oraclesUnique = Object.entries(chartData[chartData.length - 1][1])
			.sort((a, b) => b[1].tvl - a[1].tvl)
			.map((orc) => orc[0])

		const chainsByOracle = mapValues(
			protocols.reduce((acc, curr) => {
				if (curr.oracles) {
					curr.oracles.forEach((oracle) => {
						if (!acc[oracle]) {
							acc[oracle] = []
						}
						acc[oracle].push(curr.chains)
					})
				}
				return acc
			}, {}),
			(chains, oracle) => chainsByOracleData?.[oracle] ?? [...new Set(chains.flat())]
		)

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

		const uniqueChains = [...new Set(Object.values(chainsByOracle).flat())]

		let oracleLinks = oracle
			? [{ label: 'All chains', to: `/oracles/${oracle}` }].concat(
					chainsByOracle[oracle].map((c: string) => ({ label: c, to: `/oracles/${oracle}/${c}` }))
			  )
			: [{ label: 'All', to: `/oracles/` }].concat(
					uniqueChains.map((c: string) => ({ label: c, to: `/oracles/chain/${c}` }))
			  )

		const colors = {}

		oraclesUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			props: {
				chain: chain ?? null,
				chainChartData,
				chainsByOracle,
				tokens: oraclesUnique,
				tokenLinks: oracleLinks,
				token: oracle,
				tokensProtocols: oraclesProtocols,
				filteredProtocols,
				chartData,
				oraclesColors: colors
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}

export async function getOraclePageDataByChain(chain: string) {
	try {
		const [{ chart = {}, chainChart = {}, oracles = {}, chainsByOracle: chainsByOracleData }, { protocols }] =
			await Promise.all([ORACLE_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json())))

		const filteredProtocols = formatProtocolsData({ protocols, chain })

		let chartData = Object.entries(chart)
		const chainChartData = chain
			? Object.entries(chainChart)
					.map(([date, data]) => {
						const chainName = chain
						const chainData = Object.entries(data)
							.map(([oracle, dayData]) => {
								const chainData = Object.entries(dayData)
									.map(([name, value]) =>
										name.includes(chainName) ? [name.replace(chainName, '').replace('-', '') || 'tvl', value] : null
									)
									.filter(Boolean)
								return Object.values(chainData).length ? [oracle, Object.fromEntries(chainData)] : null
							})
							.filter(Boolean)
						return Object.values(chainData).length ? [date, Object.fromEntries(chainData)] : null
					})
					.filter(Boolean)
			: null

		const chainsByOracle = mapValues(
			protocols.reduce((acc, curr) => {
				if (curr.oracles) {
					curr.oracles.forEach((oracle) => {
						if (!acc[oracle]) {
							acc[oracle] = []
						}
						acc[oracle].push(curr.chains)
					})
				}
				return acc
			}, {}),
			(chains, oracle) => chainsByOracleData?.[oracle] ?? [...new Set(chains.flat())]
		)

		const oraclesUnique = Object.entries(chartData[chartData.length - 1][1])
			.sort((a, b) => b[1].tvl - a[1].tvl)
			.map((orc) => orc[0])
			.filter((orc) => chainsByOracle[orc]?.includes(chain))

		const oraclesProtocols: IOracleProtocols = {}

		for (const orc in oracles) {
			oraclesProtocols[orc] = protocols.filter((p) => p.oracles?.includes(orc) && p.chains.includes(chain)).length
		}

		const uniqueChains = [...new Set(Object.values(chainsByOracle).flat())]

		const oracleLinks = [{ label: 'All chains', to: `/oracles/` }].concat(
			uniqueChains.map((c: string) => ({ label: c, to: `/oracles/chain/${c}` }))
		)

		const colors = {}

		oraclesUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			props: {
				chain: chain ?? null,
				chainChartData,
				chainsByOracle,
				tokens: oraclesUnique,
				tokenLinks: oracleLinks,
				tokensProtocols: oraclesProtocols,
				filteredProtocols,
				chartData: chainChartData,
				oraclesColors: colors
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}
// - used in /forks and /forks/[name]
export async function getForkPageData(fork = null) {
	try {
		const [{ chart = {}, forks = {} }, { protocols }] = await Promise.all(
			[FORK_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
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

		const colors = {}

		forksUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			props: {
				tokens: forksUnique,
				tokenLinks: forkLinks,
				token: fork,
				tokensProtocols: forksProtocols,
				filteredProtocols,
				chartData,
				parentTokens,
				forkColors: colors
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}

// - used in /categories and /categories/[name]
export async function getCategoriesPageData(category = null) {
	try {
		const [{ chart = {}, categories = {} }] = await Promise.all(
			[CATEGORY_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
		)

		const categoryExists = !category || categories[category]

		if (!categoryExists) {
			return {
				notFound: true
			}
		}

		let chartData = Object.entries(chart)

		if (category) {
			let data = []

			chartData.forEach(([date, tokens]) => {
				const value = tokens[category]
				if (value) {
					data.push([date, value])
				}
			})
			chartData = data
		}

		const uniqueCategories = Object.keys(categories).filter((c) => c !== 'CEX')
		const colors = {}

		Object.keys(categories).map((c, index) => {
			colors[c] = getColorFromNumber(index, 9)
		})

		return { chartData, categoryColors: colors, uniqueCategories }
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}

interface IChainGroups {
	[parent: string]: {
		[type: string]: string[]
	}
}

interface INumOfProtocolsPerChain {
	[protocol: string]: number
}

interface IExtraPropPerChain {
	[chain: string]: {
		[prop: string]: {
			tvl: number
			tvlPrevDay?: number
			tvlPrevWeek?: number
			tvlPrevMonth?: number
		}
	}
}

export const getNewChainsPageData = async (category: string) => {
	const [
		{ categories, chainTvls, ...rest },
		{ protocols: dexsProtocols },
		{ protocols: feesAndRevenueProtocols },
		{ chains: stablesChainData },
		activeUsers,
		chainsAssets,
		chainNftsVolume
	] = await Promise.all([
		fetchWithErrorLogging(`https://api.llama.fi/chains2/${category}`).then((res) => res.json()),
		getChainsPageDataByType('dexs'),
		getChainPageDataByType('fees'),
		getPeggedAssets(),
		fetchWithErrorLogging(ACTIVE_USERS_API).then((res) => res.json()),
		fetchWithErrorLogging(CHAINS_ASSETS).then((res) => res.json()),
		fetchWithErrorLogging(`https://defillama-datasets.llama.fi/temp/chainNfts`).then((res) => res.json())
	])

	const categoryLinks = [
		{ label: 'All', to: '/chains' },
		{ label: 'Non-EVM', to: '/chains/Non-EVM' }
	].concat(
		categories.map((category) => ({
			label: category,
			to: `/chains/${category}`
		}))
	)

	const colors = {}

	rest.chainsUnique.forEach((chain, index) => {
		colors[chain] = getColorFromNumber(index, 10)
	})

	colors['Others'] = '#AAAAAA'

	const feesAndRevenueChains = feesAndRevenueProtocols.filter((p) => p.category === 'Chain')
	const dexsChains = dexsProtocols
	const stablesChainMcaps = stablesChainData.map((chain) => {
		return {
			name: chain.name,
			mcap: Object.values(chain.totalCirculatingUSD).reduce((a: number, b: number) => a + b)
		}
	})

	return {
		props: {
			...rest,
			category,
			categories: categoryLinks,
			colorsByChain: colors,
			chainAssets: chainsAssets ?? null,
			chainTvls: chainTvls.map((chain) => {
				const name = chain.name.toLowerCase()
				const totalAssets = chainsAssets[name]?.total?.total ?? null
				const nftVolume = chainNftsVolume[name] ?? null
				const { total24h, revenue24h } = feesAndRevenueChains.find((x) => x.name.toLowerCase() === name) || {}

				const { total24h: dexsTotal24h } = dexsChains.find((x) => x.name.toLowerCase() === name) || {}

				const users = activeUsers['chain#' + name]

				return {
					...chain,
					totalAssets: totalAssets ? +Number(totalAssets).toFixed(2) : null,
					nftVolume: nftVolume ? +Number(nftVolume).toFixed(2) : null,
					totalVolume24h: dexsTotal24h || 0,
					totalFees24h: total24h || 0,
					totalRevenue24h: revenue24h || 0,
					stablesMcap: stablesChainMcaps.find((x) => x.name.toLowerCase() === name)?.mcap ?? 0,
					users: users?.users?.value ?? 0
				}
			})
		}
	}
}

// - used in /lsd
export async function getLSDPageData() {
	const [{ protocols }] = await Promise.all(
		[PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
	)
	const pools = (await fetchWithErrorLogging(YIELD_POOLS_API).then((r) => r.json())).data

	const lsdRates = await fetchWithErrorLogging(LSD_RATES_API).then((r) => r.json())

	// filter for LSDs
	const lsdProtocols = protocols
		.filter((p) => p.category === 'Liquid Staking' && p.chains.includes('Ethereum'))
		.map((p) => p.name)
		.filter((p) => !['StakeHound', 'Genius', 'SharedStake'].includes(p))
		.concat('Crypto.com Staked ETH')

	// get historical data
	const lsdProtocolsSlug = lsdProtocols.map((p) => p.replace(/\s+/g, '-').toLowerCase())
	const history = await Promise.all(
		lsdProtocolsSlug.map((p) => fetchWithErrorLogging(`${PROTOCOL_API}/${p}`).then((r) => r.json()))
	)

	let lsdApy = pools
		.filter((p) => lsdProtocolsSlug.includes(p.project) && p.chain === 'Ethereum' && p.symbol.includes('ETH'))
		.concat(pools.find((i) => i.project === 'crypto.com-staked-eth'))
		.map((p) => ({
			...p,
			name: p.project
				.split('-')
				.map((i) =>
					i === 'stakewise' ? 'StakeWise' : i === 'eth' ? i.toUpperCase() : i.charAt(0).toUpperCase() + i.slice(1)
				)
				.join(' ')
		}))
	lsdApy = lsdApy.map((p) => ({
		...p,
		name:
			p.project === 'binance-staked-eth'
				? 'Binance staked ETH'
				: p.project === 'bedrock-unieth'
				? 'Bedrock uniETH'
				: p.project === 'mantle-staked-eth'
				? 'Mantle Staked ETH'
				: p.project === 'dinero-(pirex-eth)'
				? 'Dinero (Pirex ETH)'
				: p.project === 'mev-protocol'
				? 'MEV Protocol'
				: p.project === 'crypto.com-staked-eth'
				? 'Crypto.com Staked ETH'
				: p.name
	}))

	const nameGeckoMapping = {}
	for (const p of history) {
		nameGeckoMapping[p.name] = p.name === 'Frax Ether' ? 'frax-share' : p.gecko_id
	}

	const colors = {}
	lsdProtocols.forEach((protocol, index) => {
		colors[protocol] = getColorFromNumber(index, 10)
	})

	colors['Others'] = '#AAAAAA'

	return {
		props: {
			chartData: history,
			lsdColors: colors,
			lsdRates,
			nameGeckoMapping,
			lsdApy
		}
	}
}

export async function getETFData() {
	const [overview, history] = await Promise.all(
		[ETF_OVERVIEW_API, ETF_HISTORY_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
	)

	const totalAum = overview.reduce((acc, a) => acc + a.aum, 0)
	const aumOverview = overview.map((i) => ({ name: i.ticker, value: i.aum }))
	const volumeOverview = overview.map((i) => ({ name: i.ticker, value: i.volume }))

	const reformat = (fieldName) => {
		let totalValuesByTimestamp = {}
		history.forEach((entry) => {
			if (!totalValuesByTimestamp[entry.timestamp]) {
				totalValuesByTimestamp[entry.timestamp] = 0
			}
			totalValuesByTimestamp[entry.timestamp] += entry[fieldName]
		})

		let reformattedData = {}
		history.forEach((entry) => {
			const timestamp = entry.timestamp
			const ticker = entry.ticker
			const value = entry[fieldName]
			const totalValueDay = totalValuesByTimestamp[timestamp]

			if (!reformattedData[timestamp]) {
				reformattedData[timestamp] = { date: timestamp }
			}
			// relative
			if (fieldName === 'flows') {
				reformattedData[timestamp][ticker] = value
			} else {
				reformattedData[timestamp][ticker] = (value / totalValueDay) * 100
			}
		})

		return Object.values(reformattedData)
	}

	const aumHistory = reformat('aum')
	const volumeHistory = reformat('volume')
	const flowsHistory = reformat('flows').reduce((acc, { date, ...values }) => {
		acc[date] = values
		return acc
	}, {})

	const tickerColors = {}
	overview
		.map((i) => i.ticker)
		.forEach((ticker, index) => {
			tickerColors[ticker] = getColorFromNumber(index, 11)
		})

	const tickers = Object.keys(tickerColors)

	const barChartStacks = {}
	for (const ticker of tickers) {
		barChartStacks[ticker] = 'A'
	}

	return {
		props: {
			overview,
			totalAum,
			aumOverview,
			volumeOverview,
			aumHistory,
			volumeHistory,
			flowsHistory,
			barChartStacks,
			tickers,
			tickerColors
		}
	}
}

export async function getAirdropDirectoryData() {
	const airdrops = await fetchWithErrorLogging('https://airdrops.llama.fi/config').then((r) => r.json())

	const now = Date.now()
	return Object.values(airdrops).filter((i: { endTime?: number, isActive: boolean, page?: string }) => {
		if (i.isActive === false || !i.page) return false
		if (!i.endTime) return true
		return i.endTime < 1e12 ? i.endTime * 1000 > now : i.endTime > now
	})
}

export function formatGovernanceData(data: {
	proposals: Array<{ scores: Array<number>; choices: Array<string>; id: string }>
	stats: {
		months: {
			[date: string]: {
				total?: number
				successful?: number
				proposals: Array<string>
			}
		}
	}
}) {
	const proposals = Object.values(data.proposals).map((proposal) => {
		const winningScore = [...proposal.scores].sort((a, b) => b - a)[0]
		const totalVotes = proposal.scores.reduce((acc, curr) => (acc += curr), 0)

		return {
			...proposal,
			winningChoice: winningScore ? proposal.choices[proposal.scores.findIndex((x) => x === winningScore)] : '',
			winningPerc:
				totalVotes && winningScore ? `(${Number(((winningScore / totalVotes) * 100).toFixed(2))}% of votes)` : ''
		}
	})

	const activity = Object.entries(data.stats.months || {}).map(([date, values]) => ({
		date: Math.floor(new Date(date).getTime() / 1000),
		Total: values.total || 0,
		Successful: values.successful || 0
	}))

	const maxVotes = Object.entries(data.stats.months || {}).map(([date, values]) => {
		let maxVotes = 0
		values.proposals?.forEach((proposal) => {
			const votes = proposals.find((p) => p.id === proposal)?.['scores_total'] ?? 0

			if (votes > maxVotes) {
				maxVotes = votes
			}
		})

		return {
			date: Math.floor(new Date(date).getTime() / 1000),
			'Max Votes': maxVotes.toFixed(2)
		}
	})

	return { maxVotes, activity, proposals }
}

export async function getChainsBridged(chain?: string) {
	const [assets, chains, flows1d, inflows] = await Promise.all([
		fetchWithErrorLogging(CHAINS_ASSETS).then((r) => r.json()),
		fetchWithErrorLogging(`${CHAINS_API_V2}/All`).then((r) => r.json()),
		fetchWithErrorLogging(CHAIN_ASSETS_FLOWS + '/24h').then((r) => r.json()),
		chain
			? fetchWithErrorLogging(`${BRIDGEINFLOWS_API}/${sluggify(chain)}/1d`)
					.then((res) => res.json())
					.then((data) => data.map((item) => ({ ...item.data, date: item.timestamp })))
			: []
	])
	const chainData = assets[chain] ?? null
	const tokenInflowNames = new Set<string>()
	for (const inflow of inflows) {
		for (const token of Object.keys(inflow)) {
			if (token !== 'date') {
				tokenInflowNames.add(token)
			}
		}
	}

	return { chains, assets, flows1d, chainData, inflows, tokenInflowNames: Array.from(tokenInflowNames) }
}

export async function getCategoryReturns() {
	const performance = await fetchWithErrorLogging(CATEGORY_RETURNS_API).then((r) => r.json())

	return performance
}

export async function getCategoryChartData() {
	const chart = await fetchWithErrorLogging(CATEGORY_RETURNS_CHART_API).then((r) => r.json())

	return chart
}
