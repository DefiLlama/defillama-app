import { fetchCoinPrices as fetchCoinPricesBatched } from '~/api'
import { COINS_PRICES_API } from '~/constants'
import { buildUnlocksMultiSeriesChartForDateRange } from '~/containers/Unlocks/buildUnlocksMultiSeriesChart'
import type { PrecomputedData, UnlocksData } from '~/containers/Unlocks/calendarTypes'
import { batchFetchHistoricalPrices, capitalizeFirstLetter, getNDistinctColors, roundToNearestHalfHour } from '~/utils'
import { fetchJson } from '~/utils/async'
import { fetchProtocolEmission, fetchAllProtocolEmissions, fetchEmissionsProtocolsList } from './api'
import type {
	EmissionsDataset,
	EmissionsChartRow,
	EmissionsChartConfig,
	EmissionEvent,
	ProtocolEmission,
	TokenAllocationSplit
} from './api.types'
import type { CalendarUnlockEvent } from './calendarTypes'
import type { ProtocolEmissionResult } from './types'

interface CoinPricesResponse {
	coins?: Record<string, { price?: number; symbol?: string }>
}

function buildEmissionsDataset(chartData: Array<EmissionsChartRow>, stacks: string[]): EmissionsDataset {
	const source: Array<Record<string, number | null>> = chartData.map((row) => ({ ...row }))
	return {
		source,
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

function formatEmissionLabel(label: unknown): string {
	if (typeof label !== 'string') return ''
	return label
		.split(' ')
		.map((l) => capitalizeFirstLetter(l))
		.join(' ')
}

function roundEmissionEvents(events: EmissionEvent[] | undefined | null): EmissionEvent[] {
	if (!Array.isArray(events) || events.length === 0) return []
	return events.map((event) => ({
		...event,
		timestamp: typeof event?.timestamp === 'number' ? roundToNearestHalfHour(event.timestamp) : event?.timestamp
	}))
}

const EMPTY_TOKEN_ALLOCATION_SPLIT: TokenAllocationSplit = { current: {}, final: {} }

function isNumberRecord(value: unknown): value is Record<string, number> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasCurrentOrFinal(input: object): input is { current?: unknown; final?: unknown } {
	return 'current' in input || 'final' in input
}

function normalizeTokenAllocation(input: unknown): TokenAllocationSplit {
	if (!isNumberRecord(input)) return EMPTY_TOKEN_ALLOCATION_SPLIT

	if (hasCurrentOrFinal(input)) {
		return {
			current: isNumberRecord(input.current) ? input.current : {},
			final: isNumberRecord(input.final) ? input.final : {}
		}
	}

	// Legacy shape: a single category->allocation map - input is already narrowed to Record<string, number>
	return { current: input, final: input }
}

function normalizeCategoriesBreakdown(input: unknown): Record<string, string[]> | null {
	if (!input || typeof input !== 'object') return null

	const normalized: Record<string, string[]> = {}
	for (const [group, value] of Object.entries(input)) {
		if (Array.isArray(value)) {
			normalized[group] = value.filter((item): item is string => typeof item === 'string')
			continue
		}

		if (typeof value === 'string') {
			normalized[group] = [value]
		}
	}

	return normalized
}

interface EmissionsDataInput {
	data?:
		| Array<{
				label?: string | undefined
				data?:
					| Array<{
							timestamp: number
							unlocked?: number | null | undefined
					  }>
					| undefined
		  }>
		| null
		| undefined
	tokenAllocation?: Record<string, number> | null | undefined
}

function buildEmissionsSeriesAndCategories(input: EmissionsDataInput | null | undefined): {
	series: Record<number, Record<string, number | null>>
	categories: string[]
} {
	const series: Record<number, Record<string, number | null>> = {}
	const categories: string[] = []
	const seen = new Set<string>()

	for (const emission of input?.data ?? []) {
		const label = formatEmissionLabel(emission?.label)
		if (!label) continue

		if (!seen.has(label)) {
			seen.add(label)
			categories.push(label)
		}

		for (const value of emission?.data ?? []) {
			const ts = value?.timestamp
			if (typeof ts !== 'number' || !Number.isFinite(ts)) continue
			const entry = series[ts] ?? (series[ts] = {})
			entry[label] = value?.unlocked ?? null
		}
	}

	return { series, categories }
}

function seriesToChartRows(series: Record<number, Record<string, number | null>>): EmissionsChartRow[] {
	const rows: EmissionsChartRow[] = []
	for (const tsStr in series) {
		const tsSeconds = Number(tsStr)
		if (!Number.isFinite(tsSeconds)) continue
		rows.push({ timestamp: tsSeconds * 1e3, ...series[tsSeconds] })
	}
	rows.sort((a, b) => a.timestamp - b.timestamp)
	return rows
}

function buildPieFromChart(chart: EmissionsChartRow[]): Array<{ name: string; value: number | string }> {
	if (!chart.length) return []
	const last = chart[chart.length - 1]
	if (!last) return []
	const pie: Array<{ name: string; value: number | string }> = []
	for (const key of Object.keys(last)) {
		if (key !== 'timestamp') {
			const value = last[key]
			if (typeof value === 'number') {
				pie.push({ name: key, value })
			}
		}
	}
	return pie
}

function buildColorsForPie(pie: Array<{ name: string }>): Record<string, string> {
	const colors: Record<string, string> = {}
	const palette = getNDistinctColors(pie.length)
	for (let i = 0; i < pie.length; i++) colors[pie[i].name] = palette[i]
	return colors
}

export async function getProtocolUnlockUsdChart(protocolName: string): Promise<unknown[] | null> {
	const res = await fetchProtocolEmission(protocolName)
	return res?.unlockUsdChart ?? null
}

export async function getProtocolEmissionsCharts(protocolName: string): Promise<{
	chartData: {
		documented: Array<EmissionsChartRow>
		realtime: Array<EmissionsChartRow>
	}
	unlockUsdChart: unknown[] | null
}> {
	const empty = { chartData: { documented: [], realtime: [] }, unlockUsdChart: null }
	if (!protocolName) return empty

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	const documentedData = res.documentedData ?? {}
	const realTimeData = res.realTimeData ?? {}

	const documented = buildEmissionsSeriesAndCategories(documentedData).series
	const realtime = buildEmissionsSeriesAndCategories(realTimeData).series

	const documentedChart = seriesToChartRows(documented)
	const realtimeChart = seriesToChartRows(realtime)

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

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	const { metadata, name, futures } = res
	const documentedData = res.documentedData ?? {}
	const realTimeData = res.realTimeData ?? {}

	const documentedBuilt = buildEmissionsSeriesAndCategories(documentedData)
	const realtimeBuilt = buildEmissionsSeriesAndCategories(realTimeData)
	const emissionCategories = { documented: documentedBuilt.categories, realtime: realtimeBuilt.categories }

	const chartData = {
		documented: seriesToChartRows(documentedBuilt.series),
		realtime: seriesToChartRows(realtimeBuilt.series)
	}

	const pieChartData = {
		documented: buildPieFromChart(chartData.documented),
		realtime: buildPieFromChart(chartData.realtime)
	}

	const stackColors = {
		documented: buildColorsForPie(pieChartData.documented),
		realtime: buildColorsForPie(pieChartData.realtime)
	}

	const datasets = {
		documented: buildEmissionsDataset(chartData.documented, emissionCategories.documented),
		realtime: buildEmissionsDataset(chartData.realtime, emissionCategories.realtime)
	}
	const chartsConfigs = {
		documented: buildEmissionsCharts(emissionCategories.documented, stackColors.documented),
		realtime: buildEmissionsCharts(emissionCategories.realtime, stackColors.realtime)
	}

	const roundedEvents = roundEmissionEvents(metadata?.events)
	const nowSec = Date.now() / 1000

	return {
		...empty,
		chartData,
		pieChartData,
		stackColors,
		datasets,
		chartsConfigs,
		sources: metadata?.sources ?? [],
		notes: metadata?.notes ?? [],
		events: roundedEvents,
		token: metadata?.token ?? null,
		geckoId: res?.gecko_id ?? null,
		tokenAllocation: {
			documented: normalizeTokenAllocation(documentedData.tokenAllocation),
			realtime: normalizeTokenAllocation(realTimeData.tokenAllocation)
		},
		futures: futures ?? {},
		categories: emissionCategories,
		categoriesBreakdown: normalizeCategoriesBreakdown(res.categories),
		hallmarks: {
			documented: (documentedData.data?.length ?? 0) > 0 ? [[nowSec, 'Today']] : [],
			realtime: (realTimeData.data?.length ?? 0) > 0 ? [[nowSec, 'Today']] : []
		},
		name: name || null,
		unlockUsdChart: res.unlockUsdChart ?? null
	}
}

export async function getProtocolEmissionsScheduleData(protocolName: string): Promise<{
	datasets: { documented: EmissionsDataset; realtime: EmissionsDataset }
	chartsConfigs: { documented: EmissionsChartConfig; realtime: EmissionsChartConfig }
	categories: { documented: string[]; realtime: string[] }
	hallmarks: { documented: [number, string][]; realtime: [number, string][] }
}> {
	const empty = {
		datasets: {
			documented: { source: [], dimensions: ['timestamp'] },
			realtime: { source: [], dimensions: ['timestamp'] }
		},
		chartsConfigs: { documented: [], realtime: [] },
		categories: { documented: [], realtime: [] },
		hallmarks: { documented: [], realtime: [] }
	}

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	const documentedBuilt = buildEmissionsSeriesAndCategories(res.documentedData ?? {})
	const realtimeBuilt = buildEmissionsSeriesAndCategories(res.realTimeData ?? {})
	const categories = { documented: documentedBuilt.categories, realtime: realtimeBuilt.categories }

	const documentedChart = seriesToChartRows(documentedBuilt.series)
	const realtimeChart = seriesToChartRows(realtimeBuilt.series)

	// Assign colors by category order to keep schedule charts fully colored.
	const documentedPalette = getNDistinctColors(categories.documented.length)
	const documentedColors: Record<string, string> = {}
	for (let i = 0; i < categories.documented.length; i++)
		documentedColors[categories.documented[i]] = documentedPalette[i]

	const realtimePalette = getNDistinctColors(categories.realtime.length)
	const realtimeColors: Record<string, string> = {}
	for (let i = 0; i < categories.realtime.length; i++) realtimeColors[categories.realtime[i]] = realtimePalette[i]

	const datasets = {
		documented: buildEmissionsDataset(documentedChart, categories.documented),
		realtime: buildEmissionsDataset(realtimeChart, categories.realtime)
	}
	const chartsConfigs = {
		documented: buildEmissionsCharts(categories.documented, documentedColors),
		realtime: buildEmissionsCharts(categories.realtime, realtimeColors)
	}

	const nowSec = Date.now() / 1000
	const documentedHasData = (res.documentedData?.data?.length ?? 0) > 0
	const realtimeHasData = (res.realTimeData?.data?.length ?? 0) > 0

	return {
		datasets,
		chartsConfigs,
		categories,
		hallmarks: {
			documented: documentedHasData ? [[nowSec, 'Today']] : [],
			realtime: realtimeHasData ? [[nowSec, 'Today']] : []
		}
	}
}

interface ProtocolEmissionMeta {
	name?: string
	token?: string
	gecko_id?: string | null
	events?: EmissionEvent[] | null
	tPrice?: number | null
	tSymbol?: string | null
	totalLocked?: number | null
	maxSupply?: number | null
}

export async function getProtocolEmissionsPieData(protocolName: string): Promise<{
	pieChartData: {
		documented: Array<{ name: string; value: number | string }>
		realtime: Array<{ name: string; value: number | string }>
	}
	stackColors: { documented: Record<string, string>; realtime: Record<string, string> }
	meta: ProtocolEmissionMeta
}> {
	const empty = {
		pieChartData: { documented: [], realtime: [] },
		stackColors: { documented: {}, realtime: {} },
		meta: {}
	}

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	const documentedBuilt = buildEmissionsSeriesAndCategories(res.documentedData ?? {})
	const realtimeBuilt = buildEmissionsSeriesAndCategories(res.realTimeData ?? {})

	const documentedChart = seriesToChartRows(documentedBuilt.series)
	const realtimeChart = seriesToChartRows(realtimeBuilt.series)

	const pieChartData = {
		documented: buildPieFromChart(documentedChart),
		realtime: buildPieFromChart(realtimeChart)
	}
	const stackColors = {
		documented: buildColorsForPie(pieChartData.documented),
		realtime: buildColorsForPie(pieChartData.realtime)
	}

	const allEmissions = await fetchAllProtocolEmissions()
	const meta = allEmissions.find((p) => p?.token === res?.metadata?.token) ?? {}

	return { pieChartData, stackColors, meta }
}

type UnlockCalendarProtocolEvent = { timestamp: number; noOfTokens: number[]; description?: string; category?: string }

function determineUnlockType(
	event: UnlockCalendarProtocolEvent,
	allEventsForProtocol: UnlockCalendarProtocolEvent[]
): string {
	const nowSec = Math.floor(Date.now() / 1000)
	const futureEvents = allEventsForProtocol
		.filter((e) => typeof e.timestamp === 'number' && e.timestamp > nowSec)
		.toSorted((a, b) => a.timestamp - b.timestamp)

	const diffsInDays: number[] = []
	for (let i = 0; i < futureEvents.length - 1; i++) {
		const diffSeconds = futureEvents[i + 1].timestamp - futureEvents[i].timestamp
		diffsInDays.push(diffSeconds / (60 * 60 * 24))
	}

	const currentEventIndex = futureEvents.findIndex((e) => e.timestamp === event.timestamp)
	if (currentEventIndex !== -1 && currentEventIndex < futureEvents.length - 1) {
		const diffToNextEventDays = diffsInDays[currentEventIndex]
		if (diffToNextEventDays > 6.5 && diffToNextEventDays < 7.5) return 'Weekly'
		if (diffToNextEventDays > 28 && diffToNextEventDays < 32) return 'Monthly'
		if (diffToNextEventDays > 88 && diffToNextEventDays < 92) return 'Quarterly'
	}

	return ''
}

export async function getUnlocksCalendarStaticPropsData(): Promise<{
	unlocksData: UnlocksData
	precomputedData: PrecomputedData
}> {
	// Import dayjs lazily to keep this server-oriented builder isolated.
	const dayjs = (await import('dayjs')).default
	const isBetweenPlugin = (await import('dayjs/plugin/isBetween')).default
	dayjs.extend(isBetweenPlugin)

	const data = await getAllProtocolEmissionsWithHistory()
	const unlocksData: UnlocksData = {}

	const precomputedData: PrecomputedData = {
		monthlyMaxValues: {},
		listEvents: {},
		weekCharts: {},
		monthCharts: {}
	}

	for (const protocol of data ?? []) {
		if (!protocol?.events || protocol.tPrice == null) continue

		const validEvents = protocol.events.filter(
			(event: EmissionEvent) => event.timestamp !== null && event.noOfTokens && event.noOfTokens.length > 0
		)

		const protocolUnlocksByDate: Record<
			string,
			{ value: number; details: string[]; unlockTypes: string[]; category?: string }
		> = {}

		for (const event of validEvents) {
			const totalTokens = event.noOfTokens.reduce((sum: number, amount: number) => sum + amount, 0)
			if (totalTokens === 0) continue

			const valueUSD = totalTokens * protocol.tPrice
			const dateStr = new Date(event.timestamp * 1000).toISOString().split('T')[0]
			const unlockType = determineUnlockType(event, validEvents)

			const entry =
				protocolUnlocksByDate[dateStr] ??
				(protocolUnlocksByDate[dateStr] = { value: 0, details: [], unlockTypes: [], category: event.category || '' })

			entry.value += valueUSD
			entry.details.push(event.description || 'Token unlock')
			entry.unlockTypes.push(unlockType)
			entry.category = event.category || entry.category
		}

		for (const dateStr in protocolUnlocksByDate) {
			const dailyData = protocolUnlocksByDate[dateStr]
			if (!unlocksData[dateStr]) unlocksData[dateStr] = { totalValue: 0, events: [] }

			unlocksData[dateStr].totalValue += dailyData.value
			unlocksData[dateStr].events.push({
				protocol: protocol.name,
				value: dailyData.value,
				details: dailyData.details.join(', '),
				unlockType: dailyData.unlockTypes.find((type) => type !== '') || '',
				category: dailyData.category
			})
		}
	}

	for (const date in unlocksData) {
		unlocksData[date].events = unlocksData[date].events.toSorted((a, b) => b.value - a.value)
	}

	const currentYear = new Date().getFullYear()
	for (let year = currentYear - 1; year <= currentYear + 2; year++) {
		for (let month = 0; month < 12; month++) {
			const startOfMonth = dayjs().year(year).month(month).startOf('month')
			const endOfMonth = startOfMonth.endOf('month')
			const monthKey = `${year}-${month.toString().padStart(2, '0')}`

			let maxValue = 0
			for (const dateStr in unlocksData) {
				const dailyData = unlocksData[dateStr]
				const date = dayjs(dateStr)
				if (date.isBetween(startOfMonth.subtract(1, 'day'), endOfMonth.add(1, 'day'))) {
					if (dailyData.totalValue > maxValue) maxValue = dailyData.totalValue
				}
			}

			precomputedData.monthlyMaxValues[monthKey] = maxValue
		}
	}

	const now = dayjs()
	for (let i = 0; i < 6; i++) {
		const startDate = now.add(i * 30, 'days').startOf('day')
		const endDate = startDate.add(30, 'days')
		const startDateKey = startDate.format('YYYY-MM-DD')

		const events: Array<{ date: string; event: CalendarUnlockEvent }> = []
		for (const dateStr in unlocksData) {
			const date = dayjs(dateStr)
			if (date.isBetween(startDate.subtract(1, 'day'), endDate)) {
				for (const event of unlocksData[dateStr].events) events.push({ date: dateStr, event })
			}
		}

		precomputedData.listEvents[startDateKey] = events.toSorted(
			(a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
		)
	}

	// Precompute chart payloads for the current week/month so the client can render MultiSeriesChart2
	// without recomputing on first paint (still falls back to client computation for filtered views).
	const weekStart = dayjs().startOf('week')
	const weekKey = weekStart.format('YYYY-MM-DD')
	const weekDates = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day').format('YYYY-MM-DD'))
	if (precomputedData.weekCharts) {
		precomputedData.weekCharts[weekKey] = buildUnlocksMultiSeriesChartForDateRange({
			dates: weekDates,
			unlocksData
		})
	}

	const monthStart = dayjs().startOf('month')
	const daysInMonth = monthStart.endOf('month').date()
	const monthDates = Array.from({ length: daysInMonth }, (_, i) => monthStart.date(i + 1).format('YYYY-MM-DD'))
	const monthKey = `${monthStart.year()}-${monthStart.month().toString().padStart(2, '0')}`
	if (precomputedData.monthCharts) {
		precomputedData.monthCharts[monthKey] = buildUnlocksMultiSeriesChartForDateRange({
			dates: monthDates,
			unlocksData
		})
	}

	return { unlocksData, precomputedData }
}

export const getAllProtocolEmissionsWithHistory = async ({
	startDate,
	endDate
}: {
	startDate?: number
	endDate?: number
} = {}) => {
	try {
		const protocols = await fetchAllProtocolEmissions()

		const coinIdsList: string[] = []
		for (const p of protocols) {
			if (p.gecko_id) coinIdsList.push(`coingecko:${p.gecko_id}`)
		}
		const coinPrices = await fetchCoinPricesBatched(coinIdsList)

		return protocols
			.map((protocol: ProtocolEmission) => {
				try {
					let filteredEvents = protocol.events || []
					if (startDate) {
						filteredEvents = filteredEvents.filter((e: EmissionEvent) => e.timestamp >= startDate)
					}
					if (endDate) {
						filteredEvents = filteredEvents.filter((e: EmissionEvent) => e.timestamp <= endDate)
					}

					filteredEvents = filteredEvents.toSorted((a: EmissionEvent, b: EmissionEvent) => a.timestamp - b.timestamp)

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
			.filter(<T>(x: T | null): x is T => x !== null)
			.sort((a, b) => {
				const x = a.events?.[0]?.timestamp
				const y = b.events?.[0]?.timestamp
				if (x === y) return 0
				if (x === null || x === undefined) return 1
				if (y === null || y === undefined) return -1
				return x < y ? -1 : 1
			})
	} catch (e) {
		console.log(e)
		return []
	}
}

export const getProtocolEmissionsList = async () => {
	try {
		const protocols = await fetchAllProtocolEmissions()
		return protocols.map((protocol: ProtocolEmission) => ({
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
		const protocols = await fetchAllProtocolEmissions()
		const nowSec = Date.now() / 1000
		const weekAgoSec = nowSec - 7 * 24 * 60 * 60

		const coinIds: string[] = []
		for (const p of protocols) {
			if (p.gecko_id) coinIds.push(`coingecko:${p.gecko_id}`)
		}
		const coinPrices = await fetchCoinPricesBatched(coinIds)
		const coins = { coins: coinPrices }

		const priceReqs: Record<string, number[]> = {}
		const lastPastTimestampByCoinKey = new Map<string, number>()

		if (getHistoricalPrices) {
			for (const protocol of protocols) {
				const geckoId = protocol?.gecko_id
				if (!geckoId) continue

				const coinKey = `coingecko:${geckoId}`
				const events = Array.isArray(protocol?.events) ? protocol.events : []

				let earliestEvent: number | undefined
				let lastPastEvent: number | undefined

				for (const e of events) {
					const ts = e?.timestamp
					if (typeof ts !== 'number' || !Number.isFinite(ts)) continue
					if (earliestEvent === undefined || ts < earliestEvent) earliestEvent = ts

					const cat = e?.category
					if (cat === 'noncirculating' || cat === 'farming') continue

					// Keep consistent with UI timestamps (rounded) to align with `lastEvent` later.
					const roundedTs = roundToNearestHalfHour(ts)
					if (roundedTs < weekAgoSec && (lastPastEvent === undefined || roundedTs > lastPastEvent)) {
						lastPastEvent = roundedTs
					}
				}

				if (lastPastEvent === undefined) continue

				lastPastTimestampByCoinKey.set(coinKey, lastPastEvent)
				if (earliestEvent !== undefined && lastPastEvent === roundToNearestHalfHour(earliestEvent)) continue

				const anchor = Math.floor(lastPastEvent / 86400) * 86400
				const timestamps: number[] = []
				for (let d = 7; d >= 1; d--) timestamps.push(anchor - d * 86400)
				timestamps.push(anchor)
				for (let d = 1; d <= 7; d++) timestamps.push(anchor + d * 86400)
				priceReqs[coinKey] = timestamps
			}
		}

		const historicalPrices =
			getHistoricalPrices && Object.keys(priceReqs).length > 0
				? (await batchFetchHistoricalPrices(priceReqs)).results
				: {}

		return protocols
			.map((protocol: ProtocolEmission) => {
				try {
					const geckoId = protocol?.gecko_id
					const coinKey = geckoId ? `coingecko:${geckoId}` : null

					const eventsRaw = Array.isArray(protocol?.events) ? protocol.events : []
					const events = eventsRaw.map((event: EmissionEvent) => ({
						...event,
						timestamp: typeof event?.timestamp === 'number' ? roundToNearestHalfHour(event.timestamp) : event?.timestamp
					}))

					// Upcoming event: choose the earliest upcoming event with non-zero tokens.
					let upcomingTimestamp: number | null = null
					for (const e of events) {
						const ts = e?.timestamp
						if (typeof ts !== 'number' || !Number.isFinite(ts)) continue
						if (ts < nowSec) continue
						if (e?.noOfTokens?.length === 1 && e.noOfTokens[0] === 0) continue
						if (upcomingTimestamp === null || ts < upcomingTimestamp) upcomingTimestamp = ts
					}

					const upcomingEvent =
						upcomingTimestamp === null
							? [{ timestamp: null }]
							: events.filter((e: EmissionEvent) => e.timestamp === upcomingTimestamp)

					const lastPastTimestamp = coinKey ? lastPastTimestampByCoinKey.get(coinKey) : undefined
					const lastEvent =
						typeof lastPastTimestamp === 'number'
							? events.filter(
									(e: EmissionEvent) =>
										e.timestamp === lastPastTimestamp && e.category !== 'noncirculating' && e.category !== 'farming'
								)
							: []

					let filteredEvents = events
					if (startDate) filteredEvents = filteredEvents.filter((e: EmissionEvent) => e.timestamp >= startDate)
					if (endDate) filteredEvents = filteredEvents.filter((e: EmissionEvent) => e.timestamp <= endDate)

					const coin = coinKey ? coins.coins[coinKey] : null
					const tSymbol = coin?.symbol ?? null
					const historicalPrice = coinKey ? historicalPrices[coinKey] : null

					return {
						...protocol,
						// Reduce payload without mutating original object
						unlockEvents: null,
						sources: null,
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
			.filter(<T>(x: T | null): x is T => x !== null)
			.sort((a, b) => {
				const x = a.upcomingEvent?.[0]?.timestamp
				const y = b.upcomingEvent?.[0]?.timestamp
				// equal items sort equally
				if (x === y) {
					return 0
				}

				// nulls sort after anything else
				if (x === null || x === undefined) {
					return 1
				}
				if (y === null || y === undefined) {
					return -1
				}

				return x < y ? -1 : 1
			})
	} catch (e) {
		console.log(e)
		return []
	}
}

function createEmptyProtocolEmissionResult(): ProtocolEmissionResult {
	return {
		chartData: { documented: [], realtime: [] },
		pieChartData: { documented: [], realtime: [] },
		stackColors: { documented: {}, realtime: {} },
		datasets: {
			documented: { source: [], dimensions: ['timestamp'] },
			realtime: { source: [], dimensions: ['timestamp'] }
		},
		chartsConfigs: { documented: [], realtime: [] },
		meta: {},
		sources: [],
		notes: [],
		events: [],
		token: null,
		geckoId: null,
		upcomingEvent: [],
		tokenAllocation: {
			documented: EMPTY_TOKEN_ALLOCATION_SPLIT,
			realtime: EMPTY_TOKEN_ALLOCATION_SPLIT
		},
		futures: {},
		categories: { documented: [], realtime: [] },
		categoriesBreakdown: null,
		hallmarks: { documented: [], realtime: [] },
		name: null,
		tokenPrice: {},
		unlockUsdChart: null
	}
}

export const getProtocolEmissons = async (protocolName: string): Promise<ProtocolEmissionResult> => {
	try {
		const emptyResult = createEmptyProtocolEmissionResult()
		const list = await fetchEmissionsProtocolsList()
		if (!list.includes(protocolName)) return emptyResult

		const [res, allEmissions] = await Promise.all([
			fetchProtocolEmission(protocolName),
			fetchAllProtocolEmissions()
		])

		if (!res) return emptyResult

		const { metadata, name, futures } = res

		const documentedData = res.documentedData ?? {}
		const realTimeData = res.realTimeData ?? {}

		const documentedBuilt = buildEmissionsSeriesAndCategories(documentedData)
		const realtimeBuilt = buildEmissionsSeriesAndCategories(realTimeData)
		const emissionCategories = { documented: documentedBuilt.categories, realtime: realtimeBuilt.categories }

		const chartData = {
			documented: seriesToChartRows(documentedBuilt.series),
			realtime: seriesToChartRows(realtimeBuilt.series)
		}

		const pieChartData = {
			documented: buildPieFromChart(chartData.documented),
			realtime: buildPieFromChart(chartData.realtime)
		}

		const stackColors = {
			documented: buildColorsForPie(pieChartData.documented),
			realtime: buildColorsForPie(pieChartData.realtime)
		}

		const roundedEvents = roundEmissionEvents(metadata?.events)
		const nowSec = Date.now() / 1000

		const tokenKey = metadata?.token
		const prices: CoinPricesResponse =
			typeof tokenKey === 'string' && tokenKey
				? await fetchJson<CoinPricesResponse>(`${COINS_PRICES_API}/current/${tokenKey}?searchWidth=4h`).catch((err) => {
						console.log(err)
						return {}
					})
				: {}

		const tokenPriceData = tokenKey ? prices.coins?.[tokenKey] : undefined
		const tokenPrice: { price?: number; symbol?: string } = tokenPriceData
			? { ...tokenPriceData }
			: {}

		let upcomingEvent = []
		if (roundedEvents.length > 0) {
			const event = roundedEvents.find((e) => e.timestamp >= nowSec)

			if (!event || (event.noOfTokens?.length === 1 && event.noOfTokens[0] === 0)) {
				upcomingEvent = [{ timestamp: null }]
			} else {
				const comingEvents = roundedEvents.filter((e) => e.timestamp === event.timestamp)
				upcomingEvent = [...comingEvents]
			}
		} else {
			upcomingEvent = [{ timestamp: null }]
		}

		if (protocolName === 'looksrare') {
			tokenPrice.symbol = 'LOOKS'
		}

		// Pre-build MultiSeriesChart2-ready datasets so consumers don't duplicate this work.
		const datasets = {
			documented: buildEmissionsDataset(chartData.documented, emissionCategories.documented),
			realtime: buildEmissionsDataset(chartData.realtime, emissionCategories.realtime)
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
			events: roundedEvents,
			token: metadata?.token ?? null,
			geckoId: res?.gecko_id ?? null,
			upcomingEvent,
			tokenAllocation: {
				documented: normalizeTokenAllocation(documentedData.tokenAllocation),
				realtime: normalizeTokenAllocation(realTimeData.tokenAllocation)
			},
			futures: futures ?? {},
			categories: emissionCategories,
			categoriesBreakdown: normalizeCategoriesBreakdown(res.categories),
			hallmarks: {
				documented: (documentedData.data?.length ?? 0) > 0 ? [[nowSec, 'Today']] : [],
				realtime: (realTimeData.data?.length ?? 0) > 0 ? [[nowSec, 'Today']] : []
			},
			name: name || null,
			tokenPrice,
			unlockUsdChart: res.unlockUsdChart ?? null
		}
	} catch (e) {
		console.log(e)
		return createEmptyProtocolEmissionResult()
	}
}
