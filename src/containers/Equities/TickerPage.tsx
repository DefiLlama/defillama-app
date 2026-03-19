import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { MetricRow } from '~/components/MetricPrimitives'
import { TagGroup } from '~/components/TagGroup'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import defs from '~/public/equities-definitions.json'
import { abbreviateNumber } from '~/utils'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import type { EquitiesPriceHistoryTimeframe, IEquitiesSummaryResponse } from './api.types'
import { DEFAULT_PRICE_HISTORY_TIMEFRAME, EQUITIES_PRICE_HISTORY_TIMEFRAMES, TABS } from './constants'
import { EquitiesFilingsTable } from './FilingsTable'
import { EquitiesFinancialsTable } from './FinancialsTable'
import type { IEquityTickerPageProps } from './types'
import { formatEquitiesDate, formatEquitiesDateTime } from './utils'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
type EquityTab = (typeof TABS)[number]

const TIMEFRAME_MS: Record<EquitiesPriceHistoryTimeframe, number | null> = {
	'1W': 7 * 86_400_000,
	'1M': 30 * 86_400_000,
	'6M': 180 * 86_400_000,
	'1Y': 365 * 86_400_000,
	'5Y': 5 * 365 * 86_400_000,
	MAX: null
}

const TAB_LABELS: Record<EquityTab, string> = {
	overview: 'Overview',
	financials: 'Financials',
	filings: 'Filings'
}

function EquityKeyMetrics({ summary }: { summary: IEquitiesSummaryResponse }) {
	return (
		<div className="flex flex-col">
			<MetricRow
				label={defs.currentPrice.label}
				tooltip={defs.currentPrice.description}
				value={abbreviateNumber(summary.currentPrice, 2, '$')}
			/>
			<MetricRow
				label={defs.revenueTTM.label}
				tooltip={defs.revenueTTM.description}
				value={abbreviateNumber(summary.revenueTTM, 2, '$')}
			/>
			<MetricRow
				label={defs.grossProfitTTM.label}
				tooltip={defs.grossProfitTTM.description}
				value={abbreviateNumber(summary.grossProfitTTM, 2, '$')}
			/>
			{summary.dividendYield ? (
				<MetricRow
					label={defs.dividendYield.label}
					tooltip={defs.dividendYield.description}
					value={abbreviateNumber(summary.dividendYield, 2, '%')}
				/>
			) : null}
			{/* <MetricRow label={defs.ebitdaTTM.label} tooltip={defs.ebitdaTTM.description} value={abbreviateNumber(summary.ebitdaTTM, 2, '$')} /> */}
			{/* <MetricRow label={defs.holdersRevenueTTM.label} tooltip={defs.holdersRevenueTTM.description} value={abbreviateNumber(summary.holdersRevenueTTM, 2, '$')} /> */}
			{/* <MetricRow label={defs.treasury.label} tooltip={defs.treasury.description} value={abbreviateNumber(summary.treasury, 2, '$')} /> */}
		</div>
	)
}

