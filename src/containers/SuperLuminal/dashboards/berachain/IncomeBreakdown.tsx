import { lazy, useMemo } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useCustomServerData } from '~/containers/SuperLuminal/CustomServerDataContext'
import { formattedNum } from '~/utils'
import { type BerachainIncomeServerData, useBerachainIncomeData } from './api'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const STACK_COLORS = {
	'Chain Fees': '#4FC3F7',
	Bribes: '#FFA726',
	'BEX Revenue': '#66BB6A'
}

const BAR_STACKS = { 'Chain Fees': 'a', Bribes: 'a', 'BEX Revenue': 'a' }

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

export default function IncomeBreakdown() {
	const serverData = useCustomServerData<BerachainIncomeServerData>('berachainIncome')
	const { monthlyData, cumulativeData, isLoading } = useBerachainIncomeData(serverData)

	const kpis = useMemo(() => {
		if (isLoading || cumulativeData.length === 0) return null
		const last = cumulativeData[cumulativeData.length - 1]
		return {
			chainFees: formattedNum(last['Chain Fees'], true),
			bribes: formattedNum(last['Bribes'], true),
			bexRevenue: formattedNum(last['BEX Revenue'], true)
		}
	}, [cumulativeData, isLoading])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{kpis ? (
					<>
						<KpiCard label="Total Chain Fees" value={kpis.chainFees} />
						<KpiCard label="Total Bribes" value={kpis.bribes} />
						<KpiCard label="Total BEX Revenue" value={kpis.bexRevenue} />
					</>
				) : (
					<>
						<KpiSkeleton label="Total Chain Fees" />
						<KpiSkeleton label="Total Bribes" />
						<KpiSkeleton label="Total BEX Revenue" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="Monthly Income Breakdown" />
			) : (
				<ChartCard title="Monthly Income Breakdown">
					<BarChart
						chartData={monthlyData}
						stacks={BAR_STACKS}
						stackColors={STACK_COLORS}
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
						chartData={cumulativeData}
						stacks={['Chain Fees']}
						stackColors={STACK_COLORS}
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
						chartData={cumulativeData}
						stacks={['Bribes']}
						stackColors={STACK_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Cumulative BEX Revenue" />
			) : (
				<ChartCard title="Cumulative BEX Revenue">
					<AreaChart
						chartData={cumulativeData}
						stacks={['BEX Revenue']}
						stackColors={STACK_COLORS}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}
		</div>
	)
}
