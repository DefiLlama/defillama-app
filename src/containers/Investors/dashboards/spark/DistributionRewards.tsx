import type * as echarts from 'echarts/core'
import { lazy, useCallback, useMemo, useRef } from 'react'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { formatBarChart } from '~/components/ECharts/utils'
import { useDistributionData } from './distributionApi'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

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

function mergeCumulativeStackChartData(
	chartData: Array<Record<string, number>>,
	keys: string[]
): Array<Record<string, number>> {
	const sorted = chartData.toSorted((a, b) => Number(a.date) - Number(b.date))
	const bySec = new Map<number, Record<string, number>>()
	for (const key of keys) {
		const tuples: Array<[string | number, number]> = sorted.map((row) => [
			row.date,
			typeof row[key] === 'number' && Number.isFinite(row[key]) ? row[key] : 0
		])
		const cum = formatBarChart({
			data: tuples,
			groupBy: 'cumulative',
			denominationPriceHistory: null
		})
		for (const [tsMs, val] of cum) {
			if (val === null) continue
			const sec = Math.round(tsMs / 1000)
			let row = bySec.get(sec)
			if (!row) {
				row = { date: sec }
				bySec.set(sec, row)
			}
			row[key] = val
		}
	}
	return Array.from(bySec.entries())
		.toSorted((a, b) => a[0] - b[0])
		.map(([, row]) => row)
}

export default function DistributionRewards() {
	const { data, isLoading } = useDistributionData()

	const actualRevStacks = useMemo(() => makeStacks(data?.actualRevenue.keys ?? []), [data?.actualRevenue.keys])
	const xrSusdsStacks = useMemo(() => makeStacks(data?.xrSusds.keys ?? []), [data?.xrSusds.keys])
	const xrSusdcStacks = useMemo(() => makeStacks(data?.xrSusdc.keys ?? []), [data?.xrSusdc.keys])

	const revenueProjectionCumulativeChartData = useMemo(() => {
		if (!data?.revenueProjection) return []
		return mergeCumulativeStackChartData(data.revenueProjection.chartData, data.revenueProjection.keys)
	}, [data?.revenueProjection])

	const actualRev = useChartInstance()
	const revProjection = useChartInstance()
	const susdsTvl = useChartInstance()
	const xrSusds = useChartInstance()
	const xrSusdc = useChartInstance()
	const stakedUsds = useChartInstance()

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
			<ChartCard
				title="Actual Revenue - User"
				actions={
					<ChartPngExportButton
						chartInstance={actualRev.getInstance}
						filename="actual-revenue-user"
						title="Actual Revenue - User"
						smol
					/>
				}
			>
				<BarChart
					chartData={data.actualRevenue.chartData}
					stacks={actualRevStacks}
					stackColors={data.actualRevenue.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={actualRev.onReady}
				/>
			</ChartCard>

			<ChartCard
				title="Revenue Projection - User"
				actions={
					<ChartPngExportButton
						chartInstance={revProjection.getInstance}
						filename="revenue-projection-user"
						title="Revenue Projection - User"
						smol
					/>
				}
			>
				<AreaChart
					chartData={revenueProjectionCumulativeChartData}
					stacks={data.revenueProjection.keys}
					stackColors={data.revenueProjection.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					isStackedChart={true}
					hideGradient={true}
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={revProjection.onReady}
				/>
			</ChartCard>

			<ChartCard
				title="sUSDS & sUSDC TVL by Spark Referrals"
				actions={
					<ChartPngExportButton
						chartInstance={susdsTvl.getInstance}
						filename="susds-susdc-tvl-spark-referrals"
						title="sUSDS & sUSDC TVL by Spark Referrals"
						smol
					/>
				}
			>
				<AreaChart
					chartData={data.susdsTvl.chartData}
					stacks={data.susdsTvl.keys}
					stackColors={data.susdsTvl.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					isStackedChart={true}
					hideGradient={true}
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={susdsTvl.onReady}
				/>
			</ChartCard>

			<ChartCard
				title="XR Rewards - sUSDS Crosschain"
				actions={
					<ChartPngExportButton
						chartInstance={xrSusds.getInstance}
						filename="xr-rewards-susds-crosschain"
						title="XR Rewards - sUSDS Crosschain"
						smol
					/>
				}
			>
				<BarChart
					chartData={data.xrSusds.chartData}
					stacks={xrSusdsStacks}
					stackColors={data.xrSusds.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={xrSusds.onReady}
				/>
			</ChartCard>

			<ChartCard
				title="XR Rewards - sUSDC Crosschain"
				actions={
					<ChartPngExportButton
						chartInstance={xrSusdc.getInstance}
						filename="xr-rewards-susdc-crosschain"
						title="XR Rewards - sUSDC Crosschain"
						smol
					/>
				}
			>
				<BarChart
					chartData={data.xrSusdc.chartData}
					stacks={xrSusdcStacks}
					stackColors={data.xrSusdc.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={xrSusdc.onReady}
				/>
			</ChartCard>

			<ChartCard
				title="Staked USDS TVL by Spark Referrals"
				actions={
					<ChartPngExportButton
						chartInstance={stakedUsds.getInstance}
						filename="staked-usds-tvl-spark-referrals"
						title="Staked USDS TVL by Spark Referrals"
						smol
					/>
				}
			>
				<AreaChart
					chartData={data.stakedUsdsTvl.chartData}
					stacks={data.stakedUsdsTvl.keys}
					stackColors={data.stakedUsdsTvl.colors}
					hideDownloadButton
					valueSymbol="$"
					title=""
					isStackedChart={true}
					hideGradient={true}
					height="400px"
					chartOptions={SCROLL_LEGEND}
					onReady={stakedUsds.onReady}
				/>
			</ChartCard>
		</div>
	)
}
