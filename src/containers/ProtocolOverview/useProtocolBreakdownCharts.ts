import * as React from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import type { IProtocolTokenBreakdownChart, IProtocolValueChart } from './api.types'
import { useFetchProtocolChartsByKeys } from './queries.client'

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>
type MultiSeriesChart = MultiSeriesCharts[number]
type BreakdownPoint = [number, Record<string, number>]
type BreakdownChart = BreakdownPoint[]
type TokenInflowPoint = { timestamp: number } & Record<string, number>
type InflowsDataset = {
	source: Array<{ timestamp: number; 'USD Inflows': number }>
	dimensions: ['timestamp', 'USD Inflows']
}
/** Maximum allowed difference (in milliseconds) between chart latest timestamps for alignment. */
const MAX_BREAKDOWN_TIMESTAMP_ALIGNMENT_DIFF_MS = 24 * 60 * 60 * 1e3

interface IUseProtocolBreakdownChartsParams {
	protocol: string
	keys: string[]
	includeBase?: boolean
	source?: 'tvl' | 'treasury'
	inflows?: boolean
}

interface IUseProtocolBreakdownChartsResult {
	isLoading: boolean
	chainsUnique: string[]
	tokensUnique: string[]
	chainsDataset: MultiSeriesChart2Dataset | null
	chainsCharts: MultiSeriesCharts
	valueDataset: MultiSeriesChart2Dataset | null
	valueCharts: MultiSeriesCharts
	tokenUSDDataset: MultiSeriesChart2Dataset | null
	tokenUSDCharts: MultiSeriesCharts
	tokenRawDataset: MultiSeriesChart2Dataset | null
	tokenRawCharts: MultiSeriesCharts
	tokenBreakdownUSD: BreakdownChart | null
	tokenBreakdownPieChart: Array<{ name: string; value: number }>
	usdInflowsDataset: InflowsDataset | null
	tokenInflowsDataset: MultiSeriesChart2Dataset | null
	tokenInflowsCharts: MultiSeriesCharts
}

type IUseProtocolBreakdownChartsComputed = Omit<IUseProtocolBreakdownChartsResult, 'isLoading'>

const getLatestChartTimestamp = (chart: Array<[number, unknown]>): number | null => {
	if (chart.length === 0) return null
	const lastPoint = chart[chart.length - 1]
	return lastPoint && Number.isFinite(lastPoint[0]) ? lastPoint[0] : null
}

/**
 * Compute per-chart alignment info: for each chart whose latest timestamp is within
 * `maxDiff` of the global most-recent timestamp, we map its latest → mostRecent.
 */
const buildTimestampAlignment = (
	charts: Array<Array<[number, unknown]> | null | undefined>
): { mostRecent: number | null; perChart: Map<number, number> } => {
	const perChart = new Map<number, number>()
	let mostRecent: number | null = null

	for (const [i, chart] of charts.entries()) {
		if (!chart?.length) continue
		const latest = getLatestChartTimestamp(chart)
		if (latest == null) continue
		perChart.set(i, latest)
		if (mostRecent == null || latest > mostRecent) mostRecent = latest
	}

	return { mostRecent, perChart }
}

const alignTimestamp = (
	timestamp: number,
	chartIndex: number,
	alignment: { mostRecent: number | null; perChart: Map<number, number> },
	maxDiff: number
): number => {
	const latest = alignment.perChart.get(chartIndex)
	if (
		latest != null &&
		alignment.mostRecent != null &&
		Math.abs(alignment.mostRecent - latest) <= maxDiff &&
		timestamp === latest
	) {
		return alignment.mostRecent
	}
	return timestamp
}

const aggregateValueCharts = (charts: Array<IProtocolValueChart | null | undefined>): IProtocolValueChart | null => {
	const summedByTimestamp = new Map<number, number>()
	const alignment = buildTimestampAlignment(charts)

	for (const [chartIndex, chart] of charts.entries()) {
		if (!chart?.length) continue
		for (const [timestamp, value] of chart) {
			const aligned = alignTimestamp(timestamp, chartIndex, alignment, MAX_BREAKDOWN_TIMESTAMP_ALIGNMENT_DIFF_MS)
			summedByTimestamp.set(aligned, (summedByTimestamp.get(aligned) ?? 0) + value)
		}
	}

	if (summedByTimestamp.size === 0) return null
	return Array.from(summedByTimestamp.entries()).sort((a, b) => a[0] - b[0])
}

