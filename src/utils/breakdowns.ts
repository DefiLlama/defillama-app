type SeriesPoint = [number, number]

export interface ChartSeries {
	name: string
	data: SeriesPoint[]
	color?: string
}

export interface ProtocolBreakdownData {
	series: ChartSeries[]
	metadata: {
		chain: string
		chains: string[]
		categories: string[]
		metric: string
		topN: number
		totalProtocols: number
		othersCount: number
		marketSector: string | null
		error?: string
	}
}

export interface ProtocolChainData {
	series: ChartSeries[]
	metadata: {
		protocol: string
		metric: string
		chains: string[]
		totalChains: number
		topN?: number
		othersCount?: number
	}
}

export const BREAKDOWN_COLOR_PALETTE = [
	'#cc3e6d',
	'#4691ce',
	'#4cae4f',
	'#c98e36',
	'#972da9',
	'#2d9ba9',
	'#cc5f3e',
	'#4051b5',
	'#8bc34b',
	'#cba63a',
	'#673ab6',
	'#29998e',
	'#cc473e',
	'#3394c1',
	'#c0ce46',
	'#c97636',
	'#633ecc',
	'#30b575',
	'#b9315f',
	'#3175b9',
	'#ccb23e',
	'#65258d',
	'#298c99',
	'#cb3a3a',
	'#3e9fcc',
	'#7bcb3a',
	'#b63ecc',
	'#2a9d5a',
	'#cc683e',
	'#3e72cc',
	'#c9b136',
	'#9836c9',
	'#36bbc9',
	'#c94e36',
	'#3acba6',
	'#b034c5'
]

export const toSlug = (name: string = ''): string => name?.toLowerCase().split(' ').join('-').split("'").join('')

const toUtcDay = (ts: number): number => Math.floor(ts / 86400) * 86400

export const normalizeDailyPairs = (pairs: SeriesPoint[], mode: 'sum' | 'last' = 'sum'): SeriesPoint[] => {
	const daily = new Map<number, number>()
	for (const [ts, v] of pairs) {
		const day = toUtcDay(Number(ts))
		if (mode === 'sum') {
			daily.set(day, (daily.get(day) || 0) + (v || 0))
		} else {
			daily.set(day, v || 0)
		}
	}
	return Array.from(daily.entries()).sort((a, b) => a[0] - b[0]) as SeriesPoint[]
}

const startOfTodayUtc = (): number => {
	const now = new Date()
	return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000)
}

export const filterOutToday = (pairs: SeriesPoint[]): SeriesPoint[] => {
	const today = startOfTodayUtc()
	return pairs.filter(([ts]) => ts < today)
}

export const sumSeriesByTimestamp = (seriesList: SeriesPoint[][]): Map<number, number> => {
	const acc = new Map<number, number>()
	for (const series of seriesList) {
		for (const [ts, val] of series) {
			acc.set(ts, (acc.get(ts) || 0) + (val || 0))
		}
	}
	return acc
}

export const alignSeries = (timestamps: number[], series: SeriesPoint[]): SeriesPoint[] => {
	const map = new Map(series.map(([t, v]) => [t, v]))
	return timestamps.map((t) => [t, map.get(t) || 0])
}

export const buildAlignedTopAndOthers = (
	topSeries: ChartSeries[],
	totalSeries: SeriesPoint[]
): { alignedTopSeries: ChartSeries[]; othersData: SeriesPoint[]; allTimestamps: number[] } => {
	const timestampSet = new Set<number>()
	for (const s of topSeries) {
		for (const [t] of s.data) {
			timestampSet.add(t)
		}
	}
	for (const [t] of totalSeries) {
		timestampSet.add(t)
	}
	const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

	const alignedTopSeries = topSeries.map((s) => ({
		...s,
		data: alignSeries(allTimestamps, s.data)
	}))

	const alignedTotal = alignSeries(allTimestamps, totalSeries)
	const topSumPerTs = alignSeries(
		allTimestamps,
		Array.from(sumSeriesByTimestamp(alignedTopSeries.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
			number,
			number
		][]
	)

	const othersData: SeriesPoint[] = allTimestamps.map((t, i) => {
		const total = alignedTotal[i]?.[1] || 0
		const topSum = topSumPerTs[i]?.[1] || 0
		return [t, Math.max(0, total - topSum)]
	})

	return { alignedTopSeries, othersData, allTimestamps }
}
