import { lazy, useMemo } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import {
	useDistActualRevenue,
	useDistRevenueProjection,
	useDistSusdsTvl,
	useDistXrSusds,
	useDistXrSusdc,
	useDistStakedUsdsTvl
} from './distributionApi'

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
	const { chartData: actualRevData, keys: actualRevKeys, colors: actualRevColors, isLoading: actualRevLoading } =
		useDistActualRevenue()
	const { chartData: projData, keys: projKeys, colors: projColors, isLoading: projLoading } =
		useDistRevenueProjection()
	const { chartData: susdsTvlData, keys: susdsTvlKeys, colors: susdsTvlColors, isLoading: susdsTvlLoading } =
		useDistSusdsTvl()
	const { chartData: xrSusdsData, keys: xrSusdsKeys, colors: xrSusdsColors, isLoading: xrSusdsLoading } =
		useDistXrSusds()
	const { chartData: xrSusdcData, keys: xrSusdcKeys, colors: xrSusdcColors, isLoading: xrSusdcLoading } =
		useDistXrSusdc()
	const {
		chartData: stakedUsdsTvlData,
		keys: stakedUsdsTvlKeys,
		colors: stakedUsdsTvlColors,
		isLoading: stakedUsdsTvlLoading
	} = useDistStakedUsdsTvl()

	const actualRevStacks = useMemo(() => makeStacks(actualRevKeys), [actualRevKeys])
	const projStacks = useMemo(() => makeStacks(projKeys), [projKeys])
	const xrSusdsStacks = useMemo(() => makeStacks(xrSusdsKeys), [xrSusdsKeys])
	const xrSusdcStacks = useMemo(() => makeStacks(xrSusdcKeys), [xrSusdcKeys])

	return (
		<div className="flex flex-col gap-4">
			{actualRevLoading ? (
				<CardSkeleton title="Actual Revenue - User" />
			) : (
				<ChartCard title="Actual Revenue - User">
					<BarChart
						chartData={actualRevData}
						stacks={actualRevStacks}
						stackColors={actualRevColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{projLoading ? (
				<CardSkeleton title="Revenue Projection - User" />
			) : (
				<ChartCard title="Revenue Projection - User">
					<BarChart
						chartData={projData}
						stacks={projStacks}
						stackColors={projColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{susdsTvlLoading ? (
				<CardSkeleton title="sUSDS & sUSDC TVL by Spark Referrals" />
			) : (
				<ChartCard title="sUSDS & sUSDC TVL by Spark Referrals">
					<AreaChart
						chartData={susdsTvlData}
						stacks={susdsTvlKeys}
						stackColors={susdsTvlColors}
						valueSymbol="$"
						title=""
						isStackedChart={true}
						hideGradient={true}
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{xrSusdsLoading ? (
				<CardSkeleton title="XR Rewards - sUSDS Crosschain" />
			) : (
				<ChartCard title="XR Rewards - sUSDS Crosschain">
					<BarChart
						chartData={xrSusdsData}
						stacks={xrSusdsStacks}
						stackColors={xrSusdsColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{xrSusdcLoading ? (
				<CardSkeleton title="XR Rewards - sUSDC Crosschain" />
			) : (
				<ChartCard title="XR Rewards - sUSDC Crosschain">
					<BarChart
						chartData={xrSusdcData}
						stacks={xrSusdcStacks}
						stackColors={xrSusdcColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{stakedUsdsTvlLoading ? (
				<CardSkeleton title="Staked USDS TVL by Spark Referrals" />
			) : (
				<ChartCard title="Staked USDS TVL by Spark Referrals">
					<AreaChart
						chartData={stakedUsdsTvlData}
						stacks={stakedUsdsTvlKeys}
						stackColors={stakedUsdsTvlColors}
						valueSymbol="$"
						title=""
						isStackedChart={true}
						hideGradient={true}
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}
		</div>
	)
}
