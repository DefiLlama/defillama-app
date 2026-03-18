import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import { lazy, Suspense, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { TagGroup } from '~/components/TagGroup'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import { fetchEquitiesPriceHistory } from './api'
import { EQUITIES_PRICE_HISTORY_TIMEFRAMES, type EquitiesPriceHistoryTimeframe } from './api.types'
import { EquitiesFilingsTable } from './FilingsTable'
import { EquitiesFinancialsTable } from './FinancialsTable'
import { buildPriceHistoryChart } from './queries'
import type { IEquityTickerPageProps } from './types'
import {
	formatCurrency,
	formatEquitiesDate,
	formatEquitiesDateTime,
	formatNumber,
	formatPercent,
	formatText
} from './utils'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const TABS = ['overview', 'financials', 'filings'] as const
const EQUITY_CHART_TYPES = ['Price History', 'Market Cap', 'Revenue'] as const
const DEFAULT_EQUITY_CHART_TYPE = 'Price History'
const DEFAULT_PRICE_HISTORY_TIMEFRAME = '1W' as const
const EQUITY_CHART_QUERY_VALUES = {
	'Price History': 'price-history',
	'Market Cap': 'market-cap',
	Revenue: 'revenue'
} as const

type EquityTab = (typeof TABS)[number]
type EquityChartType = (typeof EQUITY_CHART_TYPES)[number]
const TAB_LABELS: Record<EquityTab, string> = {
	overview: 'Overview',
	financials: 'Financials',
	filings: 'Filings'
}

function getChartTypeFromQueryValue(value?: string): EquityChartType {
	const chartType = EQUITY_CHART_TYPES.find((type) => EQUITY_CHART_QUERY_VALUES[type] === value)
	return chartType ?? DEFAULT_EQUITY_CHART_TYPE
}

function getPriceHistoryTimeframeFromQueryValue(value?: string): EquitiesPriceHistoryTimeframe {
	return EQUITIES_PRICE_HISTORY_TIMEFRAMES.find((timeframe) => timeframe === value) ?? DEFAULT_PRICE_HISTORY_TIMEFRAME
}

function KeyValueRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<dt className="shrink-0 text-sm text-(--text-secondary)" title={description}>
				{label}
			</dt>
			<dd className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-right">{children}</dd>
		</div>
	)
}

function MetricRow({
	label,
	value,
	description,
	monospace = false
}: {
	label: string
	value: string
	description?: string
	monospace?: boolean
}) {
	return (
		<KeyValueRow label={label} description={description}>
			<span className={monospace ? 'font-jetbrains font-medium' : 'font-medium'} suppressHydrationWarning>
				{value}
			</span>
		</KeyValueRow>
	)
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<h2 className="text-base font-semibold">{title}</h2>
			<dl className="divide-y divide-(--cards-border)">{children}</dl>
		</section>
	)
}

