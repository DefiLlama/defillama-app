import { capitalizeFirstLetter, getColorFromNumber, slug } from '~/utils'
import type { IFusedProtocolData, IProtocolResponse } from '~/api/types'
import {
	CATEGORY_API,
	HOURLY_PROTOCOL_API,
	PROTOCOLS_API,
	PROTOCOL_API,
	PROTOCOL_EMISSIONS_API,
	PROTOCOL_EMISSIONS_LIST_API,
	PROTOCOL_EMISSION_API,
	YIELD_POOLS_API,
	LSD_RATES_API,
	CHAINS_ASSETS,
	CHART_API,
	ETF_SNAPSHOT_API,
	ETF_FLOWS_API,
	CHAIN_ASSETS_FLOWS,
	BRIDGEINFLOWS_API,
	CATEGORY_PERFORMANCE_API,
	CATEGORY_COIN_PRICES_API,
	CATEGORY_INFO_API,
	COINS_INFO_API
} from '~/constants'
import { BasicPropsToKeep, formatProtocolsData } from './utils'
import { getFeesAndRevenueProtocolsByChain } from '~/api/categories/adaptors'
import { fetchWithErrorLogging } from '~/utils/async'
import { getDexVolumeByChain } from '../adaptors'
import { sluggify } from '~/utils/cache-client'

export const getProtocolsRaw = () => fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json())

export const getProtocols = () =>
	fetchWithErrorLogging(PROTOCOLS_API)
		.then((r) => r.json())
		.then(({ protocols, chains, parentProtocols }) => ({
			protocolsDict: protocols.reduce((acc, curr) => {
				acc[slug(curr.name)] = curr
				return acc
			}, {}),
			protocols,
			chains,
			parentProtocols
		}))

export const getProtocol = async (protocolName: string) => {
	const start = Date.now()
	try {
		const data: IProtocolResponse = await fetchWithErrorLogging(`${PROTOCOL_API}/${protocolName}`).then((res) =>
			res.json()
		)

		if (!data || (data as any).statusCode === 400) {
			throw new Error((data as any).body)
		}

		let isNewlyListedProtocol = true

		Object.values(data.chainTvls).forEach((chain) => {
			if (chain.tvl?.length > 7) {
				isNewlyListedProtocol = false
			}
		})

		if (data?.listedAt && new Date(data.listedAt * 1000).getTime() < Date.now() - 1000 * 60 * 60 * 24 * 7) {
			isNewlyListedProtocol = false
		}

		if (isNewlyListedProtocol && !data.isParentProtocol) {
			const hourlyData = await fetchWithErrorLogging(`${HOURLY_PROTOCOL_API}/${protocolName}`).then((res) => res.json())

			return { ...hourlyData, isHourlyChart: true }
		} else return data
	} catch (e) {
		console.log(`[ERROR] [${Date.now() - start}ms] <${PROTOCOL_API}/${protocolName}>`, e)

		return null
	}
}

export const getAllProtocolEmissionsWithHistory = async ({
	startDate,
	endDate
}: {
	startDate?: number
	endDate?: number
} = {}) => {
	try {
		const res = await fetchWithErrorLogging(PROTOCOL_EMISSIONS_API).then((res) => res.json())
		const coins = await fetchWithErrorLogging(
			`https://coins.llama.fi/prices/current/${res
				.filter((p) => p.gecko_id)
				.map((p) => 'coingecko:' + p.gecko_id)
				.join(',')}`
		).then((res) => res.json())

		return res
			.map((protocol) => {
				try {
					let filteredEvents = protocol.events || []
					if (startDate) {
						filteredEvents = filteredEvents.filter((e) => e.timestamp >= startDate)
					}
					if (endDate) {
						filteredEvents = filteredEvents.filter((e) => e.timestamp <= endDate)
					}

					filteredEvents.sort((a, b) => a.timestamp - b.timestamp)

					const coin = coins.coins['coingecko:' + protocol.gecko_id]
					const tSymbol = coin?.symbol ?? null

					return {
						...protocol,
						events: filteredEvents,
						tPrice: coin?.price ?? null,
						tSymbol
					}
				} catch (e) {
					console.log('error', protocol.name, e)
					return null
				}
			})
			.filter(Boolean)
			.sort((a, b) => {
				const x = a.events[0]?.timestamp
				const y = b.events[0]?.timestamp
				if (x === y) return 0
				if (x === null) return 1
				if (y === null) return -1
				return x < y ? -1 : 1
			})
	} catch (e) {
		console.log(e)
		return []
	}
}

