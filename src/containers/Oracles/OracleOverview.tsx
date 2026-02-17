import { lazy, Suspense, useMemo } from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { CHART_COLORS } from '~/constants/colors'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, getTokenDominance } from '~/utils'
import { calculateTvsWithExtraToggles, hasExtraTvlsToggled } from './tvl'
import type { OraclePageData, OracleProtocolWithBreakdown, OracleSingleChartData } from './types'

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
	const { protocolsData, dataset, charts, totalValue } = useMemo(() => {
		const protocolsData: Array<IProtocolDominanceData> = []
		for (const protocol of filteredProtocols) {
			protocolsData.push({
				name: protocol.name,
				tvs: getProtocolTvs({ protocol, extraTvlsEnabled })
			})
		}
		protocolsData.sort((a, b) => b.tvs - a.tvs)

		const chartBreakdownByTimestamp: OracleSingleChartData = chainChartData
			? chainChartData
			: chartData.map(([timestampInSeconds, values]) => {
					const selectedOracle = oracle ?? Object.keys(values)[0] ?? ''
					return [timestampInSeconds, values[selectedOracle] ?? { tvl: 0 }]
				})

		const shouldApplyExtraTvlFormatting = hasExtraTvlsToggled(extraTvlsEnabled)
		const datasetSource: Array<{ timestamp: number; TVS: number }> = []

		for (const [timestampInSeconds, values] of chartBreakdownByTimestamp) {
			if (!Number.isFinite(timestampInSeconds)) {
				continue
			}

			const tvsValue = shouldApplyExtraTvlFormatting
				? calculateTvsWithExtraToggles({ values, extraTvlsEnabled })
				: (values.tvl ?? 0)

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
	}, [chainChartData, chartData, extraTvlsEnabled, filteredProtocols, oracle])

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
					<Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={dataset}
							charts={charts}
							alwaysShowTooltip
							exportButtons={{ png: true, csv: true }}
						/>
					</Suspense>
				</div>
			</div>
		</>
	)
}