const aggregateBreakdownCharts = (charts: Array<BreakdownChart | null | undefined>): BreakdownChart | null => {
	const summedByTimestamp = new Map<number, Record<string, number>>()
	const alignment = buildTimestampAlignment(charts)

	for (const [chartIndex, chart] of charts.entries()) {
		if (!chart?.length) continue
		for (const [timestamp, values] of chart) {
			const aligned = alignTimestamp(timestamp, chartIndex, alignment, MAX_BREAKDOWN_TIMESTAMP_ALIGNMENT_DIFF_MS)
			const current = summedByTimestamp.get(aligned) ?? {}
			for (const key in values) {
				current[key] = (current[key] ?? 0) + values[key]
			}
			summedByTimestamp.set(aligned, current)
		}
	}

	if (summedByTimestamp.size === 0) return null
	return Array.from(summedByTimestamp.entries()).sort((a, b) => a[0] - b[0])
}

const buildUsdInflowsFromTvlChart = (
	tvlChart: IProtocolValueChart | null | undefined
): Array<[number, number]> | null => {
	if (!tvlChart || tvlChart.length < 2) return null

	const inflows: Array<[number, number]> = []
	for (let i = 1; i < tvlChart.length; i++) {
		const [timestamp, value] = tvlChart[i]
		const previousValue = tvlChart[i - 1][1]
		if (!Number.isFinite(value) || !Number.isFinite(previousValue)) continue
		inflows.push([timestamp, value - previousValue])
	}

	return inflows.length > 0 ? inflows : null
}

const buildBreakdownSourceAndKeys = (
	breakdown: BreakdownChart | null | undefined
): {
	source: Array<{ timestamp: number } & Record<string, number>> | null
	keys: string[]
} => {
	if (!breakdown?.length) return { source: null, keys: [] }

	const latestPoint = breakdown[breakdown.length - 1]?.[1] ?? {}
	const allKeys = new Set<string>()
	const source: Array<{ timestamp: number } & Record<string, number>> = []

	for (const [timestamp, values] of breakdown) {
		source.push({ timestamp, ...values })
		for (const key in values) allKeys.add(key)
	}

	return {
		source,
		keys: Array.from(allKeys).sort((a, b) => Math.abs(latestPoint[b] ?? 0) - Math.abs(latestPoint[a] ?? 0))
	}
}

const buildTokenInflowsFromBreakdowns = (
	tokenBreakdownUSD: IProtocolTokenBreakdownChart | null | undefined,
	tokenBreakdownRaw: IProtocolTokenBreakdownChart | null | undefined,
	tokensUnique: string[]
): TokenInflowsDataset['source'] | null => {
	if (!tokenBreakdownUSD?.length || !tokenBreakdownRaw?.length || tokensUnique.length === 0) return null

	const usdByTimestamp = new Map<number, Record<string, number>>()
	for (const [timestamp, tokens] of tokenBreakdownUSD) {
		usdByTimestamp.set(timestamp, tokens)
	}

	const rawByTimestamp = new Map<number, Record<string, number>>()
	for (const [timestamp, tokens] of tokenBreakdownRaw) {
		rawByTimestamp.set(timestamp, tokens)
	}

	const timestamps = Array.from(rawByTimestamp.keys()).sort((a, b) => a - b)
	if (timestamps.length < 2) return null

	const tokensSet = new Set(tokensUnique)
	const tokenInflows: TokenInflowPoint[] = []

	for (let i = 1; i < timestamps.length; i++) {
		const timestamp = timestamps[i]
		const previousTimestamp = timestamps[i - 1]

		const currentRaw = rawByTimestamp.get(timestamp) ?? {}
		const previousRaw = rawByTimestamp.get(previousTimestamp) ?? {}
		const currentUsd = usdByTimestamp.get(timestamp) ?? {}
		const previousUsd = usdByTimestamp.get(previousTimestamp) ?? {}

		const point: { timestamp: number } & Record<string, number> = { timestamp }
		let hasTokenInflows = false

		const allTokens = new Set([...Object.keys(currentRaw), ...Object.keys(previousRaw)])
		for (const token of allTokens) {
			if (!tokensSet.has(token)) continue

			const currentAmount = currentRaw[token] ?? 0
			const previousAmount = previousRaw[token] ?? 0
			const amountDiff = currentAmount - previousAmount
			if (!Number.isFinite(amountDiff) || amountDiff === 0) continue

			let price = Number.NaN
			if (currentAmount !== 0 && Number.isFinite(currentUsd[token])) {
				price = currentUsd[token] / currentAmount
			} else if (previousAmount !== 0 && Number.isFinite(previousUsd[token])) {
				price = previousUsd[token] / previousAmount
			}
			if (!Number.isFinite(price)) continue

			const inflow = amountDiff * price
			if (!Number.isFinite(inflow)) continue

			point[token] = inflow
			hasTokenInflows = true
		}

		if (hasTokenInflows) tokenInflows.push(point)
	}

	return tokenInflows.length > 0 ? tokenInflows : null
}

