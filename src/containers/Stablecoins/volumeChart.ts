import type {
	ChartTimeGroupingWithCumulative,
	MultiSeriesChart2Dataset,
	MultiSeriesChart2SeriesConfig
} from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart } from '~/components/ECharts/utils'
import { CHART_COLORS } from '~/constants/colors'
import { slug } from '~/utils'
import type {
	StablecoinVolumeBreakdownChartPoint,
	StablecoinVolumeChartKind,
	StablecoinVolumeChartResponse,
	StablecoinVolumeTotalChartPoint
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

const CHAIN_LABELS: Record<string, string> = {
	avax: 'Avalanche',
	bsc: 'BSC',
	era: 'zkSync Era',
	wc: 'World Chain'
}

const formatDimensionLabel = (key: string, chart: StablecoinVolumeChartKind): string => {
	if (chart === 'token' || chart === 'currency') return key.toUpperCase()
	if (CHAIN_LABELS[key]) return CHAIN_LABELS[key]

	return key
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

const getFiniteNumber = (value: unknown): number => {
	const numeric = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numeric) ? numeric : 0
}

const toMilliseconds = (timestamp: unknown): number | null => {
	const numeric = Number(timestamp)
	if (!Number.isFinite(numeric)) return null
	return numeric * 1e3
}

const clampLimit = (limit: number | undefined): number => {
	if (limit == null || !Number.isFinite(limit)) return DEFAULT_BREAKDOWN_LIMIT
	return Math.min(MAX_BREAKDOWN_LIMIT, Math.max(1, Math.floor(limit)))
}

const isTotalVolumePoint = (point: unknown): point is StablecoinVolumeTotalChartPoint => {
	return Array.isArray(point) && typeof point[1] === 'number'
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
	const source = data
		.map((point): Record<string, number> | null => {
			if (!isTotalVolumePoint(point)) return null
			const timestamp = toMilliseconds(point[0])
			if (timestamp == null) return null
			return { timestamp, [TOTAL_VOLUME_NAME]: getFiniteNumber(point[1]) }
		})
		.filter((point): point is Record<string, number> => point != null)

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
	const selected = slug(selectedDimension).replace(/_/g, '-')
	const latest = getLatestBreakdown(points)
	for (const key of Object.keys(latest)) {
		if (slug(key).replace(/_/g, '-') === selected) return key
	}
	for (const [, breakdown] of points) {
		for (const key of Object.keys(breakdown ?? {})) {
			if (slug(key).replace(/_/g, '-') === selected) return key
		}
	}
	return null
}

const getTopBreakdownKeys = (points: StablecoinVolumeBreakdownChartPoint[], limit: number): string[] => {
	const latest = getLatestBreakdown(points)
	return Object.entries(latest)
		.map(([key, value]) => [key, getFiniteNumber(value)] as const)
		.filter(([, value]) => value > 0)
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([key]) => key)
}

const buildBreakdownVolumePayload = (
	data: StablecoinVolumeChartResponse,
	options: StablecoinVolumeChartOptions
): StablecoinVolumeChartPayload => {
	const points = data.filter(
		(point): point is StablecoinVolumeBreakdownChartPoint =>
			Array.isArray(point) && point[1] != null && typeof point[1] === 'object' && !Array.isArray(point[1])
	)

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
	const source = points
		.map(([rawTimestamp, breakdown]) => {
			const timestamp = toMilliseconds(rawTimestamp)
			if (timestamp == null) return null

			const row: Record<string, number> = { timestamp }
			for (const key of keys) {
				const label = labelsByKey.get(key)
				if (!label) continue
				row[label] = getFiniteNumber(breakdown[key])
			}

			if (includeOthers) {
				let others = 0
				for (const [key, value] of Object.entries(breakdown)) {
					if (selectedKeysSet.has(key)) continue
					others += getFiniteNumber(value)
				}
				if (others > 0) hasOthersValue = true
				row[OTHERS_NAME] = others
			}

			return row
		})
		.filter((point): point is Record<string, number> => point != null)

	const dimensions = ['timestamp', ...keys.map((key) => labelsByKey.get(key)).filter((key): key is string => !!key)]
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
