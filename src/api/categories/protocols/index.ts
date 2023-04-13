import {
	capitalizeFirstLetter,
	getColorFromNumber,
	getPercentChange,
	getPrevTvlFromChart,
	standardizeProtocolName
} from '~/utils'
import type {
	IChainData,
	IChainGeckoId,
	IFusedProtocolData,
	IOracleProtocols,
	IProtocolResponse,
	IStackedDataset,
	LiteProtocol
} from '~/api/types'
import {
	ACTIVE_USERS_API,
	CATEGORY_API,
	CHART_API,
	CONFIG_API,
	FORK_API,
	HOURLY_PROTOCOL_API,
	ORACLE_API,
	PROTOCOLS_API,
	PROTOCOL_API,
	PROTOCOL_EMISSIONS_API,
	PROTOCOL_EMISSIONS_LIST_API,
	PROTOCOL_EMISSION_API,
	YIELD_POOLS_API
} from '~/constants'
import { BasicPropsToKeep, formatProtocolsData } from './utils'
import {
	getChainPageData as getChainPageDataByType,
	getChainsPageData as getChainsPageDataByType
} from '~/api/categories/adaptors'
import { getPeggedAssets } from '../stablecoins'
import { formatProtocolsList } from '~/hooks/data/defi'
import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const getProtocolsRaw = () => fetch(PROTOCOLS_API).then((r) => r.json())

export const getProtocols = () =>
	fetch(PROTOCOLS_API)
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
		const data: IProtocolResponse = await fetch(`${PROTOCOL_API}/${protocolName}`).then((r) => r.json())

		let isNewlyListedProtocol = false

		Object.values(data.chainTvls).forEach((chain) => {
			if (chain.tvl?.length < 7) {
				isNewlyListedProtocol = true
			} else {
				isNewlyListedProtocol = false
			}
		})

		if (isNewlyListedProtocol && !data.isParentProtocol) {
			const hourlyData = await fetch(`${HOURLY_PROTOCOL_API}/${protocolName}`).then((r) => r.json())
			return { ...hourlyData, isHourlyChart: true }
		} else return data
	} catch (e) {
		console.log(e)
	}
}

export const getAllProtocolEmissions = async () => {
	try {
		const res = await fetch(`${PROTOCOL_EMISSIONS_API}`).then((res) => res.json())
		return res.map((protocol) => {
			const upcomingEvent = protocol.events.find((e) => e.timestamp >= Date.now() / 1000)

			const tSymbol =
				protocol.name === 'LooksRare' ? 'LOOKS' : protocol.tokenPrice?.coins?.[protocol.token]?.symbol ?? null

			return {
				...protocol,
				upcomingEvent: upcomingEvent || {},
				tPrice: protocol.tokenPrice?.coins?.[protocol.token]?.price ?? null,
				tSymbol
			}
		})
	} catch (e) {
		console.log(e)
		return []
	}
}

export const getProtocolEmissons = async (protocolName: string) => {
	try {
		const list = await fetch(PROTOCOL_EMISSIONS_LIST_API).then((r) => r.json())
		if (!list.includes(protocolName)) return { data: [], categories: [] }

		const res = await fetch(`${PROTOCOL_EMISSION_API}/${protocolName}`)
			.then((r) => r.json())
			.then((r) => JSON.parse(r.body))

		const { data, metadata, name } = res

		const protocolEmissions = {}
		const emissionCategories = []

		const prices = await fetch(`https://coins.llama.fi/prices/current/${metadata.token}?searchWidth=4h`)
			.then((res) => res.json())
			.catch((err) => {
				console.log(err)
				return {}
			})

		const tokenPrice = prices?.coins?.[metadata.token] ?? {}

		data.forEach((emission) => {
			const label = emission.label
				.split(' ')
				.map((l) => capitalizeFirstLetter(l))
				.join(' ')

			if (emissionCategories.includes(label)) {
				return
			}

			emissionCategories.push(label)

			emission.data.forEach((value) => {
				if (!protocolEmissions[value.timestamp]) {
					protocolEmissions[value.timestamp] = {}
				}

				protocolEmissions[value.timestamp] = { ...protocolEmissions[value.timestamp], [label]: value.unlocked }
			})
		})

		const chartData = Object.entries(protocolEmissions).map(([date, values]: [string, { [key: string]: number }]) => ({
			date,
			...values
		}))

		const pieChartData = Object.entries(chartData[chartData.length - 1] || {})
			.filter(([key]) => key !== 'date')
			.map(([name, value]) => ({ name, value }))

		const stackColors = {}

		pieChartData.forEach(({ name }, index) => {
			stackColors[name] = getColorFromNumber(index, 6)
		})

		if (protocolName == 'looksrare') {
			tokenPrice.symbol = 'LOOKS'
		}

		return {
			chartData,
			pieChartData,
			stackColors,
			sources: metadata?.sources ?? [],
			notes: metadata?.notes ?? [],
			events: metadata?.events ?? [],
			categories: emissionCategories,
			hallmarks: data.length > 0 ? [[Date.now() / 1000, 'Today']] : [],
			name: name || null,
			tokenPrice
		}
	} catch (e) {
		console.log(e)

		return { data: [], categories: [] }
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
		parentProtocols
	}
}
// - used in /airdrops, /protocols, /recent, /top-gainers-and-losers, /top-protocols, /watchlist
export async function getSimpleProtocolsPageData(propsToKeep?: BasicPropsToKeep) {
	const { protocols, chains } = await getProtocolsRaw()

	const filteredProtocols = formatProtocolsData({
		protocols,
		protocolProps: propsToKeep
	})
	return { protocols: filteredProtocols, chains }
}

