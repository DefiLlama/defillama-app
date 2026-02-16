import { lazy, Suspense, useMemo } from 'react'
import { tvlOptions } from '~/components/Filters/options'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { CHART_COLORS } from '~/constants/colors'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'
import type { IProtocol } from '~/containers/ChainOverview/types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatChartTvlsByDay } from '~/hooks/data'
import Layout from '~/layout'
import { formattedNum, getTokenDominance, slug } from '~/utils'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const pageName = ['Protocols TVS', 'by', 'Oracle']

interface IOracleProtocolData {
	name: string
	tvl: number
	extraTvl?: Record<string, { tvl: number }>
}

interface IProtocolDominanceData {
	name: string
	tvs: number
}

function getProtocolTvs({
	protocol,
	extraTvlsEnabled
}: {
	protocol: IOracleProtocolData
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

interface IOracleOverviewProps {
	chartData: Array<[number, Record<string, { tvl: number }>]>
	tokenLinks: Array<{ label: string; to: string }>
	token: string | null
	filteredProtocols: Array<IOracleProtocolData>
	protocolsTableData: Array<IProtocol>
	chain?: string | null
	chainChartData?: Array<[number, Record<string, number>]> | null
}

export const OracleOverview = ({
	chartData,
	tokenLinks,
	token,
	filteredProtocols,
	protocolsTableData,
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

		const finalChartData = chainChartData
			? formatChartTvlsByDay({ data: chainChartData, extraTvlsEnabled, key: 'TVS' })
			: (() => {
					const points: Array<[number, number]> = []
					for (const [timestampInSeconds, values] of chartData) {
						let value = 0
						for (const oracleName in values) {
							value += values[oracleName]?.tvl ?? 0
						}
						points.push([timestampInSeconds * 1e3, value])
					}
					return points
				})()

		const totalValue = finalChartData[finalChartData.length - 1]?.[1] ?? 0
		const datasetSource: Array<{ timestamp: number; TVS: number }> = []
		for (const point of finalChartData) {
			const timestamp = point[0]
			const value = point[1]
			if (typeof timestamp !== 'number' || typeof value !== 'number') {
				continue
			}
			datasetSource.push({ timestamp, TVS: value })
		}

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
	}, [chainChartData, chartData, extraTvlsEnabled, filteredProtocols])

	const topProtocol = protocolsData[0]
	const topProtocolDominanceData = topProtocol ? { tvl: topProtocol.tvs } : {}
	const dominance = getTokenDominance(topProtocolDominanceData, totalValue)
	const dominanceText = dominance ?? 0
	const displayToken = token ?? 'Oracle'
	const dominanceLabel = topProtocol ? `${topProtocol.name} Dominance` : 'Top Protocol Dominance'
	const canonicalUrl = token ? `/oracles/${slug(token)}${chain ? `/${slug(chain)}` : ''}` : '/oracles'

	return (
		<Layout
			title={`Oracles - DefiLlama`}
			description={`Total Value Secured by Oracles. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`blockchain oracles , total value secured by oracles, defi total value secured by oracles`}
			canonicalUrl={canonicalUrl}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={tokenLinks} activeLink={chain ?? 'All'} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">{displayToken}</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Secured (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">{dominanceLabel}</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominanceText}%</span>
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

			<ChainProtocolsTable protocols={protocolsTableData} />
		</Layout>
	)
}
