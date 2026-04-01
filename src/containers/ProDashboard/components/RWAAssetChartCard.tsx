import { lazy, Suspense, useMemo } from 'react'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { useChartImageExport } from '../hooks/useChartImageExport'
import { useProDashboardTime } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { RWAAssetChartConfig, RWAOverviewChartMetric } from '../types'
import { useRWAAssetChartData } from './datasets/RWADataset/useRWAChartData'
import { LoadingSpinner } from './LoadingSpinner'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const METRIC_TO_DIMENSION: Record<RWAOverviewChartMetric, string> = {
	activeMcap: 'Active Mcap',
	onChainMcap: 'Onchain Mcap',
	defiActiveTvl: 'DeFi Active TVL'
}

interface RWAAssetChartCardProps {
	config: RWAAssetChartConfig
}

export function RWAAssetChartCard({ config }: RWAAssetChartCardProps) {
	const { assetId, assetName, metrics } = config
	const { chartInstance, handleChartReady } = useChartImageExport()
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const { chartDataset, isLoading } = useRWAAssetChartData(assetId)

	const filteredDataset = useMemo(() => {
		if (!chartDataset) return null
		const selectedDimensions = ['timestamp', ...metrics.map((m) => METRIC_TO_DIMENSION[m])]
		const filteredDimensions = chartDataset.dimensions.filter((d) => selectedDimensions.includes(d))
		let filteredSource = chartDataset.source.map((row) => {
			const newRow: Record<string, any> = { timestamp: row.timestamp }
			for (const dim of filteredDimensions) {
				if (dim !== 'timestamp') {
					newRow[dim] = (row as any)[dim]
				}
			}
			return newRow
		})

		if (timePeriod && timePeriod !== 'all') {
			const points: [number, number][] = filteredSource.map((row: any) => [row.timestamp, 1])
			const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			filteredSource = filteredSource.filter((row: any) => filteredTimestamps.has(row.timestamp))
		}

		return { source: filteredSource, dimensions: filteredDimensions }
	}, [chartDataset, metrics, timePeriod, customTimePeriod])

	const metricsLabel = metrics.map((m) => METRIC_TO_DIMENSION[m]).join(', ')
	const imageTitle = `${assetName} - ${metricsLabel}`
	const imageFilename = `rwa-${assetId}-${metrics.join('-')}`

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LoadingSpinner />
			</div>
		)
	}

	const hasData = filteredDataset && filteredDataset.source.length > 0

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-semibold pro-text1">{assetName}</h3>
					<p className="text-xs pro-text2">{metricsLabel}</p>
				</div>
				{hasData ? (
					<ChartPngExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
				) : null}
			</div>
			<div className="flex-1">
				<Suspense
					fallback={
						<div className="flex h-[320px] items-center justify-center">
							<LoadingSpinner />
						</div>
					}
				>
					{filteredDataset ? (
						<MultiSeriesChart2 dataset={filteredDataset} hideDefaultLegend={false} onReady={handleChartReady} />
					) : (
						<div className="flex h-[320px] items-center justify-center text-sm pro-text2">No data available</div>
					)}
				</Suspense>
			</div>
		</div>
	)
}
