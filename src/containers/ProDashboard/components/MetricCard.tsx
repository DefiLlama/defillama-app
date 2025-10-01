import { useMemo } from 'react'
import { SparklineChart } from '~/components/ECharts/SparklineChart'
import { Icon } from '~/components/Icon'
import { formattedNum } from '~/utils'
import { useMetricData } from '../hooks/useMetricData'
import { useProDashboard } from '../ProDashboardAPIContext'
import type { MetricAggregator, MetricConfig, MetricWindow } from '../types'
import { CHART_TYPES } from '../types'
import { getItemIconUrl } from '../utils'

const WINDOW_BADGE_LABELS: Record<MetricWindow, string> = {
	'7d': 'Last 7d',
	'30d': 'Last 30d',
	'90d': 'Last 90d',
	'365d': 'Last 365d',
	ytd: 'Year to date',
	'3y': 'Last 3y',
	all: 'All time'
}

const WINDOW_PHRASES: Record<MetricWindow, string> = {
	'7d': 'over the last 7 days',
	'30d': 'over the last 30 days',
	'90d': 'over the last 90 days',
	'365d': 'over the last 365 days',
	ytd: 'for the year to date',
	'3y': 'over the last 3 years',
	all: 'across all time'
}

const AGGREGATOR_BADGE: Record<MetricAggregator, string> = {
	latest: 'Latest',
	avg: 'Average',
	max: 'Peak',
	min: 'Low',
	sum: 'Total',
	median: 'Median',
	stddev: 'Std Dev',
	first: 'First',
	growth: 'Growth',
	movingavg: 'Moving Avg'
}

const AGGREGATOR_SUMMARY_LABELS: Record<MetricAggregator, string> = {
	latest: 'latest value',
	avg: 'average',
	max: 'highest value',
	min: 'lowest value',
	sum: 'total',
	median: 'median',
	stddev: 'standard deviation',
	first: 'first value',
	growth: 'growth',
	movingavg: 'moving average'
}

const toSentenceCase = (phrase: string) => {
	if (!phrase) return ''
	return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}

interface MetricCardProps {
	metric: MetricConfig
}