export function EquityTickerPage(props: IEquityTickerPageProps) {
	const router = useRouter()
	const { chartInstance, handleChartReady } = useGetChartInstance()
	const activeTab = useMemo<EquityTab>(() => {
		const tab = readSingleQueryValue(router.query.tab)
		return tab && TABS.includes(tab as EquityTab) ? (tab as EquityTab) : 'overview'
	}, [router.query.tab])
	const activeChartType = useMemo<EquityChartType>(() => {
		return getChartTypeFromQueryValue(readSingleQueryValue(router.query.chart))
	}, [router.query.chart])
	const activeTimeframe = useMemo<EquitiesPriceHistoryTimeframe>(() => {
		return getPriceHistoryTimeframeFromQueryValue(readSingleQueryValue(router.query.timeframe))
	}, [router.query.timeframe])
	const isPriceHistoryChart = activeChartType === DEFAULT_EQUITY_CHART_TYPE
	const disabledTimeframes = isPriceHistoryChart ? undefined : EQUITIES_PRICE_HISTORY_TIMEFRAMES

	const { data: queriedPriceHistoryChart } = useQuery({
		queryKey: ['equities', 'price-history', props.ticker, activeTimeframe],
		queryFn: () =>
			fetchEquitiesPriceHistory(props.ticker, activeTimeframe)
				.then((priceHistory) => buildPriceHistoryChart(priceHistory))
				.catch(() => buildPriceHistoryChart([])),
		initialData: activeTimeframe === DEFAULT_PRICE_HISTORY_TIMEFRAME ? props.priceHistoryChart : undefined,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: isPriceHistoryChart
	})
	const activePriceHistoryChart =
		queriedPriceHistoryChart ??
		(activeTimeframe === DEFAULT_PRICE_HISTORY_TIMEFRAME ? props.priceHistoryChart : buildPriceHistoryChart([]))

	const setActiveTab = (tab: EquityTab) => {
		void pushShallowQuery(router, { tab: tab === 'overview' ? undefined : tab })
	}
	const setActiveChartType = (chartType: EquityChartType) => {
		void pushShallowQuery(router, {
			chart: chartType === DEFAULT_EQUITY_CHART_TYPE ? undefined : EQUITY_CHART_QUERY_VALUES[chartType]
		})
	}
	const setActiveTimeframe = (timeframe: EquitiesPriceHistoryTimeframe) => {
		void pushShallowQuery(router, {
			timeframe: timeframe === DEFAULT_PRICE_HISTORY_TIMEFRAME ? undefined : timeframe
		})
	}
	const exportTitle = `${props.ticker} Price History (${activeTimeframe})`
	const exportFilename = `${props.ticker.toLowerCase()}-price-history-${activeTimeframe.toLowerCase()}`

	return (
		<article className="flex flex-col gap-2">
			<header className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<hgroup className="flex flex-wrap items-center gap-2">
					<h1 className="text-xl font-bold">{props.name}</h1>
					<p className="text-(--text-disabled)">({props.ticker})</p>
				</hgroup>
			</header>

			<section className="grid gap-2 lg:grid-cols-4" aria-label="Key metrics">
				<dl className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<dt className="text-(--text-label)">Current Price</dt>
					<dd className="font-jetbrains text-xl font-semibold">{formatCurrency(props.summary.currentPrice)}</dd>
				</dl>
				<dl className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<dt className="text-(--text-label)">24h Price Change</dt>
					<dd
						className={`font-jetbrains text-xl font-semibold ${
							props.summary.priceChangePercentage == null
								? ''
								: props.summary.priceChangePercentage >= 0
									? 'text-(--success)'
									: 'text-(--error)'
						}`}
					>
						{formatPercent(props.summary.priceChangePercentage)}
					</dd>
				</dl>
				<dl className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<dt className="text-(--text-label)">Market Cap</dt>
					<dd className="font-jetbrains text-xl font-semibold">{formatCurrency(props.summary.marketCap)}</dd>
				</dl>
				<dl className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<dt className="text-(--text-label)">Volume</dt>
					<dd className="font-jetbrains text-xl font-semibold">{formatCurrency(props.summary.volume)}</dd>
				</dl>
			</section>

			<figure className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<figcaption className="flex flex-wrap items-center gap-2 p-3 pb-0">
					{/* <TagGroup
						selectedValue={activeChartType}
						setValue={setActiveChartType}
						values={EQUITY_CHART_TYPES}
						variant="responsive"
					/> */}
					<h2 className="mr-auto text-base font-semibold">{`$${props.ticker} Price History`}</h2>
					<div className="ml-auto flex flex-wrap items-center gap-2">
						<TagGroup
							selectedValue={activeTimeframe}
							setValue={setActiveTimeframe}
							values={EQUITIES_PRICE_HISTORY_TIMEFRAMES}
							disabledValues={disabledTimeframes}
						/>
						<div
							className={`flex items-center gap-2 ${isPriceHistoryChart ? '' : 'pointer-events-none opacity-50'}`}
							aria-disabled={!isPriceHistoryChart}
						>
							<ChartExportButtons chartInstance={chartInstance} filename={exportFilename} title={exportTitle} />
						</div>
					</div>
				</figcaption>
				{isPriceHistoryChart ? (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={activePriceHistoryChart.dataset}
							charts={activePriceHistoryChart.charts}
							valueSymbol="$"
							title=""
							hideDataZoom={activePriceHistoryChart.dataset.source.length < 2}
							onReady={handleChartReady}
						/>
					</Suspense>
				) : (
					<div className="min-h-[360px]" />
				)}
			</figure>

			<nav className="flex w-full overflow-x-auto text-xs font-medium" role="tablist" aria-label="Ticker sections">
				{TABS.map((tab) => (
					<button
						key={tab}
						type="button"
						role="tab"
						aria-selected={activeTab === tab}
						onClick={() => setActiveTab(tab)}
						data-active={activeTab === tab}
						className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
					>
						{TAB_LABELS[tab]}
					</button>
				))}
			</nav>

			{activeTab === 'overview' ? (
				<section className="grid grid-cols-1 gap-2 lg:grid-cols-2" role="tabpanel" aria-label="Overview">
					<SectionCard title="Key Data">
						<MetricRow label="Current Price" value={formatCurrency(props.summary.currentPrice)} monospace />
						<MetricRow label="24h Price Change" value={formatPercent(props.summary.priceChangePercentage)} monospace />
						<MetricRow label="Market Cap" value={formatCurrency(props.summary.marketCap)} monospace />
						<MetricRow label="Volume" value={formatCurrency(props.summary.volume)} monospace />
						<MetricRow label="Dividend Yield" value={formatPercent(props.summary.dividendYield)} monospace />
						<MetricRow label="Trailing P/E" value={formatNumber(props.summary.trailingPE)} monospace />
						<MetricRow
							label="52 Week Range"
							value={`${formatCurrency(props.summary.fiftyTwoWeekLow)} - ${formatCurrency(props.summary.fiftyTwoWeekHigh)}`}
							monospace
						/>
					</SectionCard>

					<SectionCard title="Profile">
						<MetricRow label="Ticker" value={props.ticker} />
						<MetricRow label="Company" value={formatText(props.name)} />
						<MetricRow label="Industry" value={formatText(props.metadata.industry)} />
						<KeyValueRow label="Website">
							{props.metadata.website ? (
								<a
									href={props.metadata.website}
									target="_blank"
									rel="noopener noreferrer"
									className="text-(--link-text) hover:underline"
								>
									{props.metadata.website}
								</a>
							) : (
								<span className="font-medium">-</span>
							)}
						</KeyValueRow>
						<MetricRow label="CIK" description="Central Index Key" value={formatText(props.metadata.cik)} />
						<MetricRow label="Coverage since" value={formatEquitiesDate(props.metadata.startDate)} />
						<MetricRow label="Last Updated At" value={formatEquitiesDateTime(props.summary.updatedAt)} />
					</SectionCard>
				</section>
			) : null}

			{activeTab === 'financials' ? <EquitiesFinancialsTable statements={props.statements} /> : null}
			{activeTab === 'filings' ? (
				<EquitiesFilingsTable filings={props.filings} filingForms={props.filingForms} />
			) : null}

			<footer className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<h2 className="text-sm font-semibold">Attribution</h2>
				<p className="mt-1 text-xs text-(--text-disabled)">
					Prices data from Yahoo Finance. Filings and statements data from SEC EDGAR.
				</p>
			</footer>
		</article>
	)
}
