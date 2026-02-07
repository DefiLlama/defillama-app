import { PROTOCOL_EMISSION_API } from '~/constants'
import { capitalizeFirstLetter, getNDistinctColors, roundToNearestHalfHour } from '~/utils'
import { fetchJson } from '~/utils/async'
import { getTokenMarketDataFromCgChart } from './tokenMarketData'

// Re-export for convenience (call sites can import from one module).
export { getTokenMarketDataFromCgChart }
export type { TokenMarketData } from './tokenMarketData'

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
