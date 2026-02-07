import { fetchCoinPrices as fetchCoinPricesBatched } from '~/api'
import {
	COINS_PRICES_API,
	PROTOCOL_EMISSION_API,
	PROTOCOL_EMISSIONS_API,
	PROTOCOL_EMISSIONS_LIST_API
} from '~/constants'
import { batchFetchHistoricalPrices, capitalizeFirstLetter, getNDistinctColors, roundToNearestHalfHour } from '~/utils'
import { fetchJson } from '~/utils/async'

type EmissionsDataset = { source: Array<Record<string, number | null>>; dimensions: string[] }
type EmissionsChartConfig = Array<{
	type: 'line'
	name: string
	encode: { x: 'timestamp'; y: string }
	color: string | undefined
	stack: string
}>

function buildEmissionsDataset(
	chartData: Array<{ timestamp: number; [key: string]: number }>,
	stacks: string[]
): EmissionsDataset {
	return {
		source: chartData as Array<Record<string, number | null>>,
		dimensions: ['timestamp', ...stacks]
	}
}

function buildEmissionsCharts(stacks: string[], colors: Record<string, string>): EmissionsChartConfig {
	return stacks.map((name) => ({
		type: 'line' as const,
		name,
		encode: { x: 'timestamp' as const, y: name },
		color: colors[name],
		stack: 'A'
	}))
}

export async function getProtocolUnlockUsdChart(protocolName: string): Promise<any[] | null> {
	if (!protocolName) return null
	const res = await fetchJson(`${PROTOCOL_EMISSION_API}/${protocolName}`)
		.then((r) => JSON.parse(r.body))
		.catch(() => null as any)
	return res?.unlockUsdChart ?? null
}

export async function getProtocolEmissionsCharts(protocolName: string): Promise<{
	chartData: {
		documented: Array<{ timestamp: number; [label: string]: number }>
		realtime: Array<{ timestamp: number; [label: string]: number }>
	}
	unlockUsdChart: any[] | null
}> {
	const empty = { chartData: { documented: [], realtime: [] }, unlockUsdChart: null }
	if (!protocolName) return empty

	const res = await fetchJson(`${PROTOCOL_EMISSION_API}/${protocolName}`)
		.then((r) => JSON.parse(r.body))
		.catch(() => null as any)
	if (!res) return empty

	const documentedData = res.documentedData ?? {}
	const realTimeData = res.realTimeData ?? {}

	const protocolEmissions = {
		documented: {} as Record<number, Record<string, number>>,
		realtime: {} as Record<number, Record<string, number>>
	}

	for (const emission of documentedData.data ?? []) {
		const label = emission.label
			.split(' ')
			.map((l) => capitalizeFirstLetter(l))
			.join(' ')
		for (const value of emission.data ?? []) {
			const ts = value.timestamp
			const entry = protocolEmissions.documented[ts] ?? (protocolEmissions.documented[ts] = {})
			entry[label] = value.unlocked
		}
	}

	for (const emission of realTimeData.data ?? []) {
		const label = emission.label
			.split(' ')
			.map((l) => capitalizeFirstLetter(l))
			.join(' ')
		for (const value of emission.data ?? []) {
			const ts = value.timestamp
			const entry = protocolEmissions.realtime[ts] ?? (protocolEmissions.realtime[ts] = {})
			entry[label] = value.unlocked
		}
	}

	const documentedChart: Array<{ timestamp: number; [key: string]: number }> = []
	for (const date in protocolEmissions.documented) {
		documentedChart.push({ timestamp: +date * 1e3, ...protocolEmissions.documented[+date] })
	}
	const realtimeChart: Array<{ timestamp: number; [key: string]: number }> = []
	for (const date in protocolEmissions.realtime) {
		realtimeChart.push({ timestamp: +date * 1e3, ...protocolEmissions.realtime[+date] })
	}

	return {
		chartData: { documented: documentedChart, realtime: realtimeChart },
		unlockUsdChart: res.unlockUsdChart ?? null
	}
}

