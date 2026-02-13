import { lazy, useMemo } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import { useEtherfiCashFeesCharts, useEtherfiCashMetrics, useEtherfiCashTvlChart } from './api'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			{children}
		</div>
	)
}

function CardSkeleton({ title }: { title: string }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			<div className="flex h-[400px] items-center justify-center">
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-(--text-disabled) border-t-transparent" />
			</div>
		</div>
	)
}

function KpiCard({ label, value }: { label: string; value: string | number | null }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value ?? '—'}</span>
		</div>
	)
}

function KpiSkeleton({ label }: { label: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<div className="h-8 w-24 animate-pulse rounded bg-(--text-disabled) opacity-20" />
		</div>
	)
}

export default function CreditCard() {
	const { fees, revenue, isLoading: metricsLoading } = useEtherfiCashMetrics()
	const { tvlChart, inflowsChart, isLoading: tvlLoading } = useEtherfiCashTvlChart()
	const { feesChart, revenueChart, holdersRevenueChart, isLoading: feesLoading } = useEtherfiCashFeesCharts()

	const hasHoldersRevenue = useMemo(
		() => holdersRevenueChart.some((d) => d['Holders Revenue'] !== 0),
		[holdersRevenueChart]
	)

	const kpis = useMemo(() => {
		if (metricsLoading || tvlLoading) return null

		const prevTvl = tvlChart.length >= 2 ? tvlChart[tvlChart.length - 2].TVL : null
		const prevInflow = inflowsChart.length >= 2 ? inflowsChart[inflowsChart.length - 2]['USD Inflows'] : null

		return {
			tvl: prevTvl != null ? formattedNum(prevTvl, true) : '—',
			fees24h: fees?.total48hto24h != null ? formattedNum(fees.total48hto24h, true) : '—',
			revenue24h: revenue?.total48hto24h != null ? formattedNum(revenue.total48hto24h, true) : '—',
			inflows: prevInflow != null ? formattedNum(prevInflow, true) : '—'
		}
	}, [fees, revenue, tvlChart, inflowsChart, metricsLoading, tvlLoading])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{kpis ? (
					<>
						<KpiCard label="TVL" value={kpis.tvl} />
						<KpiCard label="Fees (24h)" value={kpis.fees24h} />
						<KpiCard label="Revenue (24h)" value={kpis.revenue24h} />
						<KpiCard label="USD Inflows (Latest)" value={kpis.inflows} />
					</>
				) : (
					<>
						<KpiSkeleton label="TVL" />
						<KpiSkeleton label="Fees (24h)" />
						<KpiSkeleton label="Revenue (24h)" />
						<KpiSkeleton label="USD Inflows (Latest)" />
					</>
				)}
			</div>

			{tvlLoading ? (
				<CardSkeleton title="TVL" />
			) : (
				<ChartCard title="TVL">
					<AreaChart
						chartData={tvlChart}
						stacks={['TVL']}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{feesLoading ? (
				<CardSkeleton title="Fees" />
			) : (
				<ChartCard title="Fees">
					<BarChart
						chartData={feesChart}
						stacks={{ Fees: 'a' }}
						stackColors={{ Fees: '#4FC3F7' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{feesLoading ? (
				<CardSkeleton title="Revenue" />
			) : (
				<ChartCard title="Revenue">
					<BarChart
						chartData={revenueChart}
						stacks={{ Revenue: 'a' }}
						stackColors={{ Revenue: '#66BB6A' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{!feesLoading && hasHoldersRevenue && (
				<ChartCard title="Holders Revenue">
					<BarChart
						chartData={holdersRevenueChart}
						stacks={{ 'Holders Revenue': 'a' }}
						stackColors={{ 'Holders Revenue': '#FFA726' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{tvlLoading ? (
				<CardSkeleton title="USD Inflows" />
			) : (
				<ChartCard title="USD Inflows">
					<BarChart
						chartData={inflowsChart}
						stacks={{ 'USD Inflows': 'a' }}
						stackColors={{ 'USD Inflows': '#AB47BC' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}
		</div>
	)
}
