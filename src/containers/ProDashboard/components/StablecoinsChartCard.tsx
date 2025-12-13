import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { useStablecoinsChartData } from '~/containers/ProDashboard/components/datasets/StablecoinsDataset/useStablecoinsChartData'
import { STABLECOIN_TOKEN_COLORS } from '~/containers/ProDashboard/utils/colorManager'
import { download, formattedNum, toNiceCsvDate } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { StablecoinsChartConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface StablecoinsChartCardProps {
	config: StablecoinsChartConfig
}

const CHART_TYPE_LABELS: Record<string, string> = {
	totalMcap: 'Total Market Cap',
	tokenMcaps: 'Token Market Caps',
	pie: 'Pie',
	dominance: 'Dominance',
	usdInflows: 'USD Inflows',
	tokenInflows: 'Token Inflows'
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

const inflowsChartOptions = {
	overrides: {
		inflow: true
	}
}

const MCAP_STACKS = ['Mcap']
const EMPTY_HALLMARKS: [number, string][] = []

export function StablecoinsChartCard({ config }: StablecoinsChartCardProps) {
	const { chain, chartType } = config
	const { timePeriod, customTimePeriod } = useProDashboard()
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)

	const {
		peggedAreaTotalData,
		peggedAreaChartData,
		chainsCirculatingValues,
		dataWithExtraPeggedAndDominanceByDay,
		usdInflows,
		tokenInflows,
		tokenInflowNames,
		peggedAssetNames,
		isLoading
	} = useStablecoinsChartData(chain)

	const filteredChartData = useMemo(() => {
		if (!timePeriod || timePeriod === 'all') {
			return {
				peggedAreaTotalData,
				peggedAreaChartData,
				dataWithExtraPeggedAndDominanceByDay,
				usdInflows,
				tokenInflows
			}
		}

		const filterTimeSeries = (data: any[]) => {
			if (!data || data.length === 0) return data
			const hasDateField = data[0]?.date !== undefined
			if (!hasDateField) return data

			const points: [number, number][] = data.map((el) => [el.date, 1])
			const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			return data.filter((el) => filteredTimestamps.has(el.date))
		}

		return {
			peggedAreaTotalData: filterTimeSeries(peggedAreaTotalData),
			peggedAreaChartData: filterTimeSeries(peggedAreaChartData),
			dataWithExtraPeggedAndDominanceByDay: filterTimeSeries(dataWithExtraPeggedAndDominanceByDay),
			usdInflows: filterTimeSeries(usdInflows),
			tokenInflows: filterTimeSeries(tokenInflows)
		}
	}, [peggedAreaTotalData, peggedAreaChartData, dataWithExtraPeggedAndDominanceByDay, usdInflows, tokenInflows, timePeriod, customTimePeriod])

	const latestMcap = useMemo(() => {
		const data = filteredChartData.peggedAreaTotalData
		if (!data || data.length === 0) return null
		return data[data.length - 1]?.Mcap ?? null
	}, [filteredChartData.peggedAreaTotalData])

	const handleCsvExport = useCallback(() => {
		let rows: (string | number)[][] = []
		let filename = ''

		const chainSlug = chain === 'All' ? 'all' : chain.toLowerCase().replace(/\s+/g, '-')

		switch (chartType) {
			case 'totalMcap':
				rows = [['Date', 'Market Cap'], ...filteredChartData.peggedAreaTotalData.map((el: any) => [toNiceCsvDate(el.date), el.Mcap ?? ''])]
				filename = `stablecoins-${chainSlug}-total-mcap.csv`
				break
			case 'tokenMcaps':
				rows = [
					['Date', ...peggedAssetNames],
					...filteredChartData.peggedAreaChartData.map((el: any) => [toNiceCsvDate(el.date), ...peggedAssetNames.map((name) => el[name] ?? '')])
				]
				filename = `stablecoins-${chainSlug}-token-mcaps.csv`
				break
			case 'dominance':
				rows = [
					['Date', ...peggedAssetNames],
					...filteredChartData.dataWithExtraPeggedAndDominanceByDay.map((el: any) => [
						toNiceCsvDate(el.date),
						...peggedAssetNames.map((name) => el[name] ?? '')
					])
				]
				filename = `stablecoins-${chainSlug}-dominance.csv`
				break
			case 'usdInflows':
				rows = [['Date', 'USD Inflows'], ...filteredChartData.usdInflows.map((el: any) => [toNiceCsvDate(el.date), el.Inflows ?? ''])]
				filename = `stablecoins-${chainSlug}-usd-inflows.csv`
				break
			case 'tokenInflows':
				rows = [
					['Date', ...tokenInflowNames],
					...filteredChartData.tokenInflows.map((el: any) => [toNiceCsvDate(el.date), ...tokenInflowNames.map((name) => el[name] ?? '')])
				]
				filename = `stablecoins-${chainSlug}-token-inflows.csv`
				break
			case 'pie':
				rows = [['Token', 'Market Cap'], ...chainsCirculatingValues.map((el: any) => [el.name, el.value])]
				filename = `stablecoins-${chainSlug}-pie.csv`
				break
		}

		if (rows.length > 0) {
			const csvContent = rows.map((row) => row.join(',')).join('\n')
			download(filename, csvContent)
		}
	}, [filteredChartData, chainsCirculatingValues, peggedAssetNames, tokenInflowNames, chain, chartType])

	const chartTypeLabel = CHART_TYPE_LABELS[chartType] || chartType
	const chainLabel = chain === 'All' ? 'All Chains' : chain
	const imageTitle = `${chainLabel} Stablecoins - ${chartTypeLabel}`
	const imageFilename = `stablecoins-${chain === 'All' ? 'all' : chain.toLowerCase().replace(/\s+/g, '-')}-${chartType}`

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	const renderChart = () => {
		switch (chartType) {
			case 'totalMcap':
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
							stacks={MCAP_STACKS}
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
			case 'tokenMcaps':
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
							stacks={peggedAssetNames}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideDownloadButton={true}
							hideGradient={true}
							stackColors={STABLECOIN_TOKEN_COLORS}
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'pie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart chartData={chainsCirculatingValues} stackColors={STABLECOIN_TOKEN_COLORS} />
					</Suspense>
				)
			case 'dominance':
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
							stacks={peggedAssetNames}
							hideDefaultLegend={true}
							hideDownloadButton={true}
							hideGradient={true}
							expandTo100Percent={true}
							stackColors={STABLECOIN_TOKEN_COLORS}
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'usdInflows':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<BarChart
							chartData={filteredChartData.usdInflows}
							color="#4f8fea"
							title=""
							hideDownloadButton={true}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'tokenInflows':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<BarChart
							chartData={filteredChartData.tokenInflows}
							title=""
							hideDefaultLegend={true}
							hideDownloadButton={true}
							customLegendName="Token"
							customLegendOptions={tokenInflowNames}
							chartOptions={inflowsChartOptions}
							stackColors={STABLECOIN_TOKEN_COLORS}
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
					<p className="pro-text2 text-xs">{chainLabel} Stablecoins</p>
				</div>
				{hasChartData && (
					<div className="flex gap-2">
						{chartType !== 'pie' && (
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

			{latestMcap !== null && chartType === 'totalMcap' && (
				<div className="mb-2 flex gap-4">
					<div className="flex flex-col">
						<span className="pro-text3 text-[10px] uppercase">Total Market Cap</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: '#4f8fea' }}>
							{formattedNum(latestMcap, true)}
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
