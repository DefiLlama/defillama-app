import { lazy, useMemo } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useDistributionData } from './distributionApi'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const SCROLL_LEGEND = {
	legend: { type: 'scroll' as const, orient: 'horizontal' as const, top: 0 }
}

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

function makeStacks(keys: string[]): Record<string, string> {
	const s: Record<string, string> = {}
	for (const k of keys) s[k] = 'a'
	return s
}

export default function DistributionRewards() {
	const { data, isLoading } = useDistributionData()

	const actualRevStacks = useMemo(() => makeStacks(data?.actualRevenue.keys ?? []), [data?.actualRevenue.keys])
	const projStacks = useMemo(() => makeStacks(data?.revenueProjection.keys ?? []), [data?.revenueProjection.keys])
	const xrSusdsStacks = useMemo(() => makeStacks(data?.xrSusds.keys ?? []), [data?.xrSusds.keys])
	const xrSusdcStacks = useMemo(() => makeStacks(data?.xrSusdc.keys ?? []), [data?.xrSusdc.keys])

	if (isLoading || !data) {
		return (
			<div className="flex flex-col gap-4">
				<CardSkeleton title="Actual Revenue - User" />
				<CardSkeleton title="Revenue Projection - User" />
				<CardSkeleton title="sUSDS & sUSDC TVL by Spark Referrals" />
				<CardSkeleton title="XR Rewards - sUSDS Crosschain" />
				<CardSkeleton title="XR Rewards - sUSDC Crosschain" />
				<CardSkeleton title="Staked USDS TVL by Spark Referrals" />
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<ChartCard title="Actual Revenue - User">
				<BarChart
					chartData={data.actualRevenue.chartData}
					stacks={actualRevStacks}
					stackColors={data.actualRevenue.colors}
					valueSymbol="$"
					title=""
					height="400px"
					chartOptions={SCROLL_LEGEND}
				/>
			</ChartCard>

			<ChartCard title="Revenue Projection - User">
				<BarChart
					chartData={data.revenueProjection.chartData}
					stacks={projStacks}
					stackColors={data.revenueProjection.colors}
					valueSymbol="$"
					title=""
					height="400px"
					chartOptions={SCROLL_LEGEND}
				/>
			</ChartCard>

			<ChartCard title="sUSDS & sUSDC TVL by Spark Referrals">
				<AreaChart
					chartData={data.susdsTvl.chartData}
					stacks={data.susdsTvl.keys}
					stackColors={data.susdsTvl.colors}
					valueSymbol="$"
					title=""
					isStackedChart={true}
					hideGradient={true}
					height="400px"
					chartOptions={SCROLL_LEGEND}
				/>
			</ChartCard>

			<ChartCard title="XR Rewards - sUSDS Crosschain">
				<BarChart
					chartData={data.xrSusds.chartData}
					stacks={xrSusdsStacks}
					stackColors={data.xrSusds.colors}
					valueSymbol="$"
					title=""
					height="400px"
					chartOptions={SCROLL_LEGEND}
				/>
			</ChartCard>

			<ChartCard title="XR Rewards - sUSDC Crosschain">
				<BarChart
					chartData={data.xrSusdc.chartData}
					stacks={xrSusdcStacks}
					stackColors={data.xrSusdc.colors}
					valueSymbol="$"
					title=""
					height="400px"
					chartOptions={SCROLL_LEGEND}
				/>
			</ChartCard>

			<ChartCard title="Staked USDS TVL by Spark Referrals">
				<AreaChart
					chartData={data.stakedUsdsTvl.chartData}
					stacks={data.stakedUsdsTvl.keys}
					stackColors={data.stakedUsdsTvl.colors}
					valueSymbol="$"
					title=""
					isStackedChart={true}
					hideGradient={true}
					height="400px"
					chartOptions={SCROLL_LEGEND}
				/>
			</ChartCard>
		</div>
	)
}