type TokenInflowsDataset = {
	source: TokenInflowPoint[]
	dimensions: Array<string>
}

const EMPTY_MULTI_SERIES_CHARTS: MultiSeriesCharts = []
const EMPTY_PIE_CHART_DATA: Array<{ name: string; value: number }> = []

const buildChartsForKeys = (keys: string[], type: 'line' | 'bar', stack?: string): MultiSeriesCharts => {
	if (keys.length === 0) return EMPTY_MULTI_SERIES_CHARTS

	return keys.map(
		(name): MultiSeriesChart => ({
			type,
			name,
			encode: { x: 'timestamp', y: name },
			...(stack ? { stack } : {})
		})
	)
}

const EMPTY_COMPUTED_RESULT: IUseProtocolBreakdownChartsComputed = {
	chainsUnique: [],
	tokensUnique: [],
	chainsDataset: null,
	chainsCharts: EMPTY_MULTI_SERIES_CHARTS,
	valueDataset: null,
	valueCharts: EMPTY_MULTI_SERIES_CHARTS,
	tokenUSDDataset: null,
	tokenUSDCharts: EMPTY_MULTI_SERIES_CHARTS,
	tokenRawDataset: null,
	tokenRawCharts: EMPTY_MULTI_SERIES_CHARTS,
	tokenBreakdownUSD: null,
	tokenBreakdownPieChart: EMPTY_PIE_CHART_DATA,
	usdInflowsDataset: null,
	tokenInflowsDataset: null,
	tokenInflowsCharts: EMPTY_MULTI_SERIES_CHARTS
}

