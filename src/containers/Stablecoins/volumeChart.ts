import type {
	ChartTimeGroupingWithCumulative,
	MultiSeriesChart2Dataset,
	MultiSeriesChart2SeriesConfig
} from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart } from '~/components/ECharts/utils'
import { CHART_COLORS } from '~/constants/colors'
import type {
	StablecoinVolumeBreakdownChartPoint,
	StablecoinVolumeChartKind,
	StablecoinVolumeChartResponse
} from './api.types'

export interface StablecoinVolumeChartPayload {
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
	valueSymbol: '$'
	stacked: boolean
	showTotalInTooltip: boolean
}

interface StablecoinVolumeChartOptions {
	chart: StablecoinVolumeChartKind
	selectedDimension?: string
	fallbackDimension?: string
	limit?: number
}

const DEFAULT_BREAKDOWN_LIMIT = 20
const MAX_BREAKDOWN_LIMIT = 50
const TOTAL_VOLUME_NAME = 'Volume'
const OTHERS_NAME = 'Others'

const formatDimensionLabel = (key: string, chart: StablecoinVolumeChartKind): string => {
	if (chart === 'token' || chart === 'currency') return key.toUpperCase()
	return key
}

const clampLimit = (limit: number | undefined): number => {
	if (limit == null) return DEFAULT_BREAKDOWN_LIMIT
	return Math.min(MAX_BREAKDOWN_LIMIT, limit)
}

const buildCharts = (names: string[], stacked: boolean): MultiSeriesChart2SeriesConfig[] => {
	return names.map((name, i) => ({
		type: 'bar',
		name,
		encode: { x: 'timestamp', y: name },
		color: CHART_COLORS[i % CHART_COLORS.length],
		barMinWidth: 1,
		barMaxWidth: 24,
		...(stacked ? { stack: 'stablecoin-volume' } : {})
	}))
}

const buildTotalVolumePayload = (data: StablecoinVolumeChartResponse): StablecoinVolumeChartPayload => {
	const source = data.map((point) => ({
		timestamp: point[0] * 1e3,
		[TOTAL_VOLUME_NAME]: point[1] as number
	}))

	return {
		dataset: {
			source,
			dimensions: ['timestamp', TOTAL_VOLUME_NAME]
		},
		charts: buildCharts([TOTAL_VOLUME_NAME], false),
		valueSymbol: '$',
		stacked: false,
		showTotalInTooltip: false
	}
}

const getLatestBreakdown = (points: StablecoinVolumeBreakdownChartPoint[]): Record<string, number> => {
	for (let i = points.length - 1; i >= 0; i--) {
		const breakdown = points[i]?.[1]
		if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) return breakdown
	}
	return {}
}

const findDimensionKey = (points: StablecoinVolumeBreakdownChartPoint[], selectedDimension: string): string | null => {
	const latest = getLatestBreakdown(points)
	if (selectedDimension in latest) return selectedDimension
	for (const [, breakdown] of points) {
		if (selectedDimension in breakdown) return selectedDimension
	}
	return null
}

const getTopBreakdownKeys = (points: StablecoinVolumeBreakdownChartPoint[], limit: number): string[] => {
	const latest = getLatestBreakdown(points)
	const entries: Array<{ key: string; value: number }> = []
	for (const key in latest) {
		const value = latest[key]
		if (value > 0) entries.push({ key, value })
	}
	entries.sort((a, b) => b.value - a.value)
	const keys: string[] = []
	for (let i = 0; i < entries.length && i < limit; i++) {
		keys.push(entries[i].key)
	}
	return keys
}

const buildBreakdownVolumePayload = (
	data: StablecoinVolumeChartResponse,
	options: StablecoinVolumeChartOptions
): StablecoinVolumeChartPayload => {
	const points = data as StablecoinVolumeBreakdownChartPoint[]

	let selectedKey = options.selectedDimension ? findDimensionKey(points, options.selectedDimension) : null
	if (!selectedKey && options.fallbackDimension) selectedKey = findDimensionKey(points, options.fallbackDimension)
	if (options.selectedDimension && !selectedKey) {
		return {
			dataset: { source: [], dimensions: ['timestamp', TOTAL_VOLUME_NAME] },
			charts: [],
			valueSymbol: '$',
			stacked: false,
			showTotalInTooltip: false
		}
	}
	const keys = selectedKey ? [selectedKey] : getTopBreakdownKeys(points, clampLimit(options.limit))
	const labelsByKey = new Map(
		keys.map((key) => [key, selectedKey ? TOTAL_VOLUME_NAME : formatDimensionLabel(key, options.chart)])
	)
	const includeOthers = !selectedKey && keys.length > 0
	let hasOthersValue = false

	const selectedKeysSet = new Set(keys)
	const source = points.map(([timestamp, breakdown]) => {
		const row: Record<string, number> = { timestamp: timestamp * 1e3 }
		for (const key of keys) {
			const label = labelsByKey.get(key)
			if (!label) continue
			row[label] = breakdown[key] ?? 0
		}

		if (includeOthers) {
			let others = 0
			for (const key in breakdown) {
				if (selectedKeysSet.has(key)) continue
				others += breakdown[key]
			}
			if (others > 0) hasOthersValue = true
			row[OTHERS_NAME] = others
		}

		return row
	})

	const dimensions = ['timestamp', ...keys.flatMap((key) => labelsByKey.get(key) ?? [])]
	if (includeOthers && hasOthersValue) dimensions.push(OTHERS_NAME)

	const seriesNames = dimensions.filter((dimension) => dimension !== 'timestamp')
	const stacked = !selectedKey && seriesNames.length > 1

	return {
		dataset: {
			source,
			dimensions
		},
		charts: buildCharts(seriesNames, stacked),
		valueSymbol: '$',
		stacked,
		showTotalInTooltip: stacked
	}
}

export const buildStablecoinVolumeChartPayload = (
	data: StablecoinVolumeChartResponse,
	options: StablecoinVolumeChartOptions
): StablecoinVolumeChartPayload => {
	if (options.chart === 'total') return buildTotalVolumePayload(data)
	return buildBreakdownVolumePayload(data, options)
}

export const groupStablecoinVolumeChartPayload = (
	payload: StablecoinVolumeChartPayload,
	groupBy: ChartTimeGroupingWithCumulative
): StablecoinVolumeChartPayload => {
	if (groupBy === 'daily') return payload

	const dimensions = payload.dataset.dimensions
	const rowsByTimestamp = new Map<number, MultiSeriesChart2Dataset['source'][number]>()

	for (const dimension of dimensions) {
		if (dimension === 'timestamp') continue
		const points: Array<[number, number]> = []
		for (const row of payload.dataset.source) {
			const timestamp = Number(row.timestamp)
			const value = Number(row[dimension])
			if (Number.isFinite(timestamp) && Number.isFinite(value)) points.push([timestamp, value])
		}
		for (const [timestamp, value] of formatBarChart({
			data: points,
			groupBy,
			dateInMs: true,
			denominationPriceHistory: null
		})) {
			const row = rowsByTimestamp.get(timestamp) ?? { timestamp }
			row[dimension] = value
			rowsByTimestamp.set(timestamp, row)
		}
	}

	return {
		...payload,
		dataset: {
			dimensions,
			source: ensureChronologicalRows(Array.from(rowsByTimestamp.values()))
		}
	}
}