export const getAllProtocolEmissions = async () => {
	try {
		const res = await fetchWithErrorLogging(PROTOCOL_EMISSIONS_API).then((res) => res.json())
		const coins = await fetchWithErrorLogging(
			`https://coins.llama.fi/prices/current/${res
				.filter((p) => p.gecko_id)
				.map((p) => 'coingecko:' + p.gecko_id)
				.join(',')}`
		).then((res) => res.json())
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
					const coin = coins.coins['coingecko:' + protocol.gecko_id]
					const tSymbol = coin?.symbol ?? null

					return {
						...protocol,
						upcomingEvent,
						events: protocol.events || [],
						tPrice: coin?.price ?? null,
						tSymbol
					}
				} catch (e) {
					console.log('error', protocol.name, e)
					return null
				}
			})
			.filter(Boolean)
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

		const allEmmisions = await fetchWithErrorLogging(PROTOCOL_EMISSIONS_API).then((r) => r.json())

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
	const protcolNames = filteredProtocols.map((p) => p.name)
	const filteredFees = feesRes?.filter((p) => protcolNames.includes(p.name)) ?? []
	const filteredVolumes = volumesRes?.protocols.filter((p) => protcolNames.includes(p.name)) ?? []

	return {
		categoryChart,
		filteredProtocols,
		chain: chain ?? 'All',
		protocols,
		fees: filteredFees,
		volumes: filteredVolumes,
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
				: p.project === 'dinero-(pxeth)'
				? 'Dinero (pxETH)'
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

interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

export async function getETFData() {
	const [snapshot, flows] = await Promise.all(
		[ETF_SNAPSHOT_API, ETF_FLOWS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
	)

	const maxDate = Math.max(...flows.map((item) => new Date(item.day).getTime()))

	const formattedDate = new Date(maxDate).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	})

	const processedSnapshot = snapshot
		.map((i) => ({
			...i,
			chain: [i.asset.charAt(0).toUpperCase() + i.asset.slice(1)]
		}))
		.sort((a, b) => b.flows - a.flows)

	const processedFlows = flows.reduce((acc, { gecko_id, day, total_flow_usd }) => {
		const timestamp = (new Date(day).getTime() / 86400 / 1000) * 86400
		acc[timestamp] = {
			date: timestamp,
			...acc[timestamp],
			[gecko_id.charAt(0).toUpperCase() + gecko_id.slice(1)]: total_flow_usd
		}
		return acc
	}, {})

	const totalsByAsset = processedSnapshot.reduce((acc: AssetTotals, item) => {
		acc[item.asset.toLowerCase()] = {
			aum: (acc[item.asset.toLowerCase()]?.aum || 0) + item.aum,
			flows: (acc[item.asset.toLowerCase()]?.flows || 0) + item.flows
		}
		return acc
	}, {})

	return {
		snapshot: processedSnapshot,
		flows: processedFlows,
		totalsByAsset,
		lastUpdated: formattedDate
	}
}

