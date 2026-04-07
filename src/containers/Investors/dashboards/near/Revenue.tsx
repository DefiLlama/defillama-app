import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import { lazy, useEffect, useState } from 'react'
import type { IChartProps, IMultiSeriesChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/Investors/index'
import { useRevenueData, getValidTimeframeForAggregation, type WalletEntry } from './revenueApi'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

function KpiCard({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
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
						<span className="pointer-events-none absolute top-5 left-0 z-10 hidden w-64 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 text-xs text-(--text-secondary) shadow-lg group-hover:block">
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
	return <h2 className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">{children}</h2>
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
		cell: (info) => {
			const row = info.row.original
			return row.link ? (
				<a
					href={row.link}
					target="_blank"
					rel="noopener noreferrer"
					className="font-mono text-sm text-(--sl-accent) hover:underline"
				>
					{info.getValue()}
				</a>
			) : (
				<span className="font-mono text-sm">{info.getValue()}</span>
			)
		},
		size: 300
	}),
	walletColumnHelper.accessor('totalFormatted', {
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
	const [aggregation, setAggregation] = useState<'daily' | 'weekly' | 'monthly'>('daily')
	const [emissionsView, setEmissionsView] = useState<'percentage' | 'absolute'>('percentage')

	// Auto-adjust timeframe when aggregation changes
	useEffect(() => {
		const validTimeframe = getValidTimeframeForAggregation(globalTimeframe, aggregation)
		if (validTimeframe !== globalTimeframe) {
			setGlobalTimeframe(validTimeframe as typeof globalTimeframe)
		}
	}, [aggregation, globalTimeframe])

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
			sorting: [{ id: 'totalFormatted', desc: true }]
		}
	})

	if (isLoading || !data) {
		return null
	}

	const aggregateData = (dates: string[], series: number[]): Array<[number, number]> => {
		if (aggregation === 'daily') {
			return getFilteredData(dates, series)
		}

		// First filter by timeframe
		let n: number
		switch (globalTimeframe) {
			case '7d':
				n = 7
				break
			case '30d':
				n = 30
				break
			case '1y':
				n = 365
				break
			case 'all':
				n = dates.length
				break
			case 'ytd': {
				const now = new Date()
				const startOfYear = new Date(now.getFullYear(), 0, 1)
				const daysSinceYearStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
				n = Math.min(daysSinceYearStart, dates.length)
				break
			}
			default:
				n = dates.length
		}

		const start = Math.max(0, dates.length - n)
		const filteredDates = dates.slice(start)
		const filteredSeries = series.slice(start)

		// Aggregate by period
		const aggregated: { [key: string]: number } = {}
		const dateKeys: string[] = []

		filteredDates.forEach((dateStr, i) => {
			const date = new Date(dateStr + 'T00:00:00Z')
			let key: string

			if (aggregation === 'weekly') {
				const day = date.getDay()
				const diff = date.getDate() - day + (day === 0 ? -6 : 1)
				const monday = new Date(date.setDate(diff))
				key = monday.toISOString().split('T')[0]
			} else {
				// monthly
				key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
			}

			if (!aggregated[key]) {
				aggregated[key] = 0
				dateKeys.push(key)
			}
			aggregated[key] += filteredSeries[i] || 0
		})

		const uniqueKeys = Array.from(new Set(dateKeys)).sort()
		return uniqueKeys.map((key) => [Math.floor(new Date(key + 'T00:00:00Z').getTime() / 1000), aggregated[key]])
	}

	const getFilteredData = (dates: string[], series: number[]) => {
		let n: number
		switch (globalTimeframe) {
			case '7d':
				n = 7
				break
			case '30d':
				n = 30
				break
			case '1y':
				n = 365
				break
			case 'all':
				n = dates.length
				break
			case 'ytd': {
				const now = new Date()
				const startOfYear = new Date(now.getFullYear(), 0, 1)
				const daysSinceYearStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
				n = Math.min(daysSinceYearStart, dates.length)
				break
			}
			default:
				n = dates.length
		}
		const start = Math.max(0, dates.length - n)
		return dates
			.slice(start)
			.map(
				(date, i) =>
					[Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000), series[start + i] || 0] as [number, number]
			)
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
			data: aggregateData(data.rawData.feesDates, data.rawData.protocolFeesSeries),
			yAxisIndex: 1,
			stack: 'fees'
		},
		{
			name: 'Intent Fees',
			type: 'bar' as const,
			color: '#4cae4f',
			data: aggregateData(data.rawData.feesDates, data.rawData.intentFeesSeries),
			yAxisIndex: 1,
			stack: 'fees'
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
			name: 'Protocol Revenue',
			type: 'bar' as const,
			color: '#4691ce',
			data: aggregateData(data.rawData.revenueDates, data.rawData.burnRevenueSeries),
			yAxisIndex: 1,
			stack: 'revenue'
		},
		{
			name: 'Intent Revenue',
			type: 'bar' as const,
			color: '#4cae4f',
			data: aggregateData(data.rawData.revenueDates, data.rawData.intentsRevenueSeries),
			yAxisIndex: 1,
			stack: 'revenue'
		}
	]

	return (
		<div className="flex flex-col gap-6">
			<details className="group rounded-xl border border-(--cards-border) bg-(--cards-bg) transition-all hover:border-(--text-label)">
				<summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-base font-semibold text-(--text-primary)">
					<span>Quick Investment Thesis</span>
					<svg
						className="h-5 w-5 shrink-0 text-(--text-label) transition-transform duration-200 group-open:rotate-180"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</summary>
				<div className="flex flex-col gap-4 border-t border-(--cards-border) px-5 pt-4 pb-5 text-sm leading-relaxed text-(--text-secondary)">
					<p>
						The standard way to evaluate NEAR understates its traction. Base-chain metrics alone miss the majority of
						fee-generating activity. When NEAR Intents volume is included, the annualized fee run rate as of early 2026
						is approximately $53M, placing NEAR&apos;s P/S ratio at roughly 28x. Ethereum trades at 194x. Solana trades
						at 40x. At a $1.49B market cap, that gap is the core of the investment case.
					</p>
					<p>
						The February 2026 fee switch is the structural event that makes this legible onchain. Before it, Intents
						fees accrued outside the base protocol. After it, 100% of NEAR Intents volume triggers $NEAR purchases
						through a three-tier fee architecture. Combined with the 70% gas burn on base-chain fees, every dollar of
						Intents volume now creates direct, measurable supply compression. The token has moved from utility to
						fee-accrual.
					</p>
					<p>
						The October 2025 halving cut annual inflation from 5% to 2.5%, lowering the deflationary threshold by half.
						At $1.22 per NEAR, the protocol now needs approximately $177M in daily volume to become net deflationary.
						The trailing 90-day daily average through February 2026 was $77M. Under base case growth of 3.5x annually,
						the model projects NEAR crosses the deflationary threshold in 2026, with the threshold itself declining each
						subsequent year as the blended take rate rises with native front-end adoption.
					</p>
					<p>
						There is also a reflexive element worth understanding. As the NEAR price rises, each token bought back
						through the Intents fee mechanism absorbs more USD-denominated issuance in token terms, meaning higher
						prices lower the volume required for net deflation. Volume drives deflation, deflation drives price
						appreciation, price appreciation broadens institutional access, institutional access drives volume. This
						loop operates most forcefully at inflection points, which is where the protocol appears to be now.
					</p>
				</div>
			</details>

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
					<KpiCard label="YTD" value={data.kpis.fees.ytd.formatted} tooltip="Year to date total fees" />
					<KpiCard label="30D" value={data.kpis.fees.d30.formatted} tooltip="Last 30 days total fees" />
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
					<KpiCard label="YTD" value={data.kpis.revenue.ytd.formatted} tooltip="Year to date revenue" />
					<KpiCard label="30D" value={data.kpis.revenue.d30.formatted} tooltip="Last 30 days revenue" />
				</div>
			</div>

			<div className="flex items-center justify-between">
				<SectionHeader>Data Aggregation</SectionHeader>
				<TimeframeToggle
					value={aggregation}
					onChange={(v) => setAggregation(v as typeof aggregation)}
					options={[
						{ value: 'daily', label: 'Daily' },
						{ value: 'weekly', label: 'Weekly' },
						{ value: 'monthly', label: 'Monthly' }
					]}
				/>
			</div>

			<div className="flex flex-col gap-4">
				<SectionHeader>Total Fees Generated in NEAR</SectionHeader>
				<ChartCard
					title="All fees earned by NEAR Protocol and Products"
					subtitle={`Converted from USD to NEAR at daily prices. Line shows cumulative (left axis), bars show ${aggregation} breakdown (right axis).`}
				>
					<MultiSeriesChart
						series={feesChartSeries}
						valueSymbol=" NEAR"
						yAxisSymbols={[' NEAR', ' NEAR']}
						height="400px"
						showAggregateInTooltip={true}
						chartOptions={{
							series: {
								barMaxWidth: 40
							}
						}}
					/>
				</ChartCard>
			</div>

			<div className="flex flex-col gap-4">
				<SectionHeader>Revenue Over Time</SectionHeader>
				<ChartCard
					title="NEAR received by protocol"
					subtitle={`Intents fee wallets (fefundsadmin + 1csfundsadmin) plus protocol transaction fees (70% burned). Line shows cumulative (left axis), bars show ${aggregation} breakdown (right axis).`}
				>
					<MultiSeriesChart
						series={revenueChartSeries}
						valueSymbol=" NEAR"
						yAxisSymbols={[' NEAR', ' NEAR']}
						height="400px"
						showAggregateInTooltip={true}
						chartOptions={{
							series: {
								barMaxWidth: 40
							}
						}}
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
					subtitle={
						emissionsView === 'percentage'
							? 'Cumulative revenue as percentage of cumulative emissions'
							: 'Cumulative revenue vs cumulative emissions'
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

			{data.walletBreakdown && data.walletBreakdown.length > 0 && (
				<div className="flex flex-col gap-4">
					<SectionHeader>Wallet Breakdown</SectionHeader>
					<div className="overflow-x-auto rounded-lg border border-(--cards-border) bg-(--cards-bg)">
						<table className="w-full">
							<thead>
								{walletTable.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id} className="border-b border-(--cards-border)">
										{headerGroup.headers.map((header) => (
											<th
												key={header.id}
												className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase"
												style={{ width: header.getSize() }}
												onClick={header.column.getToggleSortingHandler()}
											>
												<div className="flex cursor-pointer items-center gap-1">
													{typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : null}
													{header.column.getIsSorted() === 'asc'
														? ' ↑'
														: header.column.getIsSorted() === 'desc'
															? ' ↓'
															: ''}
												</div>
											</th>
										))}
									</tr>
								))}
							</thead>
							<tbody>
								{walletTable.getRowModel().rows.map((row) => (
									<tr
										key={row.id}
										className="border-b border-(--cards-border) last:border-b-0 hover:bg-(--sl-hover-bg)"
									>
										{row.getVisibleCells().map((cell) => (
											<td key={cell.id} className="px-4 py-2.5 text-sm text-(--text-primary)">
												{typeof cell.column.columnDef.cell === 'function'
													? cell.column.columnDef.cell(cell.getContext())
													: (cell.getValue() as string)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{data.metadata?.faq && data.metadata.faq.length > 0 && (
				<div className="flex flex-col gap-4">
					<SectionHeader>Frequently Asked Questions</SectionHeader>
					<div className="flex flex-col gap-3">
						{data.metadata.faq.map((item, idx) => (
							<details
								key={idx}
								className="group overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg) transition-all hover:border-(--text-label)"
							>
								<summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 text-sm font-medium text-(--text-primary) transition-colors hover:bg-(--sl-hover-bg)">
									<span className="flex items-start gap-3">
										<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-(--text-label) text-xs font-bold text-(--cards-bg)">
											{idx + 1}
										</span>
										<span className="pt-0.5">{item.question}</span>
									</span>
									<svg
										className="mt-1 h-5 w-5 shrink-0 text-(--text-label) transition-transform duration-200 group-open:rotate-180"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
								</summary>
								<div className="border-t border-(--cards-border) bg-(--sl-hover-bg) px-5 pt-4 pb-5">
									<p className="pl-9 text-sm leading-relaxed text-(--text-secondary)">{item.answer}</p>
								</div>
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
