import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as echarts from 'echarts/core'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { oldBlue } from '~/constants/colors'
import { formatTvlsByChain, useFetchProtocolAddlChartsData } from '~/containers/ProtocolOverview/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { download, toNiceCsvDate } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import ProtocolCharts from '../services/ProtocolCharts'
import type { AdvancedTvlChartConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
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

const TVL_STACKS = ['TVL']
const EMPTY_HALLMARKS: [number, string][] = []

export function AdvancedTvlChartCard({ config }: AdvancedTvlChartCardProps) {
	const { protocol, protocolName, chartType } = config
	const { timePeriod, customTimePeriod } = useProDashboard()
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const { data: basicTvlData, isLoading: isBasicTvlLoading } = useQuery({
		queryKey: ['advanced-tvl-basic', protocol],
		queryFn: () => ProtocolCharts.tvl(protocol),
		enabled: chartType === 'tvl',
		staleTime: 60 * 60 * 1000
	})

	const { data: addlData, historicalChainTvls, isLoading: isAddlLoading } = useFetchProtocolAddlChartsData(protocolName)

	const isLoading = chartType === 'tvl' ? isBasicTvlLoading : isAddlLoading

	const { chainsSplit, chainsUnique } = useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled })
		const chainsUnique = Object.keys(chainsSplit[chainsSplit.length - 1] ?? {}).filter((c) => c !== 'date')
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls, extraTvlsEnabled])

	const { tokensUnique, tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown, usdInflows, tokenInflows } =
		addlData ?? {}

	const filteredChartData = useMemo(() => {
		if (!timePeriod || timePeriod === 'all') {
			return {
				basicTvl: basicTvlData,
				chainsSplit,
				tokenBreakdownUSD,
				tokenBreakdown,
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

		const filterTupleArray = (data: [number, number][] | undefined) => {
			if (!data) return data
			return filterDataByTimePeriod(data, timePeriod, customTimePeriod)
		}

		const filterStringDateTuples = (data: [string, number][] | undefined) => {
			if (!data || data.length === 0) return data
			const asNumbers: [number, number][] = data.map(([d, v]) => [Number(d), v])
			const filtered = filterDataByTimePeriod(asNumbers, timePeriod, customTimePeriod)
			return filtered.map(([d, v]): [string, number] => [String(d), v])
		}

		return {
			basicTvl: filterTupleArray(basicTvlData),
			chainsSplit: filterTimeSeries(chainsSplit ?? []),
			tokenBreakdownUSD: filterTimeSeries(tokenBreakdownUSD ?? []),
			tokenBreakdown: filterTimeSeries(tokenBreakdown ?? []),
			usdInflows: filterStringDateTuples(usdInflows as [string, number][] | undefined),
			tokenInflows: filterTimeSeries(tokenInflows ?? [])
		}
	}, [basicTvlData, chainsSplit, tokenBreakdownUSD, tokenBreakdown, usdInflows, tokenInflows, timePeriod, customTimePeriod])

	const handleCsvExport = useCallback(() => {
		let rows: (string | number)[][] = []
		let filename = ''
		const protocolSlug = protocol.toLowerCase().replace(/\s+/g, '-')

		switch (chartType) {
			case 'tvl':
				rows = [['Date', 'TVL'], ...(filteredChartData.basicTvl?.map(([ts, val]) => [toNiceCsvDate(ts), val]) ?? [])]
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
					['Date', ...(tokensUnique ?? [])],
					...(filteredChartData.tokenBreakdownUSD?.map((el: any) => [
						toNiceCsvDate(el.date),
						...(tokensUnique ?? []).map((t) => el[t] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-token-values-usd.csv`
				break
			case 'tokensPie':
				rows = [['Token', 'Value'], ...(tokenBreakdownPieChart?.map((el: any) => [el.name, el.value]) ?? [])]
				filename = `${protocolSlug}-tokens-breakdown.csv`
				break
			case 'tokenBalances':
				rows = [
					['Date', ...(tokensUnique ?? [])],
					...(filteredChartData.tokenBreakdown?.map((el: any) => [
						toNiceCsvDate(el.date),
						...(tokensUnique ?? []).map((t) => el[t] ?? '')
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
					['Date', ...(tokensUnique ?? [])],
					...(filteredChartData.tokenInflows?.map((el: any) => [
						toNiceCsvDate(el.date),
						...(tokensUnique ?? []).map((t) => el[t] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-token-inflows.csv`
				break
		}

		if (rows.length > 0) {
			const csvContent = rows.map((row) => row.join(',')).join('\n')
			download(filename, csvContent)
		}
	}, [filteredChartData, tokenBreakdownPieChart, chainsUnique, tokensUnique, protocol, chartType])

	const chartTypeLabel = CHART_TYPE_LABELS[chartType] || chartType
	const imageTitle = `${protocolName} - ${chartTypeLabel}`
	const imageFilename = `${protocol.toLowerCase().replace(/\s+/g, '-')}-${chartType}`

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	const renderChart = () => {
		switch (chartType) {
			case 'tvl': {
				const tvlData = filteredChartData.basicTvl?.map(([ts, val]) => ({ date: ts, TVL: val })) ?? []
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
							chartData={tvlData}
							stacks={TVL_STACKS}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideDownloadButton={true}
							hallmarks={EMPTY_HALLMARKS}
							color={oldBlue}
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			}
			case 'chainsTvl':
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
							chartData={filteredChartData.chainsSplit ?? []}
							stacks={chainsUnique}
							valueSymbol="$"
							customLegendName="Chain"
							customLegendOptions={chainsUnique}
							hideDownloadButton={true}
							hideGradient={true}
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'tokenValuesUsd':
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
							chartData={filteredChartData.tokenBreakdownUSD ?? []}
							stacks={tokensUnique ?? []}
							valueSymbol="$"
							customLegendName="Token"
							customLegendOptions={tokensUnique ?? []}
							hideDownloadButton={true}
							hideGradient={true}
							chartOptions={chartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'tokensPie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart
							chartData={tokenBreakdownPieChart ?? []}
							enableImageExport
							imageExportFilename={imageFilename}
							imageExportTitle={imageTitle}
						/>
					</Suspense>
				)
			case 'tokenBalances':
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
							chartData={filteredChartData.tokenBreakdown ?? []}
							stacks={tokensUnique ?? []}
							customLegendName="Token"
							customLegendOptions={tokensUnique ?? []}
							hideDownloadButton={true}
							hideGradient={true}
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
							chartData={filteredChartData.usdInflows ?? []}
							color={oldBlue}
							title=""
							valueSymbol="$"
							hideDownloadButton={true}
							chartOptions={inflowsChartOptions}
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
							chartData={filteredChartData.tokenInflows ?? []}
							title=""
							valueSymbol="$"
							hideDefaultLegend={true}
							hideDownloadButton={true}
							customLegendName="Token"
							customLegendOptions={tokensUnique ?? []}
							chartOptions={inflowsChartOptions}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	const hasChartData =
		(chartType === 'tvl' && (filteredChartData.basicTvl?.length ?? 0) > 0) ||
		(chartType === 'chainsTvl' && (filteredChartData.chainsSplit?.length ?? 0) > 0) ||
		(chartType === 'tokenValuesUsd' && (filteredChartData.tokenBreakdownUSD?.length ?? 0) > 0) ||
		(chartType === 'tokensPie' && (tokenBreakdownPieChart?.length ?? 0) > 0) ||
		(chartType === 'tokenBalances' && (filteredChartData.tokenBreakdown?.length ?? 0) > 0) ||
		(chartType === 'usdInflows' && (filteredChartData.usdInflows?.length ?? 0) > 0) ||
		(chartType === 'tokenInflows' && (filteredChartData.tokenInflows?.length ?? 0) > 0)

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="pro-text1 text-sm font-semibold">{chartTypeLabel}</h3>
					<p className="pro-text2 text-xs">{protocolName}</p>
				</div>
				{hasChartData && (
					<div className="flex gap-2">
						{chartType !== 'tokensPie' && (
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
