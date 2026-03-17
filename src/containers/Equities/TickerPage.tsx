import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import { lazy, Suspense, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum } from '~/utils'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import { EquitiesFilingsTable } from './FilingsTable'
import { EquitiesFinancialsTable } from './FinancialsTable'
import type { IEquityTickerPageProps } from './types'
import { formatEquitiesDate, formatEquitiesDateTime } from './utils'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const TABS = ['overview', 'financials', 'filings'] as const
type EquityTab = (typeof TABS)[number]
const TAB_LABELS: Record<EquityTab, string> = {
	overview: 'Overview',
	financials: 'Financials',
	filings: 'Filings'
}

function formatCurrency(value: number | null): string {
	return value == null ? '-' : (formattedNum(value, true) ?? '-')
}

function formatNumber(value: number | null): string {
	return value == null ? '-' : (formattedNum(value, false) ?? '-')
}

function formatText(value?: string | null): string {
	return value && value.trim().length > 0 ? value : '-'
}

function formatPercent(value: number | null): string {
	return value == null ? '-' : `${formattedNum(value, false) ?? '0'}%`
}

function MetricRow({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
	return (
		<KeyValueRow label={label}>
			<span className={monospace ? 'font-jetbrains font-medium' : 'font-medium'}>{value}</span>
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

function KeyValueRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<dt className="shrink-0 text-sm text-(--text-secondary)">{label}</dt>
			<dd className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-right">{children}</dd>
		</div>
	)
}

export function EquityTickerPage(props: IEquityTickerPageProps) {
	const router = useRouter()
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const activeTab = useMemo<EquityTab>(() => {
		const tab = readSingleQueryValue(router.query.tab)
		return tab && TABS.includes(tab as EquityTab) ? (tab as EquityTab) : 'overview'
	}, [router.query.tab])

	const setActiveTab = (tab: EquityTab) => {
		void pushShallowQuery(router, { tab: tab === 'overview' ? undefined : tab })
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="text-xl font-bold">{props.name}</h1>
					<p className="text-(--text-disabled)">({props.ticker})</p>
				</div>
				<div className="flex flex-wrap items-center gap-2 text-sm text-(--text-secondary)">
					<span>{props.metadata.industry}</span>
					<span className="text-(--text-disabled)">•</span>
					<span>CIK {props.metadata.cik}</span>
					{props.metadata.startDate ? (
						<>
							<span className="text-(--text-disabled)">•</span>
							<span>Coverage since {formatEquitiesDate(props.metadata.startDate)}</span>
						</>
					) : null}
					{props.summary.updatedAt ? (
						<>
							<span className="text-(--text-disabled)">•</span>
							<span>Updated {formatEquitiesDateTime(props.summary.updatedAt)}</span>
						</>
					) : null}
				</div>
			</div>

			<div className="grid gap-2 lg:grid-cols-4">
				<div className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-(--text-label)">Current Price</span>
					<span className="font-jetbrains text-xl font-semibold">{formatCurrency(props.summary.currentPrice)}</span>
				</div>
				<div className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-(--text-label)">24h Price Change</span>
					<span
						className={`font-jetbrains text-xl font-semibold ${
							props.summary.priceChangePercentage == null
								? ''
								: props.summary.priceChangePercentage >= 0
									? 'text-(--success)'
									: 'text-(--error)'
						}`}
					>
						{formatPercent(props.summary.priceChangePercentage)}
					</span>
				</div>
				<div className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-(--text-label)">Market Cap</span>
					<span className="font-jetbrains text-xl font-semibold">{formatCurrency(props.summary.marketCap)}</span>
				</div>
				<div className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-(--text-label)">24h Volume</span>
					<span className="font-jetbrains text-xl font-semibold">{formatCurrency(props.summary.volume)}</span>
				</div>
			</div>

			<div className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center gap-2 p-3 pb-0">
					<h2 className="mr-auto text-base font-semibold">{`$${props.ticker} Price History`}</h2>
					<ChartExportButtons
						chartInstance={chartInstance}
						filename={`${props.ticker.toLowerCase()}-price-history`}
						title={`$${props.ticker} Price History`}
					/>
				</div>
				<Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={props.priceHistoryChart.dataset}
						charts={props.priceHistoryChart.charts}
						valueSymbol="$"
						title=""
						hideDataZoom={props.priceHistoryChart.dataset.source.length < 2}
						onReady={handleChartReady}
					/>
				</Suspense>
			</div>

			<div className="flex w-full overflow-x-auto text-xs font-medium">
				{TABS.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
						data-active={activeTab === tab}
						className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
					>
						{TAB_LABELS[tab]}
					</button>
				))}
			</div>

			{activeTab === 'overview' ? (
				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<SectionCard title="Key Data">
						<MetricRow label="Current Price" value={formatCurrency(props.summary.currentPrice)} monospace />
						<MetricRow label="24h Price Change" value={formatPercent(props.summary.priceChangePercentage)} monospace />
						<MetricRow label="Market Cap" value={formatCurrency(props.summary.marketCap)} monospace />
						<MetricRow label="24h Volume" value={formatCurrency(props.summary.volume)} monospace />
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
						<MetricRow label="CIK" value={formatText(props.metadata.cik)} />
						<MetricRow label="Start Date" value={formatEquitiesDate(props.metadata.startDate)} />
						<MetricRow label="Last Updated At" value={formatEquitiesDateTime(props.summary.updatedAt)} />
					</SectionCard>
				</div>
			) : null}

			{activeTab === 'financials' ? <EquitiesFinancialsTable statements={props.statements} /> : null}
			{activeTab === 'filings' ? (
				<EquitiesFilingsTable filings={props.filings} filingForms={props.filingForms} />
			) : null}
		</div>
	)
}
