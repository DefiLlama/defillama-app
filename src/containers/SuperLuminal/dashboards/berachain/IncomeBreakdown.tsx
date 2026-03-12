import { lazy, useMemo } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useCustomServerData } from '~/containers/SuperLuminal/CustomServerDataContext'
import { formattedNum } from '~/utils'
import { type BerachainIncomeServerData, useBerachainIncomeData } from './api'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const BERACHAIN_COLORS = { 'Chain Fees': '#4FC3F7', Bribes: '#FFA726' }
const BERACHAIN_STACKS = { 'Chain Fees': 'a', Bribes: 'a' }

const BEX_COLORS = { Revenue: '#66BB6A' }

const BEND_COLORS = { Fees: '#AB47BC', Revenue: '#EF5350' }
const BEND_STACKS = { Fees: 'a', Revenue: 'a' }

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

function SectionHeader({ title }: { title: string }) {
	return <h2 className="text-lg font-semibold tracking-tight text-(--text-primary)">{title}</h2>
}

function getCumulativeTotal(data: Record<string, number>[], key: string) {
	if (data.length === 0) return null
	return formattedNum(data[data.length - 1][key], true)
}

export default function IncomeBreakdown() {
	const serverData = useCustomServerData<BerachainIncomeServerData>('berachainIncome')
	const { isLoading, berachain, bex, bend } = useBerachainIncomeData(serverData)

	const kpis = useMemo(() => {
		if (isLoading) return null
		return {
			chainFees: getCumulativeTotal(berachain.cumulative, 'Chain Fees'),
			bribes: getCumulativeTotal(berachain.cumulative, 'Bribes'),
			bexRevenue: getCumulativeTotal(bex.cumulative, 'Revenue'),
			bexVolume: getCumulativeTotal(bex.volumeCumulative, 'Volume'),
			bendFees: getCumulativeTotal(bend.cumulative, 'Fees'),
			bendRevenue: getCumulativeTotal(bend.cumulative, 'Revenue')
		}
	}, [isLoading, berachain, bex, bend])

	return (
		<div className="flex flex-col gap-6">
			{/* Berachain Section */}
			<SectionHeader title="Berachain" />
			<div className="grid grid-cols-2 gap-4">
				{kpis ? (
					<>
						<KpiCard label="Total Chain Fees" value={kpis.chainFees} />
						<KpiCard label="Total Bribes" value={kpis.bribes} />
					</>
				) : (
					<>
						<KpiSkeleton label="Total Chain Fees" />
						<KpiSkeleton label="Total Bribes" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="Monthly Breakdown" />
			) : (
				<ChartCard title="Monthly Breakdown">
					<BarChart
						chartData={berachain.monthly}
						stacks={BERACHAIN_STACKS}
						stackColors={BERACHAIN_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Cumulative Chain Fees" />
			) : (
				<ChartCard title="Cumulative Chain Fees">
					<AreaChart
						chartData={berachain.cumulative}
						stacks={['Chain Fees']}
						stackColors={BERACHAIN_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Cumulative Bribes" />
			) : (
				<ChartCard title="Cumulative Bribes">
					<AreaChart
						chartData={berachain.cumulative}
						stacks={['Bribes']}
						stackColors={BERACHAIN_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{/* BEX Section */}
			<SectionHeader title="BEX" />
			<div className="grid grid-cols-2 gap-4">
				{kpis ? (
					<>
						<KpiCard label="Total BEX Revenue" value={kpis.bexRevenue} />
						<KpiCard label="Cumulative Volume" value={kpis.bexVolume} />
					</>
				) : (
					<>
						<KpiSkeleton label="Total BEX Revenue" />
						<KpiSkeleton label="Cumulative Volume" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="Monthly Revenue" />
			) : (
				<ChartCard title="Monthly Revenue">
					<BarChart
						chartData={bex.monthly}
						stacks={{ Revenue: 'a' }}
						stackColors={BEX_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Cumulative Revenue" />
			) : (
				<ChartCard title="Cumulative Revenue">
					<AreaChart
						chartData={bex.cumulative}
						stacks={['Revenue']}
						stackColors={BEX_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{/* Bend Section */}
			<SectionHeader title="Bend" />
			<div className="grid grid-cols-2 gap-4">
				{kpis ? (
					<>
						<KpiCard label="Total Bend Fees" value={kpis.bendFees} />
						<KpiCard label="Total Bend Revenue" value={kpis.bendRevenue} />
					</>
				) : (
					<>
						<KpiSkeleton label="Total Bend Fees" />
						<KpiSkeleton label="Total Bend Revenue" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="Monthly Breakdown" />
			) : (
				<ChartCard title="Monthly Breakdown">
					<BarChart
						chartData={bend.monthly}
						stacks={BEND_STACKS}
						stackColors={BEND_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Cumulative Fees" />
			) : (
				<ChartCard title="Cumulative Fees">
					<AreaChart
						chartData={bend.cumulative}
						stacks={['Fees']}
						stackColors={BEND_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Cumulative Revenue" />
			) : (
				<ChartCard title="Cumulative Revenue">
					<AreaChart
						chartData={bend.cumulative}
						stacks={['Revenue']}
						stackColors={BEND_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}
		</div>
	)
}