export function MetricCard({ metric }: MetricCardProps) {
	const { getChainInfo, getProtocolInfo, isReadOnly } = useProDashboard()
	const { value, delta, deltaPct, sparklineData, lastUpdatedTs, isLoading, isError } = useMetricData(metric)

	const { displayTitle, baseTitle, iconUrl, format } = useMemo(() => {
		const subject = metric.subject
		let name = ''
		let iconUrl: string | undefined
		if (subject.itemType === 'protocol') {
			const info = subject.protocol ? getProtocolInfo(subject.protocol) : undefined
			name = info?.name || subject.protocol || ''
			iconUrl = getItemIconUrl('protocol', info, subject.protocol || '')
		} else {
			const info = subject.chain ? getChainInfo(subject.chain) : undefined
			name = subject.chain || ''
			iconUrl = getItemIconUrl('chain', info, subject.chain || '')
		}
		const typeConfig = CHART_TYPES[metric.type as keyof typeof CHART_TYPES]
		const typeLabel = typeConfig?.title || metric.type
		const baseTitle = name ? `${name} ${typeLabel}` : typeLabel
		const label = metric.label?.trim()
		const displayTitle = label && label.length > 0 ? label : baseTitle

		let auto: 'currency' | 'number' | 'percent' = ['medianApy'].includes(metric.type)
			? 'percent'
			: ['users', 'activeUsers', 'newUsers', 'txs', 'gasUsed'].includes(metric.type)
				? 'number'
				: 'currency'

		if (metric.aggregator === 'growth') {
			auto = 'percent'
		}

		const fmt = metric.format?.value && metric.format.value !== 'auto' ? metric.format.value : auto
		return { displayTitle, baseTitle, iconUrl, format: fmt as 'currency' | 'number' | 'percent' }
	}, [metric, getChainInfo, getProtocolInfo])

	const displayValue = useMemo(() => {
		if (value == null) return '-'
		if (format === 'currency') return formattedNum(value, true)
		if (format === 'number') return formattedNum(value, false)
		return `${(value as number).toFixed(2)}%`
	}, [value, format])

	const compareFormat = metric.compare?.format ?? 'percent'

	const deltaText = useMemo(() => {
		if (delta == null && deltaPct == null) return null
		if (compareFormat === 'absolute') {
			if (delta == null) return null
			const v =
				format === 'currency'
					? formattedNum(delta, true)
					: format === 'percent'
						? `${delta.toFixed(2)}pp`
						: formattedNum(delta, false)
			return v
		}
		if (deltaPct == null) return null
		const sign = deltaPct > 0 ? '+' : ''
		return `${sign}${deltaPct.toFixed(2)}%`
	}, [delta, deltaPct, compareFormat, format])

	const deltaPositive = (delta ?? deltaPct ?? 0) > 0
	const deltaNegative = (delta ?? deltaPct ?? 0) < 0

	const windowBadge = WINDOW_BADGE_LABELS[metric.window]
	const windowPhrase = WINDOW_PHRASES[metric.window]
	const aggregatorBadge = AGGREGATOR_BADGE[metric.aggregator]

	const isVolumeMetric = useMemo(() => {
		const volumeTypes = new Set([
			'volume',
			'perps',
			'aggregators',
			'perpsAggregators',
			'bridgeAggregators',
			'tokenVolume',
			'optionsPremium',
			'optionsNotional'
		])
		return volumeTypes.has(metric.type as any)
	}, [metric.type])

	const summaryText = useMemo(() => {
		const base = AGGREGATOR_SUMMARY_LABELS[metric.aggregator] ?? aggregatorBadge.toLowerCase()
		const contextAware = isVolumeMetric ? base.replace('value', 'volume') : base
		const aggregatorSummary = toSentenceCase(contextAware)
		if (value == null) {
			return `${displayTitle} ${windowPhrase} (${aggregatorBadge}) has no data available yet.`
		}
		return `${displayTitle} — ${aggregatorSummary} ${windowPhrase} is ${displayValue}.`
	}, [aggregatorBadge, displayValue, displayTitle, isVolumeMetric, metric.aggregator, value, windowPhrase])

	const hasCustomLabel = Boolean(metric.label?.trim())

	const shouldShowSparkline = metric.showSparkline ?? true

	const sparklineSeries = useMemo(() => {
		if (!shouldShowSparkline || !Array.isArray(sparklineData)) return []
		return sparklineData.filter(([, v]) => Number.isFinite(v))
	}, [shouldShowSparkline, sparklineData])

	const sparklineColor = deltaPositive ? 'var(--success)' : deltaNegative ? 'var(--error)' : 'var(--primary)'

	const content = useMemo(() => {
		if (isLoading) {
			return (
				<div className="flex flex-1 items-center justify-center">
					<div className="h-6 w-6 animate-spin rounded-full border-b-2 border-(--primary)" />
				</div>
			)
		}

		if (isError) {
			return (
				<div className="flex flex-1 flex-col items-center justify-center gap-1 text-(--text-form)">
					<Icon name="alert-triangle" height={18} width={18} />
					<span className="text-sm">Error</span>
				</div>
			)
		}

		return (
			<div className="flex h-full flex-1 flex-col items-center justify-center gap-3 text-center">
				<div className="text-4xl leading-tight font-semibold">{displayValue}</div>
				{sparklineSeries.length > 1 && (
					<div className="w-full max-w-[280px]">
						<SparklineChart data={sparklineSeries} color={sparklineColor} height={64} smooth />
					</div>
				)}
				{deltaText && (
					<div
						className={`text-xs font-semibold tracking-wide uppercase ${
							deltaPositive ? 'text-(--success)' : deltaNegative ? 'text-(--error)' : 'text-(--text-form)'
						}`}
					>
						{deltaText}
					</div>
				)}
				<div className="max-w-[420px] text-sm text-(--text-secondary)">{summaryText}</div>
			</div>
		)
	}, [
		deltaNegative,
		deltaPositive,
		deltaText,
		displayValue,
		isError,
		isLoading,
		sparklineSeries,
		sparklineColor,
		summaryText
	])

	return (
		<div className="flex h-full min-h-[240px] flex-col gap-3 p-3">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-2">
					{iconUrl ? (
						<img src={iconUrl} alt={displayTitle} className="h-5 w-5 shrink-0 rounded-full" />
					) : (
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-gray-600">
							{displayTitle?.charAt(0)?.toUpperCase()}
						</div>
					)}
					<div className="flex flex-col">
						<h2 className="text-sm leading-tight font-semibold text-(--text-primary)">{displayTitle}</h2>
						{hasCustomLabel && <div className="pro-text3 text-[11px] leading-tight">{baseTitle}</div>}
					</div>
				</div>
				{!isReadOnly && (
					<div className="text-[11px] tracking-wide text-(--text-form)">
						{windowBadge} · {aggregatorBadge}
					</div>
				)}
			</div>

			<div className="flex h-full flex-1 items-center justify-center pt-4">{content}</div>
		</div>
	)
}