export async function getProtocolEmissionsForCharts(protocolName: string) {
	const empty = {
		chartData: { documented: [], realtime: [] },
		categories: { documented: [], realtime: [] },
		datasets: {
			documented: { source: [], dimensions: ['timestamp'] },
			realtime: { source: [], dimensions: ['timestamp'] }
		},
		chartsConfigs: { documented: [], realtime: [] },
		pieChartData: { documented: [], realtime: [] },
		stackColors: { documented: {}, realtime: {} },
		tokenAllocation: { documented: {}, realtime: {} },
		hallmarks: { documented: [], realtime: [] },
		categoriesBreakdown: null,
		sources: [],
		notes: [],
		events: [],
		futures: {},
		token: null,
		geckoId: null,
		name: null,
		unlockUsdChart: null
	}

	if (!protocolName) return empty

	const res = await fetchJson(`${PROTOCOL_EMISSION_API}/${protocolName}`)
		.then((r) => JSON.parse(r.body))
		.catch(() => null as any)
	if (!res) return empty

	const { metadata, name, futures } = res
	const documentedData = res.documentedData ?? {}
	const realTimeData = res.realTimeData ?? {}

	const protocolEmissions = {
		documented: {} as Record<number, Record<string, number>>,
		realtime: {} as Record<number, Record<string, number>>
	}
	const emissionCategories = { documented: [] as string[], realtime: [] as string[] }
	const seenDocumentedLabels = new Set<string>()
	const seenRealtimeLabels = new Set<string>()

	for (const emission of documentedData.data ?? []) {
		const label = emission.label
			.split(' ')
			.map((l) => capitalizeFirstLetter(l))
			.join(' ')

		if (!seenDocumentedLabels.has(label)) {
			seenDocumentedLabels.add(label)
			emissionCategories.documented.push(label)
		}

		for (const value of emission.data ?? []) {
			const ts = value.timestamp
			const entry = protocolEmissions.documented[ts] ?? (protocolEmissions.documented[ts] = {})
			entry[label] = value.unlocked
		}
	}

	for (const emission of realTimeData.data ?? []) {
		const label = emission.label
			.split(' ')
			.map((l) => capitalizeFirstLetter(l))
			.join(' ')

		if (!seenRealtimeLabels.has(label)) {
			seenRealtimeLabels.add(label)
			emissionCategories.realtime.push(label)
		}

		for (const value of emission.data ?? []) {
			const ts = value.timestamp
			const entry = protocolEmissions.realtime[ts] ?? (protocolEmissions.realtime[ts] = {})
			entry[label] = value.unlocked
		}
	}

	if (metadata?.events) {
		metadata.events = metadata.events.map((event) => ({
			...event,
			timestamp: roundToNearestHalfHour(event.timestamp)
		}))
	}

	const documentedChart: Array<{ timestamp: number; [key: string]: number }> = []
	for (const date in protocolEmissions.documented) {
		documentedChart.push({ timestamp: +date * 1e3, ...protocolEmissions.documented[+date] })
	}
	const realtimeChart: Array<{ timestamp: number; [key: string]: number }> = []
	for (const date in protocolEmissions.realtime) {
		realtimeChart.push({ timestamp: +date * 1e3, ...protocolEmissions.realtime[+date] })
	}
	const chartData = { documented: documentedChart, realtime: realtimeChart }

	const documentedPie: Array<{ name: string; value: number | string }> = []
	const lastDocumented = chartData.documented[chartData.documented.length - 1] || {}
	for (const key in lastDocumented) {
		if (key !== 'timestamp') documentedPie.push({ name: key, value: lastDocumented[key] })
	}
	const realtimePie: Array<{ name: string; value: number | string }> = []
	const lastRealtime = chartData.realtime[chartData.realtime.length - 1] || {}
	for (const key in lastRealtime) {
		if (key !== 'timestamp') realtimePie.push({ name: key, value: lastRealtime[key] })
	}
	const pieChartData = { documented: documentedPie, realtime: realtimePie }

	const stackColors = { documented: {} as Record<string, string>, realtime: {} as Record<string, string> }
	const allDocumentedColors = getNDistinctColors(pieChartData.documented.length)
	for (let i = 0; i < pieChartData.documented.length; i++) {
		stackColors.documented[pieChartData.documented[i].name] = allDocumentedColors[i]
	}
	const allRealtimeColors = getNDistinctColors(pieChartData.realtime.length)
	for (let i = 0; i < pieChartData.realtime.length; i++) {
		stackColors.realtime[pieChartData.realtime[i].name] = allRealtimeColors[i]
	}

	const datasets = {
		documented: buildEmissionsDataset(documentedChart, emissionCategories.documented),
		realtime: buildEmissionsDataset(realtimeChart, emissionCategories.realtime)
	}
	const chartsConfigs = {
		documented: buildEmissionsCharts(emissionCategories.documented, stackColors.documented),
		realtime: buildEmissionsCharts(emissionCategories.realtime, stackColors.realtime)
	}

	return {
		...empty,
		chartData,
		pieChartData,
		stackColors,
		datasets,
		chartsConfigs,
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
		unlockUsdChart: res.unlockUsdChart ?? null
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
		const res = await fetchJson(PROTOCOL_EMISSIONS_API)

		const coinPrices = await fetchCoinPricesBatched(res.filter((p) => p.gecko_id).map((p) => `coingecko:${p.gecko_id}`))

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

					filteredEvents = filteredEvents.toSorted((a, b) => a.timestamp - b.timestamp)

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
		const coinIds = res.filter((p) => p.gecko_id).map((p) => `coingecko:${p.gecko_id}`)
		const coinPrices = await fetchCoinPricesBatched(coinIds)
		const coins = { coins: coinPrices }

		const parsedRes = res

		const priceReqs = {}
		for (const protocol of res) {
			if (!getHistoricalPrices) continue
			if (!protocol.gecko_id) continue
			let lastEventTimestamp: number | undefined
			for (const e of protocol.events ?? []) {
				if (
					e.timestamp < Date.now() / 1000 - 7 * 24 * 60 * 60 &&
					e.category !== 'noncirculating' &&
					e.category !== 'farming'
				) {
					if (lastEventTimestamp === undefined || e.timestamp > lastEventTimestamp) {
						lastEventTimestamp = e.timestamp
					}
				}
			}

			if (!lastEventTimestamp) continue

			let earliestEvent: number | undefined
			for (const e of protocol.events ?? []) {
				if (earliestEvent === undefined || e.timestamp < earliestEvent) {
					earliestEvent = e.timestamp
				}
			}

			if (lastEventTimestamp === earliestEvent) continue

			lastEventTimestamp = Math.floor(lastEventTimestamp / 86400) * 86400

			const daysRange = [...Array(7).keys()].map((i) => i + 1)
			const timestamps = [
				...daysRange.map((days) => lastEventTimestamp - days * 24 * 60 * 60),
				lastEventTimestamp,
				...daysRange.map((days) => lastEventTimestamp + days * 24 * 60 * 60)
			].sort((a, b) => a - b)

			priceReqs[`coingecko:${protocol.gecko_id}`] = timestamps
		}

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
					let lastEventTimestamp: number | undefined
					for (const e of protocol.events ?? []) {
						if (e.timestamp < Date.now() / 1000 - 7 * 24 * 60 * 60) {
							if (lastEventTimestamp === undefined || e.timestamp > lastEventTimestamp) {
								lastEventTimestamp = e.timestamp
							}
						}
					}

					let lastEvent = []
					let upcomingEvent = []

					if (!event || (event.noOfTokens?.length === 1 && event.noOfTokens[0] === 0)) {
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

					const coin = coins.coins[`coingecko:${protocol.gecko_id}`]
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
			return {
				chartData: { documented: [], realtime: [] },
				categories: { documented: [], realtime: [] },
				datasets: {
					documented: { source: [], dimensions: ['timestamp'] },
					realtime: { source: [], dimensions: ['timestamp'] }
				},
				chartsConfigs: { documented: [], realtime: [] }
			}

		const [res, allEmissions] = await Promise.all([
			fetchJson(`${PROTOCOL_EMISSION_API}/${protocolName}`)
				.then((r) => JSON.parse(r.body))
				.catch(() => null),
			fetchJson(PROTOCOL_EMISSIONS_API)
		])

		if (!res) {
			return {
				chartData: { documented: [], realtime: [] },
				categories: { documented: [], realtime: [] },
				datasets: {
					documented: { source: [], dimensions: ['timestamp'] },
					realtime: { source: [], dimensions: ['timestamp'] }
				},
				chartsConfigs: { documented: [], realtime: [] }
			}
		}

		const { metadata, name, futures } = res

		const documentedData = res.documentedData ?? {}
		const realTimeData = res.realTimeData ?? {}

		const protocolEmissions = { documented: {}, realtime: {} }
		const emissionCategories = { documented: [] as string[], realtime: [] as string[] }
		const seenDocumentedLabels = new Set<string>()
		const seenRealtimeLabels = new Set<string>()

		const prices = await fetchJson(`${COINS_PRICES_API}/current/${metadata.token}?searchWidth=4h`).catch((err) => {
			console.log(err)
			return {}
		})

		const tokenPrice = prices?.coins?.[metadata.token] ?? {}

		for (const emission of documentedData.data ?? []) {
			const label = emission.label
				.split(' ')
				.map((l) => capitalizeFirstLetter(l))
				.join(' ')

			if (seenDocumentedLabels.has(label)) {
				continue
			}

			seenDocumentedLabels.add(label)
			emissionCategories['documented'].push(label)

			for (const value of emission.data ?? []) {
				const ts = value.timestamp
				const entry = protocolEmissions['documented'][ts] ?? (protocolEmissions['documented'][ts] = {})
				entry[label] = value.unlocked
			}
		}

		for (const emission of realTimeData.data ?? []) {
			const label = emission.label
				.split(' ')
				.map((l) => capitalizeFirstLetter(l))
				.join(' ')

			if (seenRealtimeLabels.has(label)) {
				continue
			}

			seenRealtimeLabels.add(label)
			emissionCategories['realtime'].push(label)

			for (const value of emission.data ?? []) {
				const ts = value.timestamp
				const entry = protocolEmissions['realtime'][ts] ?? (protocolEmissions['realtime'][ts] = {})
				entry[label] = value.unlocked
			}
		}

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

		const documentedChart: Array<{ timestamp: number; [key: string]: number }> = []
		for (const date in protocolEmissions['documented']) {
			documentedChart.push({ timestamp: +date * 1e3, ...protocolEmissions['documented'][date] })
		}
		const realtimeChart: Array<{ timestamp: number; [key: string]: number }> = []
		for (const date in protocolEmissions['realtime']) {
			realtimeChart.push({ timestamp: +date * 1e3, ...protocolEmissions['realtime'][date] })
		}
		const chartData = { documented: documentedChart, realtime: realtimeChart }

		const documentedPie: Array<{ name: string; value: number | string }> = []
		const lastDocumented = chartData.documented[chartData.documented.length - 1] || {}
		for (const key in lastDocumented) {
			if (key !== 'timestamp') documentedPie.push({ name: key, value: lastDocumented[key] })
		}
		const realtimePie: Array<{ name: string; value: number | string }> = []
		const lastRealtime = chartData.realtime[chartData.realtime.length - 1] || {}
		for (const key in lastRealtime) {
			if (key !== 'timestamp') realtimePie.push({ name: key, value: lastRealtime[key] })
		}
		const pieChartData = { documented: documentedPie, realtime: realtimePie }

		const stackColors = { documented: {} as Record<string, string>, realtime: {} as Record<string, string> }

		const allDocumentedColors = getNDistinctColors(pieChartData['documented'].length)
		for (let i = 0; i < pieChartData['documented'].length; i++) {
			stackColors['documented'][pieChartData['documented'][i].name] = allDocumentedColors[i]
		}
		const allRealtimeColors = getNDistinctColors(pieChartData['realtime'].length)
		for (let i = 0; i < pieChartData['realtime'].length; i++) {
			stackColors['realtime'][pieChartData['realtime'][i].name] = allRealtimeColors[i]
		}

		if (protocolName === 'looksrare') {
			tokenPrice.symbol = 'LOOKS'
		}

		// Pre-build MultiSeriesChart2-ready datasets so consumers don't duplicate this work.
		const datasets = {
			documented: buildEmissionsDataset(documentedChart, emissionCategories.documented),
			realtime: buildEmissionsDataset(realtimeChart, emissionCategories.realtime)
		}
		const chartsConfigs = {
			documented: buildEmissionsCharts(emissionCategories.documented, stackColors.documented),
			realtime: buildEmissionsCharts(emissionCategories.realtime, stackColors.realtime)
		}

		return {
			chartData,
			pieChartData,
			stackColors,
			datasets,
			chartsConfigs,
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

		return {
			chartData: { documented: [], realtime: [] },
			categories: { documented: [], realtime: [] },
			datasets: {
				documented: { source: [], dimensions: ['timestamp'] },
				realtime: { source: [], dimensions: ['timestamp'] }
			},
			chartsConfigs: { documented: [], realtime: [] }
		}
	}
}