export async function getAirdropDirectoryData() {
	const airdrops = await fetchWithErrorLogging('https://airdrops.llama.fi/config').then((r) => r.json())

	const now = Date.now()
	return Object.values(airdrops).filter((i: { endTime?: number; isActive: boolean; page?: string }) => {
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
	const [assets, flows1d, inflows] = await Promise.all([
		fetchWithErrorLogging(CHAINS_ASSETS).then((r) => r.json()),
		fetchWithErrorLogging(CHAIN_ASSETS_FLOWS + '/24h').then((r) => r.json()),
		chain
			? fetchWithErrorLogging(`${BRIDGEINFLOWS_API}/${sluggify(chain)}/1d`)
					.then((res) => res.json())
					.then((data) => data.map((item) => ({ ...item.data, date: item.timestamp })))
					.catch(() => [])
			: []
	])
	const chainData = chain ? Object.entries(assets ?? {}).find((a) => slug(a[0]) === slug(chain))?.[1] ?? null : null

	const tokenInflowNames = new Set<string>()
	for (const inflow of inflows) {
		for (const token of Object.keys(inflow)) {
			if (token !== 'date') {
				tokenInflowNames.add(token)
			}
		}
	}

	return {
		chains: [
			{ label: 'All', to: '/bridged' },
			...Object.entries(assets ?? {})
				.sort(
					(a: any, b: any) =>
						Number(b[1].total?.total?.split('.')?.[0] ?? 0) - Number(a[1].total?.total?.split('.')?.[0] ?? 0)
				)
				.map((asset) => ({ label: asset[0], to: `/bridged/${slug(asset[0])}` }))
		],
		assets,
		flows1d,
		chainData,
		inflows,
		tokenInflowNames: Array.from(tokenInflowNames)
	}
}

export async function getCategoryInfo() {
	const data = await fetchWithErrorLogging(CATEGORY_INFO_API)
		.then((r) => r.json())
		.catch(() => [])
	return data
}

export async function getCategoryPerformance() {
	const performanceTimeSeries = Object.fromEntries(
		await Promise.all(
			['7', '30', 'ytd', '365'].map(async (period) => [
				period,
				await fetchWithErrorLogging(`${CATEGORY_PERFORMANCE_API}/${period}`)
					.then((r) => r.json())
					.catch(() => [])
			])
		)
	)

	const info = await fetchWithErrorLogging(CATEGORY_INFO_API)
		.then((r) => r.json())
		.catch(() => [])
	const getCumulativeChangeOfPeriod = (period, name) => performanceTimeSeries[period].slice(-1)[0][name] ?? null
	const pctChanges = info.map((i) => ({
		...i,
		change1W: getCumulativeChangeOfPeriod('7', i.name),
		change1M: getCumulativeChangeOfPeriod('30', i.name),
		change1Y: getCumulativeChangeOfPeriod('365', i.name),
		changeYtd: getCumulativeChangeOfPeriod('ytd', i.name)
	}))

	return {
		pctChanges,
		performanceTimeSeries,
		areaChartLegend: info.map((i) => i.name),
		isCoinPage: false
	}
}

export async function getCoinPerformance(categoryId) {
	// for coins per category we fetch the full 365 series per coin in a given category
	// we calculate the different pct change series in here which can all be derived from that single series
	// using different refernce prices (eg 7d, 30d, ytd, 365d)
	const calculateCumulativePercentageChange = (data, mapping, timeframe) => {
		// helper func to filter data based on timeframe
		const filterData = (data, timeframe) => {
			const now = new Date()
			if (timeframe === 'ytd') {
				const startOfYear = new Date(now.getFullYear(), 0, 1)
				return data.filter((item) => new Date(item[1]) >= startOfYear)
			} else if (typeof timeframe === 'number') {
				const startDate = new Date(now.setDate(now.getDate() - timeframe))
				return data.filter((item) => new Date(item[1]) >= startDate)
			}
			return data
		}

		const sortedData = data.sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())

		// filter on timeframe
		const filteredData = filterData(sortedData, timeframe)

		// group by id
		const groupedData = filteredData.reduce((acc, item) => {
			const [id, timestamp, price] = item
			if (!acc[id]) acc[id] = []
			acc[id].push({
				timestamp: Math.floor(new Date(timestamp).getTime() / 1000),
				price: parseFloat(price)
			})
			return acc
		}, {})

		// calculate cumulative percentage change for each id
		const results = {}
		Object.keys(groupedData).forEach((id) => {
			const prices = groupedData[id]
			const initialPrice = prices[0].price
			prices.forEach(({ timestamp, price }) => {
				if (!results[timestamp]) results[timestamp] = {}
				const percentageChange = ((price - initialPrice) / initialPrice) * 100
				results[timestamp][mapping[id]] = percentageChange
			})
		})

		// format for chart
		return Object.entries(results).map(([timestamp, changes]) => ({
			date: parseInt(timestamp),
			...(changes as object)
		}))
	}

	const prices = await fetchWithErrorLogging(`${CATEGORY_COIN_PRICES_API}/${categoryId}`).then((r) => r.json())
	const coinInfo = await fetchWithErrorLogging(`${COINS_INFO_API}/${categoryId}`).then((r) => r.json())

	const coinsInCategory = coinInfo.map((c) => [c.id, c.name])

	const coinsUniqueIncludingDenomCoins = Object.fromEntries(coinsInCategory)

	const ts7 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 7)
	const ts30 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 30)
	const ts365 = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, null)
	const tsYtd = calculateCumulativePercentageChange(prices, coinsUniqueIncludingDenomCoins, 'ytd')

	const performanceTimeSeries = {}
	performanceTimeSeries['7'] = ts7
	performanceTimeSeries['30'] = ts30
	performanceTimeSeries['365'] = ts365
	performanceTimeSeries['ytd'] = tsYtd

	const getCumulativeChangeOfPeriod = (period, name) => performanceTimeSeries[period].slice(-1)[0][name] ?? null
	const pctChanges = coinInfo.map((i) => ({
		...i,
		change1W: getCumulativeChangeOfPeriod('7', i.name),
		change1M: getCumulativeChangeOfPeriod('30', i.name),
		change1Y: getCumulativeChangeOfPeriod('365', i.name),
		changeYtd: getCumulativeChangeOfPeriod('ytd', i.name)
	}))

	return {
		pctChanges,
		performanceTimeSeries,
		areaChartLegend: coinInfo.filter((i) => !['Bitcoin', 'Ethereum', 'Solana'].includes(i.name)).map((i) => i.name),
		isCoinPage: true,
		categoryName: (await getCategoryInfo()).find((i) => i.id === categoryId).name
	}
}
