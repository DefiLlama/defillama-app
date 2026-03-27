import { lazy, useEffect, useState } from 'react'
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import type { IChartProps, IMultiSeriesChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/SuperLuminal/index'
import { useRevenueData, type WalletEntry } from './revenueApi'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

function KpiCard({ 
	label, 
	value, 
	tooltip 
}: { 
	label: string
	value: string
	tooltip?: string
}) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="flex items-center gap-1">
				<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
				{tooltip && (
					<span className="group relative cursor-help">
						<svg className="h-3.5 w-3.5 text-(--text-label)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r="10" strokeWidth="2" />
							<path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" />
						</svg>
						<span className="pointer-events-none absolute left-0 top-5 z-10 hidden w-64 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 text-xs text-(--text-secondary) shadow-lg group-hover:block">
							{tooltip}
						</span>
					</span>
				)}
			</div>
			<span className="text-2xl font-semibold text-(--text-primary)">{value}</span>
		</div>
	)
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-1 text-sm font-medium text-(--text-label)">{title}</h3>
			{subtitle && <p className="mb-3 text-xs text-(--text-secondary)">{subtitle}</p>}
			{children}
		</div>
	)
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-label)">{children}</h2>
}

function TimeframeToggle({
	value,
	onChange,
	options
}: {
	value: string
	onChange: (value: string) => void
	options: Array<{ value: string; label: string }>
}) {
	return (
		<div className="inline-flex gap-0.5 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-0.5">
			{options.map((option) => (
				<button
					key={option.value}
					onClick={() => onChange(option.value)}
					className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
						value === option.value
							? 'bg-(--sl-accent) text-white'
							: 'text-(--text-secondary) hover:bg-(--sl-hover-bg) hover:text-(--text-primary)'
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	)
}

const walletColumnHelper = createColumnHelper<WalletEntry>()

const walletColumns = [
	walletColumnHelper.accessor('wallet', {
		header: 'Wallet',
		cell: (info) => (
			<a
				href={`https://nearblocks.io/address/${info.getValue()}`}
				target="_blank"
				rel="noopener noreferrer"
				className="font-mono text-sm text-(--sl-accent) hover:underline"
			>
				{info.getValue()}
			</a>
		),
		size: 300
	}),
	walletColumnHelper.accessor('totalNearFormatted', {
		header: 'Total NEAR',
		cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
		size: 150
	}),
	walletColumnHelper.accessor('shareFormatted', {
		header: 'Share',
		cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
		size: 100
	})
]

export default function Revenue() {
	const { data, isLoading } = useRevenueData()
	const onContentReady = useContentReady()
	const [globalTimeframe, setGlobalTimeframe] = useState<'7d' | '30d' | 'ytd' | '1y' | 'all'>('all')
	const [emissionsView, setEmissionsView] = useState<'percentage' | 'absolute'>('percentage')

	useEffect(() => {
		if (data && !isLoading) {
			onContentReady()
		}
	}, [data, isLoading, onContentReady])

	const walletTable = useReactTable({
		data: data?.walletBreakdown ?? [],
		columns: walletColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		initialState: {
			sorting: [{ id: 'totalNearFormatted', desc: true }]
		}
	})

	if (isLoading || !data) {
		return null
	}

	const getFilteredData = (dates: string[], series: number[]) => {
		let n: number
		switch (globalTimeframe) {
			case '7d': n = 7; break
			case '30d': n = 30; break
			case '1y': n = 365; break
			case 'all': n = dates.length; break
			case 'ytd': {
				const now = new Date()
				const startOfYear = new Date(now.getFullYear(), 0, 1)
				const daysSinceYearStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
				n = Math.min(daysSinceYearStart, dates.length)
				break
			}
			default: n = dates.length
		}
		const start = Math.max(0, dates.length - n)
		return dates.slice(start).map((date, i) => [
			Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000), 
			series[start + i] || 0
		] as [number, number])
	}

	const feesChartSeries = [
		{
			name: 'Cumulative Fees',
			type: 'line' as const,
			color: '#00C1DE',
			data: getFilteredData(data.rawData.feesDates, data.rawData.cumulativeFees),
			yAxisIndex: 0
		},
		{
			name: 'Protocol Fees',
			type: 'bar' as const,
			color: '#4691ce',
			data: getFilteredData(data.rawData.feesDates, data.rawData.protocolFeesSeries),
			yAxisIndex: 0
		},
		{
			name: 'Intent Fees',
			type: 'bar' as const,
			color: '#4cae4f',
			data: getFilteredData(data.rawData.feesDates, data.rawData.intentFeesSeries),
			yAxisIndex: 0
		}
	]

	const revenueChartSeries = [
		{
			name: 'Cumulative Revenue',
			type: 'line' as const,
			color: '#00C1DE',
			data: getFilteredData(data.rawData.revenueDates, data.rawData.cumulativeRevenue),
			yAxisIndex: 0
		},
		{
			name: 'Burn Revenue',
			type: 'bar' as const,
			color: '#4691ce',
			data: getFilteredData(data.rawData.revenueDates, data.rawData.burnRevenueSeries),
			yAxisIndex: 0
		},
		{
			name: 'Intents Revenue',
			type: 'bar' as const,
			color: '#4cae4f',
			data: getFilteredData(data.rawData.revenueDates, data.rawData.intentsRevenueSeries),
			yAxisIndex: 0
		}
	]

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<SectionHeader>Dashboard Timeframe</SectionHeader>
				<TimeframeToggle
					value={globalTimeframe}
					onChange={(v) => setGlobalTimeframe(v as typeof globalTimeframe)}
					options={[
						{ value: '7d', label: '7D' },
						{ value: '30d', label: '30D' },
						{ value: 'ytd', label: 'YTD' },
						{ value: '1y', label: '1Y' },
						{ value: 'all', label: 'All' }
					]}
				/>
			</div>

			<div className="flex flex-col gap-4">
				<SectionHeader>Total Fees Generated</SectionHeader>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<KpiCard 
						label="All Time" 
						value={data.kpis.fees.allTime.formatted}
						tooltip="Total fees earned by NEAR Protocol and Products, converted from USD to NEAR at daily prices"
					/>
					<KpiCard 
						label="YTD" 
						value={data.kpis.fees.ytd.formatted}
						tooltip="Year to date total fees"
					/>
					<KpiCard 
						label="30D" 
						value={data.kpis.fees.d30.formatted}
						tooltip="Last 30 days total fees"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<SectionHeader>Revenue</SectionHeader>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<KpiCard 
						label="All Time" 
						value={data.kpis.revenue.allTime.formatted}
						tooltip="NEAR received by intents fee wallets (fefundsadmin + 1csfundsadmin) plus protocol transaction fees (70% burned)"
					/>
					<KpiCard 
						label="YTD" 
						value={data.kpis.revenue.ytd.formatted}
						tooltip="Year to date revenue"
					/>
					<KpiCard 
						label="30D" 
						value={data.kpis.revenue.d30.formatted}
						tooltip="Last 30 days revenue"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<SectionHeader>Total Fees Generated in NEAR</SectionHeader>
				<ChartCard 
					title="All fees earned by NEAR Protocol and Products" 
					subtitle="Converted from USD to NEAR at daily prices. Line shows cumulative, bars show daily breakdown."
				>
					<MultiSeriesChart
						series={feesChartSeries}
						valueSymbol=" NEAR"
						height="400px"
					/>
				</ChartCard>
			</div>

			<div className="flex flex-col gap-4">
				<SectionHeader>Revenue Over Time</SectionHeader>
				<ChartCard 
					title="NEAR received by protocol" 
					subtitle="Intents fee wallets (fefundsadmin + 1csfundsadmin) plus protocol transaction fees (70% burned). Line shows cumulative, bars show daily breakdown."
				>
					<MultiSeriesChart
						series={revenueChartSeries}
						valueSymbol=" NEAR"
						height="400px"
					/>
				</ChartCard>
			</div>

			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<SectionHeader>Revenue vs Emissions</SectionHeader>
					<TimeframeToggle
						value={emissionsView}
						onChange={(v) => setEmissionsView(v as typeof emissionsView)}
						options={[
							{ value: 'percentage', label: '% of Emissions' },
							{ value: 'absolute', label: 'Absolute' }
						]}
					/>
				</div>
				<ChartCard 
					title="Comparison of protocol revenue relative to token issuance"
					subtitle={emissionsView === 'percentage' 
						? "Cumulative revenue as percentage of cumulative emissions"
						: "Cumulative revenue vs cumulative emissions"
					}
				>
					{emissionsView === 'percentage' ? (
						<AreaChart
							chartData={getFilteredData(data.rawData.emissionsDates, data.rawData.percentageFromCumulative)}
							valueSymbol="%"
							title=""
							height="400px"
						/>
					) : (
						<MultiSeriesChart
							series={[
								{
									name: 'Cumulative Revenue',
									type: 'line',
									color: '#00C1DE',
									data: getFilteredData(data.rawData.emissionsDates, data.rawData.cumulativeRevenue),
									yAxisIndex: 0
								},
								{
									name: 'Cumulative Emissions',
									type: 'line',
									color: '#FF6B6B',
									data: getFilteredData(data.rawData.emissionsDates, data.rawData.cumulativeEmissions),
									yAxisIndex: 0
								}
							]}
							valueSymbol=" NEAR"
							height="400px"
						/>
					)}
				</ChartCard>
			</div>

			{data.metadata?.faq && data.metadata.faq.length > 0 && (
				<div className="flex flex-col gap-4">
					<SectionHeader>Frequently Asked Questions</SectionHeader>
					<div className="flex flex-col gap-3">
						{data.metadata.faq.map((item, idx) => (
							<details 
								key={idx}
								className="group rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4"
							>
								<summary className="cursor-pointer text-sm font-medium text-(--text-primary) list-none flex items-center justify-between">
									<span className="flex items-center gap-2">
										<span className="text-xs font-semibold text-(--text-label)">
											{String(idx + 1).padStart(2, '0')}
										</span>
										{item.question}
									</span>
									<svg 
										className="h-5 w-5 shrink-0 text-(--text-label) transition-transform group-open:rotate-180" 
										fill="none" 
										stroke="currentColor" 
										viewBox="0 0 24 24"
									>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
								</summary>
								<p className="mt-3 text-sm leading-relaxed text-(--text-secondary)">
									{item.answer}
								</p>
							</details>
						))}
					</div>
				</div>
			)}

			{data.metadata && (
				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4 text-xs text-(--text-label)">
					<p>
						Data via{' '}
						{Object.entries(data.metadata.links || {}).map(([key, url], idx, arr) => (
							<span key={key}>
								<a href={url} target="_blank" rel="noopener noreferrer" className="text-(--sl-accent) hover:underline">
									{key}
								</a>
								{idx < arr.length - 1 ? ' · ' : ''}
							</span>
						))}
					</p>
					<p className="mt-1">Last updated: {data.metadata.updatedAt}</p>
				</div>
			)}
		</div>
	)
}
