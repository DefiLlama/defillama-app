import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { useStablecoinAssetChartData } from '~/containers/ProDashboard/components/datasets/StablecoinAssetDataset/useStablecoinAssetChartData'
import { colorManager } from '~/containers/ProDashboard/utils/colorManager'
import { download, formattedNum, toNiceCsvDate } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { StablecoinAssetChartConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface StablecoinAssetChartCardProps {
	config: StablecoinAssetChartConfig
}

const CHART_TYPE_LABELS: Record<string, string> = {
	totalCirc: 'Total Circulating',
	chainMcaps: 'By Chain',
	chainPie: 'Pie',
	chainDominance: 'Dominance'
}

const chartOptions = {
	grid: {
		left: 12,
		bottom: 68,
		top: 12,
		right: 12,
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	}
}

const CIRC_STACKS = ['Circulating']
const EMPTY_HALLMARKS: [number, string][] = []

export function StablecoinAssetChartCard({ config }: StablecoinAssetChartCardProps) {
	const { stablecoin, stablecoinId, chartType } = config
	const { timePeriod } = useProDashboard()
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)

	const {
		peggedAreaTotalData,
		peggedAreaChartData,
		chainsCirculatingValues,
		dataWithExtraPeggedAndDominanceByDay,
		chainsUnique,
		stablecoinName,
		stablecoinSymbol,
		isLoading
	} = useStablecoinAssetChartData(stablecoinId)

	const chainColors = useMemo(() => {
		const colors: Record<string, string> = {}
		chainsUnique.forEach((chain) => {
			colors[chain] = colorManager.getItemColor(chain, 'chain')
		})
		return colors
	}, [chainsUnique])

	const filteredChartData = useMemo(() => {
		if (!timePeriod || timePeriod === 'all') {
			return {
				peggedAreaTotalData,
				peggedAreaChartData,
				dataWithExtraPeggedAndDominanceByDay
			}
		}

		const filterTimeSeries = (data: any[]) => {
			if (!data || data.length === 0) return data
			const hasDateField = data[0]?.date !== undefined
			if (!hasDateField) return data

			const points: [number, number][] = data.map((el) => [el.date, 1])
			const filtered = filterDataByTimePeriod(points, timePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			return data.filter((el) => filteredTimestamps.has(el.date))
		}

		return {
			peggedAreaTotalData: filterTimeSeries(peggedAreaTotalData),
			peggedAreaChartData: filterTimeSeries(peggedAreaChartData),
			dataWithExtraPeggedAndDominanceByDay: filterTimeSeries(dataWithExtraPeggedAndDominanceByDay)
		}
	}, [peggedAreaTotalData, peggedAreaChartData, dataWithExtraPeggedAndDominanceByDay, timePeriod])

	const latestCirculating = useMemo(() => {
		const data = filteredChartData.peggedAreaTotalData
		if (!data || data.length === 0) return null
		return data[data.length - 1]?.Circulating ?? null
	}, [filteredChartData.peggedAreaTotalData])

	const handleCsvExport = useCallback(() => {
		let rows: (string | number)[][] = []
		let filename = ''

		const assetSlug = stablecoin.toLowerCase().replace(/\s+/g, '-')

		switch (chartType) {
			case 'totalCirc':
				rows = [
					['Date', 'Circulating'],
					...filteredChartData.peggedAreaTotalData.map((el: any) => [toNiceCsvDate(el.date), el.Circulating ?? ''])
				]
				filename = `${assetSlug}-total-circulating.csv`
				break
			case 'chainMcaps':
				rows = [
					['Date', ...chainsUnique],
					...filteredChartData.peggedAreaChartData.map((el: any) => [
						toNiceCsvDate(el.date),
						...chainsUnique.map((chain) => el[chain] ?? '')
					])
				]
				filename = `${assetSlug}-by-chain.csv`
				break
			case 'chainDominance':
				rows = [
					['Date', ...chainsUnique],
					...filteredChartData.dataWithExtraPeggedAndDominanceByDay.map((el: any) => [
						toNiceCsvDate(el.date),
						...chainsUnique.map((chain) => el[chain] ?? '')
					])
				]
				filename = `${assetSlug}-chain-dominance.csv`
				break
			case 'chainPie':
				rows = [['Chain', 'Circulating'], ...chainsCirculatingValues.map((el: any) => [el.name, el.value])]
				filename = `${assetSlug}-chain-pie.csv`
				break
		}

		if (rows.length > 0) {
			const csvContent = rows.map((row) => row.join(',')).join('\n')
			download(filename, csvContent)
		}
	}, [filteredChartData, chainsCirculatingValues, chainsUnique, stablecoin, chartType])

	const chartTypeLabel = CHART_TYPE_LABELS[chartType] || chartType
	const displayName = stablecoinName || stablecoin
	const imageTitle = `${displayName} - ${chartTypeLabel}`
	const imageFilename = `${stablecoin.toLowerCase().replace(/\s+/g, '-')}-${chartType}`

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	const renderChart = () => {
		switch (chartType) {
			case 'totalCirc':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<AreaChart
							title=""
							chartData={filteredChartData.peggedAreaTotalData}
							stacks={CIRC_STACKS}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideDownloadButton={true}
							hallmarks={EMPTY_HALLMARKS}
							color="#4f8fea"
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'chainMcaps':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<AreaChart
							title=""
							chartData={filteredChartData.peggedAreaChartData}
							stacks={chainsUnique}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideDownloadButton={true}
							hideGradient={true}
							stackColors={chainColors}
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'chainPie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart chartData={chainsCirculatingValues} stackColors={chainColors} />
					</Suspense>
				)
			case 'chainDominance':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<AreaChart
							title=""
							valueSymbol="%"
							chartData={filteredChartData.dataWithExtraPeggedAndDominanceByDay}
							stacks={chainsUnique}
							hideDefaultLegend={true}
							hideDownloadButton={true}
							hideGradient={true}
							expandTo100Percent={true}
							stackColors={chainColors}
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	const hasChartData =
		filteredChartData.peggedAreaTotalData.length > 0 ||
		filteredChartData.peggedAreaChartData.length > 0 ||
		chainsCirculatingValues.length > 0

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="pro-text1 text-sm font-semibold">{chartTypeLabel}</h3>
					<p className="pro-text2 text-xs">
						{displayName} {stablecoinSymbol ? `(${stablecoinSymbol})` : ''}
					</p>
				</div>
				{hasChartData && (
					<div className="flex gap-2">
						{chartType !== 'chainPie' && (
							<ChartExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
						)}
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</div>
				)}
			</div>

			{latestCirculating !== null && chartType === 'totalCirc' && (
				<div className="mb-2 flex gap-4">
					<div className="flex flex-col">
						<span className="pro-text3 text-[10px] uppercase">Total Circulating</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: '#4f8fea' }}>
							{formattedNum(latestCirculating, true)}
						</span>
					</div>
				</div>
			)}

			<div className="flex-1">
				<Suspense
					fallback={
						<div className="flex h-[320px] items-center justify-center">
							<LocalLoader />
						</div>
					}
				>
					{renderChart()}
				</Suspense>
			</div>
		</div>
	)
}
