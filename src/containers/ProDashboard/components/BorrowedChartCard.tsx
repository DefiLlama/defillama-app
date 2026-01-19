import * as echarts from 'echarts/core'
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { formatTvlsByChain, useFetchProtocolAddlChartsData } from '~/containers/ProtocolOverview/utils'
import { download, toNiceCsvDate } from '~/utils'
import { BORROWED_CHART_OPTIONS, BORROWED_CHART_TYPE_LABELS } from '../borrowedChartConstants'
import { useProDashboardTime } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { BorrowedChartConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const EMPTY_CHART_DATA: any[] = []
const EMPTY_STACKS: string[] = []
const EMPTY_ADDL_DATA: {
	tokensUnique?: string[]
	tokenBreakdownUSD?: any[]
	tokenBreakdownPieChart?: any[]
	tokenBreakdown?: any[]
} = {}

interface BorrowedChartCardProps {
	config: BorrowedChartConfig
}

export function BorrowedChartCard({ config }: BorrowedChartCardProps) {
	const { protocol, protocolName, chartType } = config
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)

	const { data: addlData, historicalChainTvls, isLoading } = useFetchProtocolAddlChartsData(protocolName, true)

	const { chainsSplit, chainsUnique } = useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled: {} })
		const lastEntry = chainsSplit[chainsSplit.length - 1] ?? {}
		const chainsUnique: string[] = []
		for (const key in lastEntry) {
			if (key !== 'date') chainsUnique.push(key)
		}
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls])

	const { tokensUnique, tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown } = addlData ?? EMPTY_ADDL_DATA
	const resolvedTokensUnique = tokensUnique ?? EMPTY_STACKS
	const resolvedTokenBreakdownUSD = tokenBreakdownUSD ?? EMPTY_CHART_DATA
	const resolvedTokenBreakdownPieChart = tokenBreakdownPieChart ?? EMPTY_CHART_DATA
	const resolvedTokenBreakdown = tokenBreakdown ?? EMPTY_CHART_DATA
	const resolvedChainsSplit = chainsSplit ?? EMPTY_CHART_DATA

	const filteredChartData = useMemo(() => {
		if (!timePeriod || timePeriod === 'all') {
			return {
				chainsSplit,
				tokenBreakdownUSD,
				tokenBreakdown
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
			chainsSplit: filterTimeSeries(resolvedChainsSplit),
			tokenBreakdownUSD: filterTimeSeries(resolvedTokenBreakdownUSD),
			tokenBreakdown: filterTimeSeries(resolvedTokenBreakdown)
		}
	}, [resolvedChainsSplit, resolvedTokenBreakdownUSD, resolvedTokenBreakdown, timePeriod, customTimePeriod])

	const handleCsvExport = useCallback(() => {
		let rows: (string | number)[][] = []
		let filename = ''
		const protocolSlug = protocol.toLowerCase().replace(/\s+/g, '-')

		switch (chartType) {
			case 'chainsBorrowed':
				rows = [
					['Date', ...chainsUnique],
					...(filteredChartData.chainsSplit?.map((el: any) => [
						toNiceCsvDate(el.date),
						...chainsUnique.map((c) => el[c] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-borrowed-by-chain.csv`
				break
			case 'tokenBorrowedUsd':
				rows = [
					['Date', ...resolvedTokensUnique],
					...(filteredChartData.tokenBreakdownUSD?.map((el: any) => [
						toNiceCsvDate(el.date),
						...resolvedTokensUnique.map((t) => el[t] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-borrowed-by-token-usd.csv`
				break
			case 'tokensBorrowedPie':
				rows = [['Token', 'Value'], ...(resolvedTokenBreakdownPieChart.map((el: any) => [el.name, el.value]) ?? [])]
				filename = `${protocolSlug}-borrowed-tokens-breakdown.csv`
				break
			case 'tokenBorrowedRaw':
				rows = [
					['Date', ...resolvedTokensUnique],
					...(filteredChartData.tokenBreakdown?.map((el: any) => [
						toNiceCsvDate(el.date),
						...resolvedTokensUnique.map((t) => el[t] ?? '')
					]) ?? [])
				]
				filename = `${protocolSlug}-borrowed-by-token-raw.csv`
				break
		}

		if (rows.length > 0) {
			const csvContent = rows.map((row) => row.join(',')).join('\n')
			download(filename, csvContent)
		}
	}, [filteredChartData, resolvedTokenBreakdownPieChart, chainsUnique, resolvedTokensUnique, protocol, chartType])

	const chartTypeLabel = BORROWED_CHART_TYPE_LABELS[chartType] || chartType
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
			case 'chainsBorrowed':
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
							chartData={filteredChartData.chainsSplit ?? EMPTY_CHART_DATA}
							stacks={chainsUnique}
							valueSymbol="$"
							customLegendName="Chain"
							customLegendOptions={chainsUnique}
							hideDownloadButton={true}
							hideGradient={true}
							chartOptions={BORROWED_CHART_OPTIONS}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'tokenBorrowedUsd':
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
							chartData={filteredChartData.tokenBreakdownUSD ?? EMPTY_CHART_DATA}
							stacks={resolvedTokensUnique}
							valueSymbol="$"
							customLegendName="Token"
							customLegendOptions={resolvedTokensUnique}
							hideDownloadButton={true}
							hideGradient={true}
							chartOptions={BORROWED_CHART_OPTIONS}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			case 'tokensBorrowedPie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart
							chartData={resolvedTokenBreakdownPieChart}
							enableImageExport
							imageExportFilename={imageFilename}
							imageExportTitle={imageTitle}
						/>
					</Suspense>
				)
			case 'tokenBorrowedRaw':
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
							chartData={filteredChartData.tokenBreakdown ?? EMPTY_CHART_DATA}
							stacks={resolvedTokensUnique}
							customLegendName="Token"
							customLegendOptions={resolvedTokensUnique}
							hideDownloadButton={true}
							hideGradient={true}
							chartOptions={BORROWED_CHART_OPTIONS}
							onReady={setChartInstance}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	const hasChartData =
		(chartType === 'chainsBorrowed' && (filteredChartData.chainsSplit?.length ?? 0) > 0) ||
		(chartType === 'tokenBorrowedUsd' && (filteredChartData.tokenBreakdownUSD?.length ?? 0) > 0) ||
		(chartType === 'tokensBorrowedPie' && (tokenBreakdownPieChart?.length ?? 0) > 0) ||
		(chartType === 'tokenBorrowedRaw' && (filteredChartData.tokenBreakdown?.length ?? 0) > 0)

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="pro-text1 text-sm font-semibold">{chartTypeLabel}</h3>
					<p className="pro-text2 text-xs">{protocolName}</p>
				</div>
				{hasChartData && (
					<div className="flex gap-2">
						{chartType !== 'tokensBorrowedPie' && (
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