const buildComputedBreakdownResult = ({
	tvlCharts,
	chainBreakdownCharts,
	tokenBreakdownUsdCharts,
	tokenBreakdownRawCharts,
	valueSeriesName,
	inflows = true
}: {
	tvlCharts: Array<IProtocolValueChart | null | undefined>
	chainBreakdownCharts: Array<BreakdownChart | null | undefined>
	tokenBreakdownUsdCharts: Array<BreakdownChart | null | undefined>
	tokenBreakdownRawCharts: Array<BreakdownChart | null | undefined>
	valueSeriesName: string
	inflows?: boolean
}): IUseProtocolBreakdownChartsComputed => {
	const tvlChart = aggregateValueCharts(tvlCharts)
	const chainBreakdownChart = aggregateBreakdownCharts(chainBreakdownCharts)

	const { source: chainSource, keys: chainsUnique } = buildBreakdownSourceAndKeys(chainBreakdownChart)

	const chainsDataset =
		chainSource && chainsUnique.length > 0
			? {
					source: chainSource,
					dimensions: ['timestamp', ...chainsUnique]
				}
			: null
	const chainsCharts = chainsDataset != null ? buildChartsForKeys(chainsUnique, 'line') : EMPTY_MULTI_SERIES_CHARTS

	const valueDataset =
		tvlChart && tvlChart.length > 1
			? {
					source: tvlChart.map(([timestamp, value]) => ({ timestamp, [valueSeriesName]: value })),
					dimensions: ['timestamp', valueSeriesName]
				}
			: null
	const valueCharts =
		valueDataset != null
			? [
					{
						type: 'line' as const,
						name: valueSeriesName,
						encode: { x: 'timestamp', y: valueSeriesName }
					}
				]
			: EMPTY_MULTI_SERIES_CHARTS

	if (!inflows) {
		return {
			chainsUnique,
			tokensUnique: [],
			chainsDataset,
			chainsCharts,
			valueDataset,
			valueCharts,
			tokenUSDDataset: null,
			tokenUSDCharts: EMPTY_MULTI_SERIES_CHARTS,
			tokenRawDataset: null,
			tokenRawCharts: EMPTY_MULTI_SERIES_CHARTS,
			tokenBreakdownUSD: null,
			tokenBreakdownPieChart: EMPTY_PIE_CHART_DATA,
			usdInflowsDataset: null,
			tokenInflowsDataset: null,
			tokenInflowsCharts: EMPTY_MULTI_SERIES_CHARTS
		}
	}

	const tokenBreakdownUSD = aggregateBreakdownCharts(tokenBreakdownUsdCharts)
	const tokenBreakdown = aggregateBreakdownCharts(tokenBreakdownRawCharts)

	const { source: tokenUsdSource, keys: tokenUsdKeys } = buildBreakdownSourceAndKeys(tokenBreakdownUSD)
	const { source: tokenRawSource, keys: tokenRawKeys } = buildBreakdownSourceAndKeys(tokenBreakdown)
	const tokensUnique = tokenUsdKeys.length > 0 ? tokenUsdKeys : tokenRawKeys

	const tokenUSDDataset =
		tokenUsdSource && tokenUsdSource.length > 1
			? {
					source: tokenUsdSource,
					dimensions: ['timestamp', ...tokensUnique]
				}
			: null
	const tokenUSDCharts = tokenUSDDataset != null ? buildChartsForKeys(tokensUnique, 'line') : EMPTY_MULTI_SERIES_CHARTS

	const tokenRawDataset =
		tokenRawSource && tokenRawSource.length > 1
			? {
					source: tokenRawSource,
					dimensions: ['timestamp', ...tokensUnique]
				}
			: null
	const tokenRawCharts = tokenRawDataset != null ? buildChartsForKeys(tokensUnique, 'line') : EMPTY_MULTI_SERIES_CHARTS

	const tokenBreakdownPieChart = tokenBreakdownUSD?.length
		? preparePieChartData({
				data: Object.entries(tokenBreakdownUSD[tokenBreakdownUSD.length - 1]?.[1] ?? {})
					.filter(([name, value]) => !name.startsWith('UNKNOWN') && Number(value) >= 1)
					.map(([name, value]) => ({ name, value: Number(value) })),
				limit: 15
			})
		: EMPTY_PIE_CHART_DATA

	const usdInflows = buildUsdInflowsFromTvlChart(tvlChart)
	const tokenInflows = buildTokenInflowsFromBreakdowns(tokenBreakdownUSD, tokenBreakdown, tokensUnique)

	const usdInflowsDataset = usdInflows?.length
		? {
				source: usdInflows.map(([timestamp, value]) => ({ timestamp, 'USD Inflows': value })),
				dimensions: ['timestamp', 'USD Inflows'] as ['timestamp', 'USD Inflows']
			}
		: null

	const tokenInflowsDataset = tokenInflows?.length
		? {
				source: tokenInflows,
				dimensions: ['timestamp', ...tokensUnique]
			}
		: null
	const tokenInflowsCharts =
		tokenInflowsDataset != null ? buildChartsForKeys(tokensUnique, 'bar', 'tokenInflows') : EMPTY_MULTI_SERIES_CHARTS

	return {
		chainsUnique,
		tokensUnique,
		chainsDataset,
		chainsCharts,
		valueDataset,
		valueCharts,
		tokenUSDDataset,
		tokenUSDCharts,
		tokenRawDataset,
		tokenRawCharts,
		tokenBreakdownUSD,
		tokenBreakdownPieChart,
		usdInflowsDataset,
		tokenInflowsDataset,
		tokenInflowsCharts
	}
}

