import type * as echarts from 'echarts/core'
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import type { IBarChartProps, IChartProps, IMultiSeriesChartProps, IPieChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/Investors/index'
import { assignColors } from './api'
import { useFinancialsData, type AllocatedAssetsData, type AllocatedAssetsEntry } from './financialsApi'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

const SCROLL_LEGEND = {
	legend: { type: 'scroll' as const, orient: 'horizontal' as const, top: 0 }
}

function ChartCard({
	title,
	actions,
	children
}: {
	title: string
	actions?: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="text-sm font-medium text-(--text-label)">{title}</h3>
				{actions}
			</div>
			{children}
		</div>
	)
}

function useChartInstance() {
	const ref = useRef<echarts.ECharts | null>(null)
	const onReady = useCallback((instance: echarts.ECharts | null) => {
		ref.current = instance
	}, [])
	const getInstance = useCallback(() => ref.current, [])
	return { onReady, getInstance }
}

function KpiCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value}</span>
		</div>
	)
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return <h2 className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">{children}</h2>
}

type AADimension = 'byProtocol' | 'byNetwork' | 'byAsset'

function ToggleButton({
	active,
	onClick,
	children
}: {
	active: boolean
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			onClick={onClick}
			className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
				active
					? 'bg-(--sl-accent-muted) text-(--sl-accent)'
					: 'bg-(--cards-bg) text-(--text-secondary) hover:bg-(--sl-hover-bg) hover:text-(--text-primary)'
			} border border-(--cards-border)`}
		>
			{children}
		</button>
	)
}

function AllocatedAssetsSection({
	allocatedAssets,
	aaHistorical
}: {
	allocatedAssets: AllocatedAssetsData
	aaHistorical: Record<
		AADimension,
		{
			data: Array<Record<string, number>>
			stacks: string[]
			colors: Record<string, string>
		}
	>
}) {
	const [view, setView] = useState<'breakdown' | 'historical'>('breakdown')
	const [dimension, setDimension] = useState<AADimension>('byProtocol')
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

	const currentEntries: AllocatedAssetsEntry[] = allocatedAssets[dimension]
	const pieData = useMemo(() => currentEntries.map((e) => ({ name: e.name, value: e.value })), [currentEntries])
	const pieColors = useMemo(() => assignColors(currentEntries.map((e) => e.name)), [currentEntries])

	const toggleRow = (idx: number) => {
		setExpandedRows((prev) => {
			const next = new Set(prev)
			if (next.has(idx)) next.delete(idx)
			else next.add(idx)
			return next
		})
	}

	const onDimensionChange = (dim: AADimension) => {
		setDimension(dim)
		setExpandedRows(new Set())
	}

	const hist = aaHistorical[dimension]

	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>SLL Allocated Assets</SectionHeader>
			<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
					<h3 className="text-sm font-medium text-(--text-label)">{allocatedAssets.title}</h3>
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex gap-1">
							<ToggleButton active={view === 'breakdown'} onClick={() => setView('breakdown')}>
								Breakdown
							</ToggleButton>
							<ToggleButton active={view === 'historical'} onClick={() => setView('historical')}>
								Historical
							</ToggleButton>
						</div>
						<div className="h-5 w-px bg-(--cards-border)" />
						<div className="flex gap-1">
							<ToggleButton active={dimension === 'byProtocol'} onClick={() => onDimensionChange('byProtocol')}>
								By Protocol
							</ToggleButton>
							<ToggleButton active={dimension === 'byNetwork'} onClick={() => onDimensionChange('byNetwork')}>
								By Network
							</ToggleButton>
							<ToggleButton active={dimension === 'byAsset'} onClick={() => onDimensionChange('byAsset')}>
								By Asset
							</ToggleButton>
						</div>
					</div>
				</div>

				{view === 'breakdown' ? (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="min-h-[320px]">
							<PieChart
								chartData={pieData}
								stackColors={pieColors}
								radius={['40%', '70%']}
								height="320px"
								valueSymbol="$"
							/>
						</div>
						<div>
							<div className="max-h-[400px] overflow-y-auto">
								{currentEntries.map((entry, idx) => {
									const hasChildren = entry.children && entry.children.length > 0
									const isOpen = expandedRows.has(idx)
									const color = pieColors[entry.name] || '#8b949e'
									return (
										<div key={entry.name} className="border-b border-(--cards-border) last:border-b-0">
											<div
												className={`flex cursor-pointer items-center gap-2 py-2.5 ${hasChildren ? 'hover:opacity-80' : ''}`}
												onClick={() => hasChildren && toggleRow(idx)}
											>
												<span className="w-4 shrink-0 text-[10px] text-(--text-label)">
													{hasChildren ? (isOpen ? '▼' : '▶') : ''}
												</span>
												<span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
												<span className="min-w-0 flex-1 truncate text-sm text-(--text-primary)">{entry.name}</span>
												<span className="shrink-0 text-sm font-semibold text-(--text-primary)">{entry.formatted}</span>
												<span className="w-12 shrink-0 text-right text-xs text-(--text-label)">{entry.pct}%</span>
											</div>
											{isOpen && entry.children && (
												<div className="pb-2 pl-8">
													{entry.children.map((child) => (
														<div key={child.name} className="flex items-center py-1.5 text-xs text-(--text-label)">
															<span className="min-w-0 flex-1 truncate">{child.name}</span>
															<span className="shrink-0">{child.formatted}</span>
														</div>
													))}
												</div>
											)}
										</div>
									)
								})}
							</div>
							<div className="mt-3 flex items-center justify-between border-t border-(--cards-border) pt-3">
								<span className="text-sm text-(--text-label)">Total AUM</span>
								<span className="text-sm font-bold text-(--text-primary)">{allocatedAssets.totalFormatted}</span>
							</div>
						</div>
					</div>
				) : (
					<AreaChart
						chartData={hist.data}
						stacks={hist.stacks}
						stackColors={hist.colors}
						valueSymbol="$"
						title=""
						isStackedChart
						hideGradient
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				)}
			</div>
		</div>
	)
}

function MonthlyReturnsSection({ data }: { data: NonNullable<ReturnType<typeof useFinancialsData>['data']> }) {
	const gross = useChartInstance()
	const net = useChartInstance()

	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>Monthly Returns</SectionHeader>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ChartCard
					title={data.monthlyGross.title}
					actions={
						<ChartPngExportButton
							chartInstance={gross.getInstance}
							filename="gross-returns"
							title={data.monthlyGross.title}
							smol
						/>
					}
				>
					<BarChart
						chartData={data.monthlyGross.data}
						stacks={data.monthlyGross.stacks}
						stackColors={data.monthlyGross.colors}
						hideDownloadButton
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
						onReady={gross.onReady}
					/>
				</ChartCard>
				<ChartCard
					title={data.monthlyNet.title}
					actions={
						<ChartPngExportButton
							chartInstance={net.getInstance}
							filename="net-returns"
							title={data.monthlyNet.title}
							smol
						/>
					}
				>
					<BarChart
						chartData={data.monthlyNet.data}
						stacks={data.monthlyNet.stacks}
						stackColors={data.monthlyNet.colors}
						hideDownloadButton
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
						onReady={net.onReady}
					/>
				</ChartCard>
			</div>
		</div>
	)
}

function SusdsDistributionSection({ data }: { data: NonNullable<ReturnType<typeof useFinancialsData>['data']> }) {
	const total = useChartInstance()
	const byChain = useChartInstance()

	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>sUSDS Distribution</SectionHeader>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ChartCard
					title="Spark-distributed USDS"
					actions={
						<ChartPngExportButton
							chartInstance={total.getInstance}
							filename="spark-distributed-usds"
							title="Spark-distributed USDS"
							smol
						/>
					}
				>
					<AreaChart
						chartData={data.supplyTotal.data}
						stacks={data.supplyTotal.stacks}
						hideDownloadButton
						valueSymbol=""
						title=""
						height="400px"
						onReady={total.onReady}
					/>
				</ChartCard>
				<ChartCard
					title={data.supplyByChain.title}
					actions={
						<ChartPngExportButton
							chartInstance={byChain.getInstance}
							filename="susds-by-chain"
							title={data.supplyByChain.title}
							smol
						/>
					}
				>
					<AreaChart
						chartData={data.supplyByChain.data}
						stacks={data.supplyByChain.stacks}
						stackColors={data.supplyByChain.colors}
						hideDownloadButton
						valueSymbol=""
						title=""
						isStackedChart
						hideGradient
						height="400px"
						chartOptions={SCROLL_LEGEND}
						onReady={byChain.onReady}
					/>
				</ChartCard>
			</div>
		</div>
	)
}

type FinData = NonNullable<ReturnType<typeof useFinancialsData>['data']>

function TvlSection({ data }: { data: FinData }) {
	const tvl = useChartInstance()
	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>Total Value Locked</SectionHeader>
			<KpiCard label="Current TVL" value={data.tvl.currentFormatted} />
			<ChartCard
				title={data.tvl.title}
				actions={<ChartPngExportButton chartInstance={tvl.getInstance} filename="tvl" title={data.tvl.title} smol />}
			>
				<AreaChart
					chartData={data.tvl.data}
					stacks={data.tvl.stacks}
					stackColors={data.tvl.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					isStackedChart
					hideGradient
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={tvl.onReady}
				/>
			</ChartCard>
		</div>
	)
}

function DepositsAndBorrowsSection({ data }: { data: FinData }) {
	const deposits = useChartInstance()
	const borrows = useChartInstance()
	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>SparkLend Deposits &amp; Borrows</SectionHeader>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ChartCard
					title={data.deposits.title}
					actions={
						<ChartPngExportButton
							chartInstance={deposits.getInstance}
							filename="sparklend-deposits"
							title={data.deposits.title}
							smol
						/>
					}
				>
					<AreaChart
						chartData={data.deposits.data}
						stacks={data.deposits.stacks}
						hideDownloadButton
						valueSymbol="$"
						title=""
						height="400px"
						onReady={deposits.onReady}
					/>
				</ChartCard>
				<ChartCard
					title={data.borrows.title}
					actions={
						<ChartPngExportButton
							chartInstance={borrows.getInstance}
							filename="sparklend-borrows"
							title={data.borrows.title}
							smol
						/>
					}
				>
					<AreaChart
						chartData={data.borrows.data}
						stacks={data.borrows.stacks}
						hideDownloadButton
						valueSymbol="$"
						title=""
						height="400px"
						color="#f85149"
						onReady={borrows.onReady}
					/>
				</ChartCard>
			</div>
		</div>
	)
}

function SllTvlSection({ data }: { data: FinData }) {
	const sllTvl = useChartInstance()
	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>SLL TVL by Chain</SectionHeader>
			<ChartCard
				title={data.sllTvl.title}
				actions={
					<ChartPngExportButton
						chartInstance={sllTvl.getInstance}
						filename="sll-tvl-by-chain"
						title={data.sllTvl.title}
						smol
					/>
				}
			>
				<AreaChart
					chartData={data.sllTvl.data}
					stacks={data.sllTvl.stacks}
					stackColors={data.sllTvl.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					isStackedChart
					hideGradient
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={sllTvl.onReady}
				/>
			</ChartCard>
		</div>
	)
}

function SavingsTvlSection({ data }: { data: FinData }) {
	const savingsTvl = useChartInstance()
	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>Spark Savings TVL by Chain</SectionHeader>
			<ChartCard
				title={data.savingsTvl.title}
				actions={
					<ChartPngExportButton
						chartInstance={savingsTvl.getInstance}
						filename="spark-savings-tvl-by-chain"
						title={data.savingsTvl.title}
						smol
					/>
				}
			>
				<AreaChart
					chartData={data.savingsTvl.data}
					stacks={data.savingsTvl.stacks}
					stackColors={data.savingsTvl.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					isStackedChart
					hideGradient
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={savingsTvl.onReady}
				/>
			</ChartCard>
		</div>
	)
}

function TreasurySection({ data }: { data: FinData }) {
	const treasury = useChartInstance()
	const buybacks = useChartInstance()
	return (
		<div className="flex flex-col gap-4">
			<SectionHeader>Treasury &amp; Buybacks</SectionHeader>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
					<h3 className="mb-3 text-sm font-medium text-(--text-label)">Treasury</h3>
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between border-b border-(--cards-border) py-2">
							<span className="text-xs text-(--text-label)">Total Treasury Assets</span>
							<span className="text-sm font-semibold text-(--text-primary)">
								{data.treasuryKpis.totalAssets.formatted}
							</span>
						</div>
						<div className="flex items-center justify-between border-b border-(--cards-border) py-2">
							<span className="text-xs text-(--text-label)">Buyback Threshold</span>
							<span className="text-sm font-semibold text-(--text-primary)">
								{data.treasuryKpis.buybackThreshold.formatted}
							</span>
						</div>
						<div className="flex items-center justify-between py-2">
							<span className="text-xs text-(--text-label)">Current vs Threshold</span>
							<span
								className={`text-sm font-semibold ${
									data.treasuryKpis.vsThreshold.value >= 0 ? 'text-green-500' : 'text-red-500'
								}`}
							>
								{data.treasuryKpis.vsThreshold.formatted}
							</span>
						</div>
					</div>
				</div>
				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
					<h3 className="mb-3 text-sm font-medium text-(--text-label)">SPK Buyback Tracker</h3>
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between border-b border-(--cards-border) py-2">
							<span className="text-xs text-(--text-label)">USDS Spent</span>
							<span className="text-sm font-semibold text-(--text-primary)">
								{data.buybackKpis.usdsSpent.formatted}
							</span>
						</div>
						<div className="flex items-center justify-between border-b border-(--cards-border) py-2">
							<span className="text-xs text-(--text-label)">SPK Bought</span>
							<span className="text-sm font-semibold text-(--text-primary)">
								{data.buybackKpis.spkBought.formatted}
							</span>
						</div>
						<div className="flex items-center justify-between py-2">
							<span className="text-xs text-(--text-label)">Avg Price</span>
							<span className="text-sm font-semibold text-(--text-primary)">{data.buybackKpis.avgPrice.formatted}</span>
						</div>
					</div>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ChartCard
					title="Total Treasury"
					actions={
						<ChartPngExportButton
							chartInstance={treasury.getInstance}
							filename="total-treasury"
							title="Total Treasury"
							smol
						/>
					}
				>
					<MultiSeriesChart
						series={data.treasurySeries}
						hideDownloadButton
						valueSymbol="$"
						height="400px"
						onReady={treasury.onReady}
					/>
				</ChartCard>
				<ChartCard
					title="SPK Buybacks"
					actions={
						<ChartPngExportButton
							chartInstance={buybacks.getInstance}
							filename="spk-buybacks"
							title="SPK Buybacks"
							smol
						/>
					}
				>
					<MultiSeriesChart
						series={data.buybacksSeries}
						hideDownloadButton
						valueSymbol=""
						yAxisSymbols={['SPK', 'SPK']}
						height="400px"
						onReady={buybacks.onReady}
					/>
				</ChartCard>
			</div>
		</div>
	)
}

export default function Financials() {
	const { data, isLoading } = useFinancialsData()
	const onContentReady = useContentReady()

	useEffect(() => {
		if (data && !isLoading) {
			onContentReady()
		}
	}, [data, isLoading, onContentReady])

	if (isLoading || !data) {
		return null
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Section 1: KPIs */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{data.kpis.map((kpi) => (
					<KpiCard key={kpi.label} label={kpi.label} value={kpi.formatted} />
				))}
			</div>

			{/* Section 2: Projected Returns Breakdown */}
			<div className="flex flex-col gap-4">
				<SectionHeader>Projected Returns Breakdown</SectionHeader>
				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
					<h3 className="mb-3 text-sm font-medium text-(--text-label)">{data.projectedBreakdown.title}</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="min-h-[300px]">
							<PieChart
								chartData={data.breakdownPieData}
								stackColors={data.breakdownColors}
								radius={['40%', '70%']}
								height="300px"
								valueSymbol="$"
							/>
						</div>
						<div>
							<table className="w-full">
								<thead>
									<tr className="border-b border-(--cards-border)">
										<th className="pb-2 text-left text-xs font-semibold text-(--text-label) uppercase">Product</th>
										<th className="pb-2 text-right text-xs font-semibold text-(--text-label) uppercase">Revenue</th>
										<th className="pb-2 text-right text-xs font-semibold text-(--text-label) uppercase">Share</th>
									</tr>
								</thead>
								<tbody>
									{data.projectedBreakdown.series.map((item) => (
										<tr key={item.name} className="border-b border-(--cards-border) last:border-b-0">
											<td className="py-2.5 text-sm text-(--text-primary)">
												<span
													className="mr-2 inline-block h-2 w-2 rounded-full"
													style={{ background: data.breakdownColors[item.name] || '#8b949e' }}
												/>
												{item.name}
											</td>
											<td className="py-2.5 text-right text-sm font-semibold text-(--text-primary)">
												{item.formatted}
											</td>
											<td className="py-2.5 text-right text-sm text-(--text-label)">{item.pct}%</td>
										</tr>
									))}
								</tbody>
							</table>
							<div className="mt-3 flex items-center justify-between border-t border-(--cards-border) pt-3">
								<span className="text-sm text-(--text-label)">Total</span>
								<span className="text-sm font-bold text-(--text-primary)">
									{data.projectedBreakdown.totalFormatted}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Section 3: Monthly Returns */}
			<MonthlyReturnsSection data={data} />

			{/* Section 4: sUSDS Distribution */}
			<SusdsDistributionSection data={data} />

			{/* Section 5: Allocated Assets */}
			<AllocatedAssetsSection allocatedAssets={data.allocatedAssets} aaHistorical={data.aaHistorical} />

			<TvlSection data={data} />
			<DepositsAndBorrowsSection data={data} />
			<SllTvlSection data={data} />
			<SavingsTvlSection data={data} />
			<TreasurySection data={data} />

			{/* Section 11: Quarterly Reports */}
			{data.quarterlyReports && data.quarterlyReports.length > 0 && (
				<div className="flex flex-col gap-4">
					<SectionHeader>Quarterly Reports</SectionHeader>
					<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
						<div className="flex flex-col">
							{data.quarterlyReports.map((report) => (
								<a
									key={report.url}
									href={report.url}
									target="_blank"
									rel="noopener noreferrer"
									className="border-b border-(--cards-border) py-3 text-sm font-medium text-(--link) last:border-b-0 hover:underline"
								>
									{report.label}
								</a>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