const getExtraTvlCharts = (data) => {
	const {
		tvl = [],
		staking = [],
		borrowed = [],
		pool2 = [],
		vesting = [],
		offers = [],
		doublecounted = [],
		liquidstaking = [],
		dcAndLsOverlap = []
	} = data || {}

	const chart = tvl.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)])

	const extraTvlCharts = {
		staking: staking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		borrowed: borrowed.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		pool2: pool2.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		vesting: vesting.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		offers: offers.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		doublecounted: doublecounted.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		liquidstaking: liquidstaking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		dcAndLsOverlap: dcAndLsOverlap.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)])
	}

	return {
		chart,
		extraTvlCharts
	}
}

// - used in / and /[chain]
export async function getChainPageData(chain?: string) {
	const [chartData, { protocols, chains, parentProtocols }] = await Promise.all(
		[CHART_API + (chain ? '/' + chain : ''), PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json()))
	)

	const filteredProtocols = formatProtocolsData({
		chain,
		protocols,
		removeBridges: true
	})

	const charts = getExtraTvlCharts(chartData)

	const protocolsList = formatProtocolsList({
		protocols: filteredProtocols,
		parentProtocols,
		extraTvlsEnabled: {}
	})
		.slice(0, 30)
		.map((protocol) => {
			for (const prop in protocol) {
				if (protocol[prop] === undefined) {
					protocol[prop] = null
				}

				if (prop === 'subRows') {
					protocol[prop]?.map((subRow) => {
						for (const subProp in subRow) {
							if (subRow[subProp] === undefined) {
								subRow[subProp] = null
							}
						}

						return subRow
					})
				}
			}

			return protocol
		})

	return {
		props: {
			...(chain && { chain }),
			chainsSet: chains,
			protocolsList,
			...charts
		}
	}
}

// - used in /oracles and /oracles/[name]
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

		const colors = {}

		oraclesUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			props: {
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

// - used in /forks and /forks/[name]
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
			[CATEGORY_API, PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json()))
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

		const uniqueCategories = Object.keys(categories)
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

export const getNewChainsPageData = async (category: string) => {
	const [
		{ categories, chainTvls, ...rest },
		{ protocols: dexsProtocols },
		{ protocols: feesAndRevenueProtocols },
		{ chains: stablesChainData },
		activeUsers
	] = await Promise.all([
		fetch(`https://api.llama.fi/chains2/${category}`).then((res) => res.json()),
		getChainsPageDataByType('dexs'),
		getChainPageDataByType('fees'),
		getPeggedAssets(),
		fetch(ACTIVE_USERS_API).then((res) => res.json())
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
			chainTvls: chainTvls.map((chain) => {
				const { total24h, revenue24h } =
					feesAndRevenueChains.find((x) => x.name.toLowerCase() === chain.name.toLowerCase()) || {}

				const { total24h: dexsTotal24h } =
					dexsChains.find((x) => x.name.toLowerCase() === chain.name.toLowerCase()) || {}

				const users = Object.entries(activeUsers).find(
					([name]) => name.toLowerCase() === 'chain#' + chain.name.toLowerCase()
				)

				return {
					...chain,
					totalVolume24h: dexsTotal24h || 0,
					totalFees24h: total24h || 0,
					totalRevenue24h: revenue24h || 0,
					stablesMcap: stablesChainMcaps.find((x) => x.name.toLowerCase() === chain.name.toLowerCase())?.mcap ?? 0,
					users: (users?.[1] as any)?.users ?? 0
				}
			})
		}
	}
}

