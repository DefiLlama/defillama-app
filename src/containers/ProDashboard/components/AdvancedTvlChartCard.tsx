import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useMemo } from 'react'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
const dashboardBlue = '#326abd'
import {
	formatProtocolV1TvlsByChain,
	useFetchProtocolV1AddlChartsData
} from '~/containers/ProtocolOverview/protocolV1AddlChartsData'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { download, toNiceCsvDate } from '~/utils'
import { useChartImageExport } from '../hooks/useChartImageExport'
import { useProDashboardTime } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import ProtocolCharts from '../services/ProtocolCharts'
import type { AdvancedTvlChartConfig } from '../types'
import { generateConsistentChartColor } from '../utils/colorManager'
import { ChartPngExportButton } from './ProTable/ChartPngExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface AdvancedTvlChartCardProps {
	config: AdvancedTvlChartConfig
}

const CHART_TYPE_LABELS: Record<string, string> = {
	tvl: 'TVL',
	chainsTvl: 'TVL by Chains',
	tokenValuesUsd: 'Token Values (USD)',
	tokensPie: 'Tokens Breakdown',
	tokenBalances: 'Token Balances (Raw)',
	usdInflows: 'USD Inflows',
	tokenInflows: 'Inflows by Token'
}

const chartOptions = {
	grid: {
		left: 12,
		bottom: 12,
		top: 12,
		right: 12,
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	}
}

const inflowsChartOptions = {
	overrides: {
		inflow: true
	},
	grid: {
		left: 12,
		bottom: 12,
		top: 12,
		right: 12
	}
}

const TVL_STACKS = ['TVL']
const EMPTY_HALLMARKS: [number, string][] = []
const EMPTY_CHART_DATA: any[] = []
const EMPTY_STACKS: string[] = []
const EMPTY_ADDL_DATA: {
	tokensUnique?: string[]
	tokenBreakdownUSD?: any[]
	tokenBreakdownPieChart?: any[]
	tokenBreakdown?: any[]
	usdInflows?: any[]
	tokenInflows?: any[]
} = {}

