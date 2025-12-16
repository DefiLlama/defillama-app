import { fetchCoinPrices } from '~/api'
import {
	COINS_PRICES_API,
	ETF_FLOWS_API,
	ETF_SNAPSHOT_API,
	LSD_RATES_API,
	PROTOCOL_API,
	PROTOCOL_EMISSION_API,
	PROTOCOL_EMISSIONS_API,
	PROTOCOL_EMISSIONS_LIST_API,
	PROTOCOLS_API,
	YIELD_POOLS_API
} from '~/constants'
import {
	batchFetchHistoricalPrices,
	capitalizeFirstLetter,
	getNDistinctColors,
	roundToNearestHalfHour,
	slug
} from '~/utils'
import { fetchJson } from '~/utils/async'
import { BasicPropsToKeep, formatProtocolsData } from './utils'

export const getAllProtocolEmissionsWithHistory = async ({
	startDate,
	endDate
}: {
	startDate?: number
	endDate?: number
} = {}) => {
	try {
		const res = await fetchJson(PROTOCOL_EMISSIONS_API)

		const coinPrices = await fetchCoinPrices(res.filter((p) => p.gecko_id).map((p) => `coingecko:${p.gecko_id}`))

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

					const coin = coinPrices[`coingecko:${protocol.gecko_id}`]

					return {
						...protocol,
						events: filteredEvents,
						tPrice: coin?.price ?? null,
						tSymbol: coin?.symbol ?? null
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

export const getProtocolEmissionsList = async () => {
	try {
		const res = await fetchJson(PROTOCOL_EMISSIONS_API)
		return res.map((protocol) => ({
			name: protocol.name,
			token: protocol.token
		}))
	} catch (e) {
		console.log(e)
		return []
	}
}

export const getAllProtocolEmissions = async ({
	startDate,
	endDate,
	getHistoricalPrices = true
}: {
	startDate?: number
	endDate?: number
	getHistoricalPrices?: boolean
} = {}) => {
	try {
		const res = await fetchJson(PROTOCOL_EMISSIONS_API)
		const coins = await fetchJson(
			`${COINS_PRICES_API}/current/${res
				.filter((p) => p.gecko_id)
				.map((p) => 'coingecko:' + p.gecko_id)
				.join(',')}`
		)

		const parsedRes = res

		const priceReqs = {}
		res.forEach((protocol) => {
			if (!getHistoricalPrices) return
			if (!protocol.gecko_id) return
			let lastEventTimestamp = protocol.events
				?.filter(
					(e) =>
						e.timestamp < Date.now() / 1000 - 7 * 24 * 60 * 60 &&
						e.category !== 'noncirculating' &&
						e.category !== 'farming'
				)
				.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp

			if (!lastEventTimestamp) return

			const earliestEvent = protocol.events?.sort((a, b) => a.timestamp - b.timestamp)[0]?.timestamp

			if (lastEventTimestamp === earliestEvent) return

			lastEventTimestamp = Math.floor(lastEventTimestamp / 86400) * 86400

			const daysRange = [...Array(7).keys()].map((i) => i + 1)
			const timestamps = [
				...daysRange.map((days) => lastEventTimestamp - days * 24 * 60 * 60),
				lastEventTimestamp,
				...daysRange.map((days) => lastEventTimestamp + days * 24 * 60 * 60)
			].sort((a, b) => a - b)

			priceReqs[`coingecko:${protocol.gecko_id}`] = timestamps
		})

		const historicalPrices = (await batchFetchHistoricalPrices(priceReqs)).results

		return parsedRes
			.map((protocol) => {
				try {
					if (protocol.events) {
						protocol.events = protocol.events.map((event) => ({
							...event,
							timestamp: roundToNearestHalfHour(event.timestamp)
						}))
					}
					let event = protocol.events?.find((e) => e.timestamp >= Date.now() / 1000)
					let lastEventTimestamp = protocol.events
						?.filter((e) => e.timestamp < Date.now() / 1000 - 7 * 24 * 60 * 60)
						.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp

					let lastEvent = []
					let upcomingEvent = []

					if (!event || (event.noOfTokens.length === 1 && event.noOfTokens[0] === 0)) {
						upcomingEvent = [{ timestamp: null }]
					} else {
						const comingEvents = protocol.events.filter((e) => e.timestamp === event.timestamp)
						upcomingEvent = [...comingEvents]
					}
					if (lastEventTimestamp) {
						lastEvent = protocol.events.filter(
							(e) => e.timestamp === lastEventTimestamp && e.category !== 'noncirculating' && e.category !== 'farming'
						)
					} else {
						lastEvent = []
					}

					let filteredEvents = protocol.events || []
					if (startDate) {
						filteredEvents = filteredEvents.filter((e) => e.timestamp >= startDate)
					}
					if (endDate) {
						filteredEvents = filteredEvents.filter((e) => e.timestamp <= endDate)
					}

					const coin = coins.coins['coingecko:' + protocol.gecko_id]
					const tSymbol = coin?.symbol ?? null
					const historicalPrice = historicalPrices[`coingecko:${protocol.gecko_id}`]
					//remove protocol.unlockEvents
					protocol.unlockEvents = null
					protocol.sources = null
					return {
						...protocol,
						upcomingEvent,
						events: filteredEvents,
						tPrice: coin?.price ?? null,
						historicalPrice:
							lastEvent.length > 0 && historicalPrice?.prices
								? historicalPrice.prices
										.sort((a, b) => a.timestamp - b.timestamp)
										.map((price) => [price.timestamp * 1000, price.price])
								: [],
						lastEvent,
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
		const list = await fetchJson(PROTOCOL_EMISSIONS_LIST_API)
		if (!list.includes(protocolName))
			return { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } }

		const allEmissions = await fetchJson(PROTOCOL_EMISSIONS_API)

		const res = await fetchJson(`${PROTOCOL_EMISSION_API}/${protocolName}`).then((r) => JSON.parse(r.body))

		const { metadata, name, futures } = res

		const documentedData = res.documentedData ?? {}
		const realTimeData = res.realTimeData ?? {}

		const protocolEmissions = { documented: {}, realtime: {} }
		const emissionCategories = { documented: [], realtime: [] }

		const prices = await fetchJson(`${COINS_PRICES_API}/current/${metadata.token}?searchWidth=4h`).catch((err) => {
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

		if (metadata.events) {
			metadata.events = metadata.events.map((event) => ({
				...event,
				timestamp: roundToNearestHalfHour(event.timestamp)
			}))
		}

		let upcomingEvent = []
		if (metadata?.events?.length > 0) {
			const now = Date.now() / 1000
			let event = metadata.events.find((e) => e.timestamp >= now)

			if (!event || (event.noOfTokens?.length === 1 && event.noOfTokens[0] === 0)) {
				upcomingEvent = [{ timestamp: null }]
			} else {
				const comingEvents = metadata.events.filter((e) => e.timestamp === event.timestamp)
				upcomingEvent = [...comingEvents]
			}
		} else {
			upcomingEvent = [{ timestamp: null }]
		}

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

		const allDocumentedColors = getNDistinctColors(pieChartData['documented'].length)
		for (let i = 0; i < pieChartData['documented'].length; i++) {
			stackColors['documented'][pieChartData['documented'][i].name] = allDocumentedColors[i]
		}
		const allRealtimeColors = getNDistinctColors(pieChartData['realtime'].length)
		for (let i = 0; i < pieChartData['realtime'].length; i++) {
			stackColors['realtime'][pieChartData['realtime'][i].name] = allRealtimeColors[i]
		}

		if (protocolName == 'looksrare') {
			tokenPrice.symbol = 'LOOKS'
		}

		return {
			chartData,
			pieChartData,
			stackColors,
			meta: allEmissions?.find((p) => p?.token === metadata?.token) ?? {},
			sources: metadata?.sources ?? [],
			notes: metadata?.notes ?? [],
			events: metadata?.events ?? [],
			token: metadata?.token ?? null,
			geckoId: res?.gecko_id ?? null,
			upcomingEvent,
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
			tokenPrice,
			unlockUsdChart: res.unlockUsdChart ?? null
		}
	} catch (e) {
		console.log(e)

		return { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } }
	}
}

// - used in /airdrops, /protocols, /recent, /top-gainers-and-losers, /top-protocols, /watchlist
export async function getSimpleProtocolsPageData(propsToKeep?: BasicPropsToKeep) {
	const { protocols, chains, parentProtocols } = await fetchJson(PROTOCOLS_API)

	const filteredProtocols = formatProtocolsData({
		protocols,
		protocolProps: propsToKeep
	})

	return { protocols: filteredProtocols, chains, parentProtocols }
}

// - used in /lsd
export async function getLSDPageData() {
	const [{ protocols }, { data: pools }, lsdRates] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		fetchJson(YIELD_POOLS_API),
		fetchJson(LSD_RATES_API)
	])

	// filter for LSDs
	const lsdProtocols = protocols
		.filter((p) => p.category === 'Liquid Staking' && p.chains.includes('Ethereum'))
		.map((p) => p.name)
		.filter((p) => !['StakeHound', 'Genius', 'SharedStake', 'VaultLayer'].includes(p))
		.concat('Crypto.com Liquid Staking')

	// get historical data
	const lsdProtocolsSlug = lsdProtocols.map((p) => slug(p))
	const history = await Promise.all(lsdProtocolsSlug.map((p) => fetchJson(`${PROTOCOL_API}/${p}`)))

	let lsdApy = pools
		.filter((p) => lsdProtocolsSlug.includes(p.project) && p.chain === 'Ethereum' && p.symbol.includes('ETH'))
		.concat(pools.find((i) => i.project === 'crypto.com-staked-eth'))
		.filter(Boolean)
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
									? 'Crypto.com Liquid Staking'
									: p.project === 'dinero-(pxeth)'
										? 'Dinero (pxETH)'
										: p.name
	}))

	const nameGeckoMapping = {}
	for (const p of history) {
		nameGeckoMapping[p.name] = p.name === 'Frax Ether' ? 'frax-share' : p.gecko_id
	}

	const allColors = getNDistinctColors(lsdProtocols.length)
	const colors: Record<string, string> = {}
	for (let i = 0; i < lsdProtocols.length; i++) {
		colors[lsdProtocols[i]] = allColors[i]
	}
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
	const [snapshot, flows] = await Promise.all([ETF_SNAPSHOT_API, ETF_FLOWS_API].map((url) => fetchJson(url)))

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
	const airdrops = await fetchJson('https://airdrops.llama.fi/config')

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