// used in /chains , /chains/[category]
// where category can be EVM, Non-EVM etc
export const getChainsPageData = async (category: string) => {
	const [res, { chainCoingeckoIds }] = await Promise.all(
		[PROTOCOLS_API, CONFIG_API].map((apiEndpoint) => fetch(apiEndpoint).then((r) => r.json()))
	)

	// get all chains by parent and not include them in categories below as we don't want to show these links, but user can access with url
	const chainsByParent = []

	// get all unique categories from api
	let allCategories: string[] = []
	for (const chain in chainCoingeckoIds) {
		chainCoingeckoIds[chain].categories?.forEach((cat) => {
			if (!allCategories.includes(cat)) {
				allCategories.push(cat)
			}
		})

		const parentChain = chainCoingeckoIds[chain].parent?.chain

		if (parentChain && !chainsByParent.includes(parentChain)) {
			chainsByParent.push(parentChain)
		}
	}

	// check if category exists
	const categoryExists =
		allCategories.includes(category) ||
		category === 'All' ||
		category === 'Non-EVM' ||
		chainsByParent.includes(category)

	// return if category not found
	if (!categoryExists) {
		return {
			notFound: true
		}
	}

	const categoryLinks = [
		{ label: 'All', to: '/chains' },
		{ label: 'Non-EVM', to: '/chains/Non-EVM' }
	].concat(
		allCategories.map((category) => ({
			label: category,
			to: `/chains/${category}`
		}))
	)

	// get all chains and filter them based on category
	const chainsUnique: string[] = res.chains.filter((t: string) => {
		const chainCategories = chainCoingeckoIds[t]?.categories ?? []

		if (category === 'All') {
			return true
		} else if (category === 'Non-EVM') {
			return !chainCategories.includes('EVM')
		} else if (allCategories.includes(category)) {
			return chainCategories.includes(category)
		} else {
			// filter chains like Polkadot and Kusama that are not defined as categories but can be accessed as from url
			return (
				chainCoingeckoIds[t]?.parent?.chain === category && chainsByParent.includes(chainCoingeckoIds[t]?.parent?.chain)
			)
		}
	})

	// group chains by parent like Ethereum -> [Arbitrum, Optimism] etc
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

	// get data of chains in given category
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

	// get mcaps of chains in given category
	const chainMcaps = await fetch(
		`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(chainCoingeckoIds)
			.map((v: IChainGeckoId) => v.geckoId)
			.join(',')}&vs_currencies=usd&include_market_cap=true`
	).then((res) => res.json())

	// calc no.of protocols present in each chains as well as extra tvl data like staking , pool2 etc
	const numProtocolsPerChain = {}
	const extraPropPerChain = {}
	res.protocols.forEach((protocol: LiteProtocol) => {
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

	// format chains data
	const tvlData = chainsData.map((d) => d.tvl)
	// data set for pie chart and table
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

	// format chains data to use in stacked area chart
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
			categories: categoryLinks,
			chainsGroupbyParent
		}
	}
}

// - used in /lsd
export async function getLSDPageData() {
	const [{ protocols }] = await Promise.all([PROTOCOLS_API].map((url) => fetch(url).then((r) => r.json())))
	const pools = (await fetch(YIELD_POOLS_API).then((r) => r.json())).data

	const lsdRates = await fetch('https://yields.llama.fi/lsdRatesX').then((r) => r.json())

	// filter for LSDs
	const lsdProtocols = protocols
		.filter((p) => (p.category === 'Liquid Staking' || ['Stafi'].includes(p.name)) && p.chains.includes('Ethereum'))
		.map((p) => p.name)
		.filter((p) => p !== 'Genius')

	// get historical data
	const lsdProtocolsSlug = lsdProtocols.map((p) => p.replace(/\s+/g, '-').toLowerCase())
	const history = await Promise.all(lsdProtocolsSlug.map((p) => fetch(`${PROTOCOL_API}/${p}`).then((r) => r.json())))

	const lsdApy = pools
		.filter((p) => lsdProtocolsSlug.includes(p.project) && p.chain === 'Ethereum' && p.symbol.includes('ETH'))
		.map((p) => ({
			...p,
			name: p.project
				.split('-')
				.map((i) =>
					i === 'stakewise' ? 'StakeWise' : i === 'eth' ? i.toUpperCase() : i.charAt(0).toUpperCase() + i.slice(1)
				)
				.join(' ')
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