export function EquityTickerPage(props: IEquityTickerPageProps) {
	const router = useRouter()
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const activeTab = useMemo<EquityTab>(() => {
		const tab = readSingleQueryValue(router.query.tab)
		return tab && TABS.includes(tab as EquityTab) ? (tab as EquityTab) : 'financials'
	}, [router.query.tab])

	const activeTimeframe = useMemo<EquitiesPriceHistoryTimeframe>(() => {
		return (
			EQUITIES_PRICE_HISTORY_TIMEFRAMES.find((t) => t === readSingleQueryValue(router.query.timeframe)) ??
			DEFAULT_PRICE_HISTORY_TIMEFRAME
		)
	}, [router.query.timeframe])

	const activePriceHistoryChart = useMemo(() => {
		const duration = TIMEFRAME_MS[activeTimeframe]
		if (!duration) return props.priceHistoryChart
		const cutoff = Date.now() - duration
		const source = props.priceHistoryChart.dataset.source.filter((point) => (point.timestamp as number) >= cutoff)
		return { ...props.priceHistoryChart, dataset: { ...props.priceHistoryChart.dataset, source } }
	}, [activeTimeframe, props.priceHistoryChart])

	const setActiveTab = (tab: EquityTab) => {
		void pushShallowQuery(router, { tab: tab === 'financials' ? undefined : tab })
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
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				{/* Desktop: left stats panel */}
				<div className="col-span-1 hidden flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:flex xl:min-h-[360px]">
					<h1 className="flex flex-wrap items-center gap-2 text-xl">
						<span className="font-bold">{props.name}</span>
						<span className="font-normal text-(--text-disabled)">({props.ticker})</span>
					</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">{defs.marketCap.label}</span>
						<span className="min-h-8 font-jetbrains text-2xl font-semibold">
							{abbreviateNumber(props.summary.marketCap, 2, '$')}
						</span>
					</p>
					<EquityKeyMetrics summary={props.summary} />
				</div>

				<div className="col-span-1 grid grid-cols-2 gap-2 xl:col-[2/-1]">
					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
						{/* Mobile: name + market cap */}
						<div className="flex flex-col gap-6 xl:hidden">
							<div className="flex flex-wrap items-center gap-2 text-xl">
								<span className="font-bold">{props.name}</span>
								<span className="font-normal text-(--text-disabled)">({props.ticker})</span>
							</div>
							<p className="flex flex-col">
								<span className="text-(--text-label)">{defs.marketCap.label}</span>
								<span className="min-h-8 font-jetbrains text-2xl font-semibold">
									{abbreviateNumber(props.summary.marketCap, 2, '$')}
								</span>
							</p>
						</div>

						<div className="flex flex-wrap items-center justify-end gap-2">
							{/* <h2 className="mr-auto text-base font-semibold">Price History</h2> */}
							<TagGroup
								selectedValue={activeTimeframe}
								setValue={setActiveTimeframe}
								values={EQUITIES_PRICE_HISTORY_TIMEFRAMES}
							/>
							<ChartExportButtons chartInstance={chartInstance} filename={exportFilename} title={exportTitle} />
						</div>
						<Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={activePriceHistoryChart.dataset}
								charts={activePriceHistoryChart.charts}
								chartOptions={{ yAxis: { scale: true } }}
								valueSymbol="$"
								title=""
								hideDataZoom={activePriceHistoryChart.dataset.source.length < 2}
								onReady={handleChartReady}
							/>
						</Suspense>
					</div>

					{/* Mobile: key metrics below chart */}
					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:hidden">
						<EquityKeyMetrics summary={props.summary} />
					</div>
				</div>
			</div>

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
				<div className="grid grid-cols-1 gap-2 xl:grid-cols-2" role="tabpanel" aria-label="Overview">
					<section className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h2 className="text-base font-semibold">Market Data</h2>
						<div className="flex flex-col">
							<MetricRow
								label={defs.priceChangePercentage1d.label}
								tooltip={defs.priceChangePercentage1d.description}
								value={abbreviateNumber(props.summary.priceChangePercentage1d, 2, '%')}
							/>
							<MetricRow
								label={defs.priceChangePercentage7d.label}
								tooltip={defs.priceChangePercentage7d.description}
								value={abbreviateNumber(props.summary.priceChangePercentage7d, 2, '%')}
							/>
							<MetricRow
								label={defs.priceChangePercentage1m.label}
								tooltip={defs.priceChangePercentage1m.description}
								value={abbreviateNumber(props.summary.priceChangePercentage1m, 2, '%')}
							/>
							<MetricRow
								label={defs.volume.label}
								tooltip={defs.volume.description}
								value={abbreviateNumber(props.summary.volume, 2)}
							/>
							<MetricRow
								label={defs.trailingPE.label}
								tooltip={defs.trailingPE.description}
								value={abbreviateNumber(props.summary.trailingPE, 2)}
							/>
							<MetricRow
								label={defs.priceToBook.label}
								tooltip={defs.priceToBook.description}
								value={abbreviateNumber(props.summary.priceToBook, 2)}
							/>
							<MetricRow
								label="52 Week Range"
								value={`${abbreviateNumber(props.summary.fiftyTwoWeekLow, 2, '$')} – ${abbreviateNumber(props.summary.fiftyTwoWeekHigh, 2, '$')}`}
							/>
							<MetricRow
								label={defs.earningsTTM.label}
								tooltip={defs.earningsTTM.description}
								value={abbreviateNumber(props.summary.earningsTTM, 2, '$')}
							/>
							<MetricRow
								label={defs.totalAssets.label}
								tooltip={defs.totalAssets.description}
								value={abbreviateNumber(props.summary.totalAssets, 2, '$')}
							/>
						</div>
					</section>

					<section className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h2 className="text-base font-semibold">Profile</h2>
						<div className="flex flex-col">
							<MetricRow label="Ticker" value={props.ticker} />
							<MetricRow label="Company" value={props.name} />
							<MetricRow label="Industry" value={props.metadata.industry ?? '—'} />
							<MetricRow
								label="Website"
								value={
									props.metadata.website ? (
										<a
											href={props.metadata.website}
											target="_blank"
											rel="noopener noreferrer"
											className="text-(--link-text) hover:underline"
										>
											{props.metadata.website}
										</a>
									) : (
										'—'
									)
								}
							/>
							<MetricRow label="CIK" tooltip="Central Index Key" value={props.metadata.cik} />
							<MetricRow
								label="Coverage since"
								value={<span suppressHydrationWarning>{formatEquitiesDate(props.metadata.startDate)}</span>}
							/>
							<MetricRow
								label="Last Updated"
								value={<span suppressHydrationWarning>{formatEquitiesDateTime(props.summary.updatedAt)}</span>}
							/>
						</div>
					</section>
				</div>
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
