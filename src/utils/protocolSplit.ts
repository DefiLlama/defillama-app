export type SeriesPoint = [number, number]

export const METRIC_CONFIG_BASE: Record<string, { endpoint: string; dataType?: string; metricName: string }> = {
	tvl: { endpoint: 'tvl', metricName: 'TVL' },
	fees: { endpoint: 'fees', metricName: 'fees' },
	revenue: { endpoint: 'fees', dataType: 'dailyRevenue', metricName: 'revenue' },
	volume: { endpoint: 'dexs', metricName: 'volume' },
	perps: { endpoint: 'derivatives', metricName: 'perps volume' },
	'options-notional': { endpoint: 'options', dataType: 'dailyNotionalVolume', metricName: 'options notional' },
	'options-premium': { endpoint: 'options', dataType: 'dailyPremiumVolume', metricName: 'options premium' },
	'bridge-aggregators': { endpoint: 'bridge-aggregators', metricName: 'bridge volume' },
	'dex-aggregators': { endpoint: 'aggregators', metricName: 'DEX aggregator volume' },
	'perps-aggregators': { endpoint: 'aggregator-derivatives', metricName: 'perps aggregator volume' },
	'user-fees': { endpoint: 'fees', dataType: 'dailyUserFees', metricName: 'user fees' },
	'holders-revenue': { endpoint: 'fees', dataType: 'dailyHoldersRevenue', metricName: 'holders revenue' },
	'protocol-revenue': { endpoint: 'fees', dataType: 'dailyProtocolRevenue', metricName: 'protocol revenue' },
	'supply-side-revenue': { endpoint: 'fees', dataType: 'dailySupplySideRevenue', metricName: 'supply side revenue' }
}

export const toSlug = (name: string = ''): string => name?.toLowerCase().split(' ').join('-').split("'").join('')

export const toUtcDay = (ts: number): number => Math.floor(ts / 86400) * 86400

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

export const startOfTodayUtc = (): number => {
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