export function AdvancedTvlChartCard({ config }: AdvancedTvlChartCardProps) {
	const { protocol, protocolName, chartType } = config
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const { chartInstance, handleChartReady } = useChartImageExport()
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const { data: basicTvlData, isLoading: isBasicTvlLoading } = useQuery({
		queryKey: ['advanced-tvl-basic', protocol],
		queryFn: () => ProtocolCharts.tvl(protocol),
		enabled: chartType === 'tvl',
		staleTime: 60 * 60 * 1000
	})

	const { data: addlData, historicalChainTvls, isLoading: isAddlLoading } = useFetchProtocolV1AddlChartsData(protocol)

	const isLoading = chartType === 'tvl' ? isBasicTvlLoading : isAddlLoading

	const { chainsSplit, chainsUnique } = useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatProtocolV1TvlsByChain({ historicalChainTvls, extraTvlsEnabled })
		const lastEntry = chainsSplit[chainsSplit.length - 1] ?? {}
		const chainsUnique = Object.keys(lastEntry)
			.filter((key) => key !== 'date')
			.sort((a, b) => (lastEntry[b] ?? 0) - (lastEntry[a] ?? 0))
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls, extraTvlsEnabled])

	const { tokensUnique, tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown, usdInflows, tokenInflows } =
		addlData ?? EMPTY_ADDL_DATA
	const resolvedTokensUnique = tokensUnique ?? EMPTY_STACKS
	const resolvedTokenBreakdownUSD = tokenBreakdownUSD ?? EMPTY_CHART_DATA
	const resolvedTokenBreakdownPieChart = tokenBreakdownPieChart ?? EMPTY_CHART_DATA
	const resolvedTokenBreakdown = tokenBreakdown ?? EMPTY_CHART_DATA
	const resolvedUsdInflows = usdInflows ?? EMPTY_CHART_DATA
	const resolvedTokenInflows = tokenInflows ?? EMPTY_CHART_DATA
	const resolvedChainsSplit = chainsSplit ?? EMPTY_CHART_DATA

	const stackColors = useMemo(() => {
		const colors: Record<string, string> = {}
		const names = chartType === 'chainsTvl' ? chainsUnique : resolvedTokensUnique
		const itemType = chartType === 'chainsTvl' ? 'chain' : 'protocol'
		for (const name of names) {
			colors[name] = generateConsistentChartColor(name, '#8884d8', itemType)
		}
		return colors
	}, [chainsUnique, resolvedTokensUnique, chartType])

	const tvlData = useMemo(() => {
		return basicTvlData ? basicTvlData.map(([ts, val]) => ({ date: ts, TVL: val })) : EMPTY_CHART_DATA
	}, [basicTvlData])

	const filteredChartData = useMemo(() => {
		const filterTimeSeries = (data: any[]) => {
			if (!data || data.length === 0) return data
			const hasDateField = data[0]?.date !== undefined
			if (!hasDateField) return data

			if (!timePeriod || timePeriod === 'all') return data

			const points: [number, number][] = data.map((el) => [el.date, 1])
			const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			return data.filter((el) => filteredTimestamps.has(el.date))
		}

		const filterStringDateTuples = (data: [string, number][] | undefined) => {
			if (!data || data.length === 0) return data
			if (!timePeriod || timePeriod === 'all') return data
			const asNumbers: [number, number][] = data.map(([d, v]) => [Number(d), v])
			const filtered = filterDataByTimePeriod(asNumbers, timePeriod, customTimePeriod)
			return filtered.map(([d, v]): [string, number] => [String(d), v])
		}

		return {
			chainsSplit: filterTimeSeries(resolvedChainsSplit),
			tokenBreakdownUSD: filterTimeSeries(resolvedTokenBreakdownUSD),
			tokenBreakdown: filterTimeSeries(resolvedTokenBreakdown),
			usdInflows: filterStringDateTuples(resolvedUsdInflows as [string, number][] | undefined),
			tokenInflows: filterTimeSeries(resolvedTokenInflows)
		}
	}, [
		resolvedChainsSplit,
		resolvedTokenBreakdownUSD,
		resolvedTokenBreakdown,
		resolvedUsdInflows,
		resolvedTokenInflows,
		timePeriod,
		customTimePeriod
	])

	const filteredTvlData = useMemo(() => {
		if (!timePeriod || timePeriod === 'all') return tvlData
		const filtered = filterDataByTimePeriod(
			tvlData.map((el) => [el.date, el.TVL] as [number, number]),
			timePeriod,
			customTimePeriod
		)
		const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
		return tvlData.filter((el) => filteredTimestamps.has(el.date))
	}, [tvlData, timePeriod, customTimePeriod])

	const handleCsvExport = () => {
		let rows: (string | number)[][] = []
		let filename = ''
		const protocolSlug = protocol.toLowerCase().replace(/\s+/g, '-')

		switch (chartType) {
			case 'tvl':
				rows = [['Date', 'TVL'], ...(filteredTvlData.map((el) => [toNiceCsvDate(el.date), el.TVL]) ?? [])]
				filename = `${protocolSlug}-tvl.csv`
				break
			case 'chainsTvl':
				rows = [
					['Date', ...chainsUnique],
					...(filteredChartData.chainsSplit?.map((el: any) => [
						toNiceCsvDate(el.date),
						...chainsUnique.map((c) => el[c] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-tvl-by-chains.csv`
				break
			case 'tokenValuesUsd':
				rows = [
					['Date', ...resolvedTokensUnique],
					...(filteredChartData.tokenBreakdownUSD?.map((el: any) => [
						toNiceCsvDate(el.date),
						...resolvedTokensUnique.map((t) => el[t] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-token-values-usd.csv`
				break
			case 'tokensPie':
				rows = [['Token', 'Value'], ...(resolvedTokenBreakdownPieChart.map((el: any) => [el.name, el.value]) ?? [])]
				filename = `${protocolSlug}-tokens-breakdown.csv`
				break
			case 'tokenBalances':
				rows = [
					['Date', ...resolvedTokensUnique],
					...(filteredChartData.tokenBreakdown?.map((el: any) => [
						toNiceCsvDate(el.date),
						...resolvedTokensUnique.map((t) => el[t] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-token-balances.csv`
				break
			case 'usdInflows':
				rows = [
					['Date', 'USD Inflows'],
					...(filteredChartData.usdInflows?.map(([date, val]: [string, number]) => [
						toNiceCsvDate(Number(date)),
						val ?? ''
					]) ?? [])
				]
				filename = `${protocolSlug}-usd-inflows.csv`
				break
			case 'tokenInflows':
				rows = [
					['Date', ...resolvedTokensUnique],
					...(filteredChartData.tokenInflows?.map((el: any) => [
						toNiceCsvDate(el.date),
						...resolvedTokensUnique.map((t) => el[t] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-token-inflows.csv`
				break
		}

		if (rows.length > 0) {
			const csvContent = rows.map((row) => row.join(',')).join('\n')
			download(filename, csvContent)
		}
	}

	const chartTypeLabel = CHART_TYPE_LABELS[chartType] || chartType
	const imageTitle = `${protocolName} - ${chartTypeLabel}`
	const imageFilename = `${protocol.toLowerCase().replace(/\s+/g, '-')}-${chartType}`

	if (isLoading) {
		return (
			<div className="flex min-h-[402px] items-center justify-center md:min-h-[418px]">
				<LocalLoader />
			</div>
		)
	}

	const renderChart = () => {
		switch (chartType) {
			case 'tvl': {
				return (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<AreaChart
							title=""
							chartData={filteredTvlData}
							stacks={TVL_STACKS}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideDownloadButton={true}
							hideDataZoom={true}
							hallmarks={EMPTY_HALLMARKS}
							color={dashboardBlue}
							chartOptions={chartOptions}
							height="360px"
							onReady={handleChartReady}
						/>
					</Suspense>
				)
			}
			case 'chainsTvl':
				return (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<AreaChart
							title=""
							chartData={filteredChartData.chainsSplit ?? EMPTY_CHART_DATA}
							stacks={chainsUnique}
							stackColors={stackColors}
							valueSymbol="$"
							customLegendName="Chain"
							customLegendOptions={chainsUnique}
							hideDownloadButton={true}
							hideDataZoom={true}
							hideGradient={true}
							chartOptions={chartOptions}
							height="360px"
							onReady={handleChartReady}
						/>
					</Suspense>
				)
			case 'tokenValuesUsd':
				return (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<AreaChart
							title=""
							chartData={filteredChartData.tokenBreakdownUSD ?? EMPTY_CHART_DATA}
							stacks={resolvedTokensUnique}
							stackColors={stackColors}
							valueSymbol="$"
							customLegendName="Token"
							customLegendOptions={resolvedTokensUnique}
							hideDownloadButton={true}
							hideDataZoom={true}
							hideGradient={true}
							chartOptions={chartOptions}
							height="360px"
							onReady={handleChartReady}
						/>
					</Suspense>
				)
			case 'tokensPie':
				return (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<PieChart
							chartData={resolvedTokenBreakdownPieChart}
							stackColors={stackColors}
							exportButtons={{ png: true, csv: false, filename: imageFilename, pngTitle: imageTitle }}
							height="360px"
						/>
					</Suspense>
				)
			case 'tokenBalances':
				return (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<AreaChart
							title=""
							chartData={filteredChartData.tokenBreakdown ?? EMPTY_CHART_DATA}
							stacks={resolvedTokensUnique}
							stackColors={stackColors}
							customLegendName="Token"
							customLegendOptions={resolvedTokensUnique}
							hideDownloadButton={true}
							hideDataZoom={true}
							hideGradient={true}
							chartOptions={chartOptions}
							height="360px"
							onReady={handleChartReady}
						/>
					</Suspense>
				)
			case 'usdInflows':
				return (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<BarChart
							chartData={filteredChartData.usdInflows ?? EMPTY_CHART_DATA}
							color={dashboardBlue}
							title=""
							valueSymbol="$"
							hideDownloadButton={true}
							chartOptions={inflowsChartOptions}
							height="360px"
							onReady={handleChartReady}
						/>
					</Suspense>
				)
			case 'tokenInflows':
				return (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<BarChart
							chartData={filteredChartData.tokenInflows ?? EMPTY_CHART_DATA}
							title=""
							valueSymbol="$"
							stackColors={stackColors}
							hideDefaultLegend={true}
							hideDownloadButton={true}
							customLegendName="Token"
							customLegendOptions={resolvedTokensUnique}
							chartOptions={inflowsChartOptions}
							height="360px"
							onReady={handleChartReady}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	const hasChartData =
		(chartType === 'tvl' && filteredTvlData.length > 0) ||
		(chartType === 'chainsTvl' && (filteredChartData.chainsSplit?.length ?? 0) > 0) ||
		(chartType === 'tokenValuesUsd' && (filteredChartData.tokenBreakdownUSD?.length ?? 0) > 0) ||
		(chartType === 'tokensPie' && (tokenBreakdownPieChart?.length ?? 0) > 0) ||
		(chartType === 'tokenBalances' && (filteredChartData.tokenBreakdown?.length ?? 0) > 0) ||
		(chartType === 'usdInflows' && (filteredChartData.usdInflows?.length ?? 0) > 0) ||
		(chartType === 'tokenInflows' && (filteredChartData.tokenInflows?.length ?? 0) > 0)

	return (
		<div className="flex min-h-[402px] flex-col p-2 md:min-h-[418px]">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-semibold pro-text1">{chartTypeLabel}</h3>
					<p className="text-xs pro-text2">{protocolName}</p>
				</div>
				{hasChartData && (
					<div className="flex gap-2">
						{chartType !== 'tokensPie' && (
							<ChartPngExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
						)}
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</div>
				)}
			</div>

			<div className="flex-1">
				<Suspense fallback={<div className="min-h-[360px]" />}>{renderChart()}</Suspense>
			</div>
		</div>
	)
}
