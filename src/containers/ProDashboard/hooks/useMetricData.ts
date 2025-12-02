import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { useProDashboard } from '../ProDashboardAPIContext'
import { getChartQueryFn, getChartQueryKey, useParentChildMapping } from '../queries'
import type { MetricAggregator, MetricConfig, MetricWindow } from '../types'

const DEFAULT_COMPARE = {
	mode: 'previous_value' as const,
	format: 'percent' as const
}

type WindowBounds = {
	currentStart: number | null
	previousStart?: number
	previousEnd?: number
}

function getWindowBounds(window: MetricWindow, reference: Dayjs): WindowBounds {
	if (window === 'all') {
		return { currentStart: null }
	}

	if (window === 'ytd') {
		const currentStart = reference.startOf('year')
		const previousStart = currentStart.subtract(1, 'year')
		return {
			currentStart: currentStart.unix(),
			previousStart: previousStart.unix(),
			previousEnd: currentStart.unix()
		}
	}

	if (window === '3y') {
		const currentStart = reference.subtract(3, 'year')
		const previousStart = currentStart.subtract(3, 'year')
		return {
			currentStart: currentStart.unix(),
			previousStart: previousStart.unix(),
			previousEnd: currentStart.unix()
		}
	}

	let days = 0
	switch (window) {
		case '7d':
			days = 7
			break
		case '30d':
			days = 30
			break
		case '90d':
			days = 90
			break
		case '365d':
			days = 365
			break
		default:
			days = 0
	}

	if (!days) {
		return { currentStart: null }
	}

	const currentStart = reference.subtract(days, 'day')
	const previousStart = currentStart.subtract(days, 'day')
	return {
		currentStart: currentStart.unix(),
		previousStart: previousStart.unix(),
		previousEnd: currentStart.unix()
	}
}

function filterByWindow(data: [number, number][], window: MetricWindow, reference: Dayjs): [number, number][] {
	if (!Array.isArray(data) || data.length === 0) return []

	const { currentStart } = getWindowBounds(window, reference)

	if (currentStart === null) return data

	return data.filter(([ts]) => ts >= currentStart)
}

function getPreviousWindow(data: [number, number][], window: MetricWindow, reference: Dayjs): [number, number][] {
	if (!Array.isArray(data) || data.length === 0) return []

	const { previousStart, previousEnd } = getWindowBounds(window, reference)
	if (previousStart === undefined || previousEnd === undefined) {
		return []
	}

	return data.filter(([ts]) => ts >= previousStart && ts < previousEnd)
}

function resolveMovingAverageLength(window: MetricWindow, arrLength: number): number {
	switch (window) {
		case '7d':
			return Math.min(arrLength, 7)
		case '30d':
			return Math.min(arrLength, 30)
		case '90d':
			return Math.min(arrLength, 90)
		case '365d':
			return Math.min(arrLength, 365)
		case '3y':
			return Math.min(arrLength, 365 * 3)
		case 'ytd':
		case 'all':
			return arrLength
		default:
			return Math.min(arrLength, 7)
	}
}

function aggregate(values: number[], aggregator: MetricAggregator, window: MetricWindow): number | null {
	const arr = values.filter((v) => Number.isFinite(v))
	if (arr.length === 0) return null

	switch (aggregator) {
		case 'latest':
			return arr[arr.length - 1]
		case 'avg':
			return arr.reduce((a, b) => a + b, 0) / arr.length
		case 'max':
			return Math.max(...arr)
		case 'min':
			return Math.min(...arr)
		case 'sum':
			return arr.reduce((a, b) => a + b, 0)
		case 'median': {
			const sorted = [...arr].sort((a, b) => a - b)
			const mid = Math.floor(sorted.length / 2)
			return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
		}
		case 'stddev': {
			if (arr.length < 2) return null
			const mean = arr.reduce((a, b) => a + b, 0) / arr.length
			const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length
			return Math.sqrt(variance)
		}
		case 'first':
			return arr[0]
		case 'growth': {
			if (arr.length < 2) return null
			const first = arr[0]
			const last = arr[arr.length - 1]
			return first !== 0 ? ((last - first) / first) * 100 : null
		}
		case 'movingavg': {
			if (arr.length === 0) return null
			if (arr.length < 7) return arr.reduce((a, b) => a + b, 0) / arr.length

			const windowSize = resolveMovingAverageLength(window, arr.length)
			const recentValues = arr.slice(-windowSize)
			return recentValues.reduce((a, b) => a + b, 0) / recentValues.length
		}
		default:
			return arr[arr.length - 1]
	}
}

