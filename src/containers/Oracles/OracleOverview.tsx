import { useQueries } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { lazy, Suspense, useMemo } from 'react'
import { LoadingDots } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { CHART_COLORS } from '~/constants/colors'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, getTokenDominance } from '~/utils'
import { fetchOracleProtocolChainBreakdownChart, fetchOracleProtocolChart } from './api'
import type { OraclePageData, OracleProtocolWithBreakdown } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

interface IProtocolDominanceData {
	name: string
	tvs: number
}

function getProtocolTvs({
	protocol,
	extraTvlsEnabled
}: {
	protocol: OracleProtocolWithBreakdown
	extraTvlsEnabled: Record<string, boolean>
}): number {
	let tvs = protocol.tvl

	for (const [extraName, values] of Object.entries(protocol.extraTvl ?? {})) {
		const normalizedName = extraName.toLowerCase()
		if (extraTvlsEnabled[normalizedName] && normalizedName !== 'doublecounted' && normalizedName !== 'liquidstaking') {
			tvs += values.tvl
		}
	}

	return tvs
}

type IOracleOverviewProps = Pick<
	OraclePageData,
	'chartData' | 'oracleLinks' | 'oracle' | 'filteredProtocols' | 'chain' | 'chainChartData'
>

export const OracleOverview = ({
	chartData,
	oracleLinks,
	oracle,
	filteredProtocols,
	chain = null,
	chainChartData = null
}: IOracleOverviewProps) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const enabledExtraApiKeys = useMemo(() => {
		const apiKeys: Array<string> = []
		for (const [key, isEnabled] of Object.entries(extraTvlsEnabled)) {
			if (!isEnabled || key.toLowerCase() === 'tvl') continue
			apiKeys.push(key)
		}
		return apiKeys.toSorted((a, b) => a.localeCompare(b))
	}, [extraTvlsEnabled])

	const extraChartQueries = useQueries({
		queries: enabledExtraApiKeys.map((key) => ({
			queryKey: ['oracle', 'overview', 'chart', oracle ?? 'unknown', chain ?? 'all', key],
			queryFn: async () => {
				if (!oracle) return null
				if (chain) {
					const chainBreakdown = await fetchOracleProtocolChainBreakdownChart({
						protocol: oracle,
						key
					})
					const series: Array<[number, number]> = []
					for (const row of chainBreakdown) {
						const value = row[chain]
						if (!Number.isFinite(row.timestamp) || !Number.isFinite(value)) continue
						series.push([row.timestamp, value])
					}
					return series
				}
				return fetchOracleProtocolChart({
					protocol: oracle,
					key
				})
			},
			enabled: Boolean(oracle),
			staleTime: 5 * 60 * 1_000,
			refetchOnWindowFocus: false
		}))
	}) as Array<UseQueryResult<Array<[number, number]> | null>>

	const isFetchingExtraSeries = extraChartQueries.some((query) => query.isLoading || query.isFetching)

	const { protocolsData, dataset, charts, totalValue } = useMemo(() => {
		const protocolsData: Array<IProtocolDominanceData> = []
		for (const protocol of filteredProtocols) {
			protocolsData.push({
				name: protocol.name,
				tvs: isFetchingExtraSeries ? protocol.tvl : getProtocolTvs({ protocol, extraTvlsEnabled })
			})
		}
		protocolsData.sort((a, b) => b.tvs - a.tvs)

		const chartBreakdownByTimestamp = chainChartData ?? chartData
		const selectedOracle =
			oracle ?? Object.keys(chartBreakdownByTimestamp[0] ?? {}).find((key) => key !== 'timestamp') ?? ''
		const shouldApplyExtraSeries = enabledExtraApiKeys.length > 0 && !isFetchingExtraSeries
		const extraTvsByTimestamp = new Map<number, number>()

		if (shouldApplyExtraSeries) {
			for (const query of extraChartQueries) {
				if (!query.data) continue

				for (const [timestampInSeconds, value] of query.data) {
					if (!Number.isFinite(timestampInSeconds) || !Number.isFinite(value)) continue
					const current = extraTvsByTimestamp.get(timestampInSeconds) ?? 0
					extraTvsByTimestamp.set(timestampInSeconds, current + value)
				}
			}
		}

		const datasetSource: Array<{ timestamp: number; TVS: number }> = []

		for (const point of chartBreakdownByTimestamp) {
			const timestampInSeconds = point.timestamp
			if (!Number.isFinite(timestampInSeconds)) {
				continue
			}

			const baseTvs = selectedOracle ? (point[selectedOracle] ?? 0) : 0
			const extraTvs = shouldApplyExtraSeries ? (extraTvsByTimestamp.get(timestampInSeconds) ?? 0) : 0
			const tvsValue = baseTvs + extraTvs

			if (!Number.isFinite(tvsValue)) continue

			datasetSource.push({
				timestamp: timestampInSeconds * 1e3,
				TVS: tvsValue
			})
		}
		const totalValue = datasetSource[datasetSource.length - 1]?.TVS ?? 0

		return {
			protocolsData,
			dataset: {
				source: datasetSource,
				dimensions: ['timestamp', 'TVS']
			},
			charts: [
				{
					type: 'line' as const,
					name: 'TVS',
					encode: { x: 'timestamp', y: 'TVS' },
					color: CHART_COLORS[0],
					stack: 'TVS'
				}
			],
			totalValue
		}
	}, [
		chainChartData,
		chartData,
		enabledExtraApiKeys.length,
		extraChartQueries,
		extraTvlsEnabled,
		filteredProtocols,
		isFetchingExtraSeries,
		oracle
	])

	const topProtocol = protocolsData[0] ?? null
	const dominance = topProtocol ? getTokenDominance({ tvl: topProtocol.tvs }, totalValue) : null
	const dominanceText = dominance == null ? null : String(dominance)
	const displayOracle = oracle ?? 'Oracle'
	const dominanceLabel = topProtocol ? `${topProtocol.name} Dominance` : 'Top Protocol Dominance'

	return (
		<>
			<RowLinksWithDropdown links={oracleLinks} activeLink={chain ?? 'All'} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">{displayOracle}</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Secured (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">{dominanceLabel}</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{dominanceText === null ? 'N/A' : `${dominanceText}%`}
						</span>
					</p>
				</div>

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					{isFetchingExtraSeries ? (
						<p className="my-auto flex min-h-[398px] items-center justify-center gap-1 text-center text-xs">
							Loading
							<LoadingDots />
						</p>
					) : (
						<Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={dataset}
								charts={charts}
								alwaysShowTooltip
								exportButtons={{ png: true, csv: true }}
							/>
						</Suspense>
					)}
				</div>
			</div>
		</>
	)
}