export function useProtocolBreakdownCharts({
	protocol,
	keys,
	includeBase = true,
	source = 'tvl',
	inflows = true
}: IUseProtocolBreakdownChartsParams): IUseProtocolBreakdownChartsResult {
	const { tvlChartQueries, chainBreakdownChartQueries, tokenBreakdownUsdQueries, tokenBreakdownRawQueries } =
		useFetchProtocolChartsByKeys({ protocol, keys, includeBase, source, inflows })

	const isNetworkLoading =
		tvlChartQueries.some((query) => query.isLoading) ||
		chainBreakdownChartQueries.some((query) => query.isLoading) ||
		tokenBreakdownUsdQueries.some((query) => query.isLoading) ||
		tokenBreakdownRawQueries.some((query) => query.isLoading)

	const computeSignature = [
		tvlChartQueries.map((query) => query.dataUpdatedAt).join('|'),
		chainBreakdownChartQueries.map((query) => query.dataUpdatedAt).join('|'),
		tokenBreakdownUsdQueries.map((query) => query.dataUpdatedAt).join('|'),
		tokenBreakdownRawQueries.map((query) => query.dataUpdatedAt).join('|'),
		protocol,
		source,
		includeBase ? '1' : '0',
		keys.join('|')
	].join('::')

	const latestComputeInputRef = React.useRef<{
		tvlCharts: Array<IProtocolValueChart | null | undefined>
		chainBreakdownCharts: Array<BreakdownChart | null | undefined>
		tokenBreakdownUsdCharts: Array<BreakdownChart | null | undefined>
		tokenBreakdownRawCharts: Array<BreakdownChart | null | undefined>
	}>({
		tvlCharts: [],
		chainBreakdownCharts: [],
		tokenBreakdownUsdCharts: [],
		tokenBreakdownRawCharts: []
	})
	latestComputeInputRef.current = {
		tvlCharts: tvlChartQueries.map((query) => query.data),
		chainBreakdownCharts: chainBreakdownChartQueries.map((query) => query.data),
		tokenBreakdownUsdCharts: tokenBreakdownUsdQueries.map((query) => query.data),
		tokenBreakdownRawCharts: tokenBreakdownRawQueries.map((query) => query.data)
	}

	const [computed, setComputed] = React.useState<IUseProtocolBreakdownChartsComputed>(EMPTY_COMPUTED_RESULT)
	const [isComputing, setIsComputing] = React.useState(false)
	const computeRunIdRef = React.useRef(0)

	React.useEffect(() => {
		if (isNetworkLoading) {
			setIsComputing(false)
			return
		}

		let cancelled = false
		const runId = ++computeRunIdRef.current
		setIsComputing(true)

		const runComputation = () => {
			if (cancelled || runId !== computeRunIdRef.current) return

			const next = buildComputedBreakdownResult({
				...latestComputeInputRef.current,
				valueSeriesName: source === 'treasury' ? 'Treasury' : 'Total',
				inflows
			})

			if (cancelled || runId !== computeRunIdRef.current) return
			setComputed(next)
			setIsComputing(false)
		}

		let timeoutId: number | undefined
		let idleCallbackId: number | undefined

		if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
			idleCallbackId = window.requestIdleCallback(runComputation, { timeout: 250 })
		} else {
			timeoutId = window.setTimeout(runComputation, 0)
		}

		return () => {
			cancelled = true
			if (
				idleCallbackId !== undefined &&
				typeof window !== 'undefined' &&
				typeof window.cancelIdleCallback === 'function'
			) {
				window.cancelIdleCallback(idleCallbackId)
			}
			if (timeoutId !== undefined) {
				window.clearTimeout(timeoutId)
			}
		}
	}, [isNetworkLoading, computeSignature, source, inflows])

	return {
		isLoading: isNetworkLoading || isComputing,
		...computed
	}
}