export function useMetricData(metric: MetricConfig) {
	const { subject, type, window, aggregator } = metric
	const compare = useMemo(() => {
		if (!metric.compare) {
			return DEFAULT_COMPARE
		}
		const format = metric.compare.format === 'absolute' ? 'absolute' : 'percent'
		const mode = metric.compare.mode ?? 'previous_value'

		if (mode === 'none') {
			return { mode: 'none' as const, format }
		}

		if (mode === 'previous_window' || mode === 'previous_value') {
			return { mode, format } as const
		}

		return { mode: 'previous_value' as const, format }
	}, [metric.compare])
	const itemType = subject.itemType
	const item = subject.itemType === 'protocol' ? subject.protocol || '' : subject.chain || ''
	const { protocols, chains } = useProDashboard()
	const geckoId =
		subject.geckoId ??
		(subject.itemType === 'protocol'
			? (protocols.find((p: any) => p.slug === subject.protocol)?.geckoId as string | undefined)
			: (chains.find((c: any) => c.name === subject.chain)?.gecko_id as string | undefined))
	const { data: parentMapping } = useParentChildMapping()

	const tokenTypes = ['tokenMcap', 'tokenPrice', 'tokenVolume']
	const chainTokenTypes = ['chainMcap', 'chainPrice']

	const {
		data: series = [],
		isLoading,
		isError
	} = useQuery({
		queryKey: ['metric', ...getChartQueryKey(type, itemType, item, geckoId, undefined)],
		queryFn: getChartQueryFn(type, itemType, item, geckoId, undefined, parentMapping),
		staleTime: 5 * 60 * 1000,
		select: (data: [number, number][]) => (Array.isArray(data) ? data : []),
		enabled:
			!!item &&
			((itemType === 'protocol' && (!tokenTypes.includes(type) || !!geckoId)) ||
				(itemType === 'chain' && (!chainTokenTypes.includes(type) || !!geckoId)))
	})

	const result = useMemo(() => {
		const reference = dayjs()
		const inWindow = filterByWindow(series, window, reference)
		const previousWindow = getPreviousWindow(series, window, reference)

		const values = inWindow.map(([, v]) => v)
		const value = aggregate(values, aggregator, window)

		const previousValues = previousWindow.map(([, v]) => v)
		const previousValue = aggregate(previousValues, aggregator, window)

		let delta: number | null = null
		let deltaPct: number | null = null
		const finiteValues = values.filter((v) => Number.isFinite(v))

		if (compare.mode === 'previous_value') {
			if (aggregator === 'latest') {
				if (finiteValues.length >= 2) {
					const curr = finiteValues[finiteValues.length - 1]
					const first = finiteValues[0]
					delta = curr - first
					deltaPct = first !== 0 ? (delta / first) * 100 : null
				}
			} else if (value !== null && previousValue !== null) {
				delta = value - previousValue
				deltaPct = previousValue !== 0 ? (delta / previousValue) * 100 : null
			}
		} else if (compare.mode === 'previous_window') {
			if (value !== null && previousValue !== null) {
				delta = value - previousValue
				deltaPct = previousValue !== 0 ? (delta / previousValue) * 100 : null
			}
		}

		const sparklineData = inWindow.length > 60 ? inWindow.slice(inWindow.length - 60) : inWindow
		const lastUpdatedTs =
			inWindow.length > 0
				? inWindow[inWindow.length - 1][0]
				: series.length > 0
					? series[series.length - 1][0]
					: undefined

		return { value, delta, deltaPct, sparklineData, lastUpdatedTs }
	}, [series, window, aggregator, compare, type])

	return {
		...result,
		isLoading,
		isError
	}
}
