import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { formatBarChart, prepareChartCsv } from '~/components/ECharts/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { KeyMetrics } from '~/containers/ProtocolOverview'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata, IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart'))

export const getStaticProps = withPerformanceLogging(
	'protocol/perps-aggregators/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].perpsAggregators) {
			return { notFound: true, props: null }
		}

		const [protocolData, adapterData] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				adapterType: 'aggregator-derivatives',
				protocol: metadata[1].displayName,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			})
		])

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const perpAggregatorVolume: IProtocolOverviewPageData['perpAggregatorVolume'] = {
			total24h: adapterData.total24h ?? null,
			total7d: adapterData.total7d ?? null,
			total30d: adapterData.total30d ?? null,
			totalAllTime: adapterData.totalAllTime ?? null
		}

		const linkedProtocols = (adapterData?.linkedProtocols ?? []).slice(1)
		const linkedProtocolsWithAdapterData = []
		if (protocolData.isParentProtocol) {
			for (const key in protocolMetadata) {
				if (linkedProtocols.length === 0) break
				if (linkedProtocols.includes(protocolMetadata[key].displayName)) {
					if (protocolMetadata[key].perpsAggregators) {
						linkedProtocolsWithAdapterData.push(protocolMetadata[key])
					}
					linkedProtocols.splice(linkedProtocols.indexOf(protocolMetadata[key].displayName), 1)
				}
			}
		}

		let chart = (adapterData.totalDataChart ?? []).map(([date, value]) => [+date * 1e3, value])
		const nonZeroIndex = chart.findIndex(([date, value]) => value > 0)
		if (nonZeroIndex !== -1) {
			chart = chart.slice(nonZeroIndex)
		}

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				hasKeyMetrics: true,
				openSmolStatsSummaryByDefault: true,
				perpAggregatorVolume,
				chart,
				hasMultipleChain: adapterData?.chains?.length > 1 ? true : false,
				hasMultipleVersions: linkedProtocolsWithAdapterData.length > 1 ? true : false,
				warningBanners: getProtocolWarningBanners(protocolData),
				defaultChartView: adapterData?.defaultChartView ?? 'daily'
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const

export default function Protocols(props) {
	const [groupBy, setGroupBy] = useState<(typeof INTERVALS_LIST)[number]>(props.defaultChartView)
	const finalCharts = useMemo(() => {
		return {
			'Perp Aggregator Volume': {
				name: 'Perp Aggregator Volume',
				stack: 'Perp Aggregator Volume',
				type: (groupBy === 'cumulative' ? 'line' : 'bar') as 'line' | 'bar',
				data: formatBarChart({
					data: props.chart,
					groupBy,
					denominationPriceHistory: null,
					dateInMs: true
				}),
				color: CHART_COLORS[0]
			}
		}
	}, [props.chart, groupBy])

	const prepareCsv = useCallback(() => {
		const dataByChartType = {}
		for (const chartType in finalCharts) {
			dataByChartType[chartType] = finalCharts[chartType].data
		}
		return prepareChartCsv(dataByChartType, `${props.name}-total-perp-aggregator-volume.csv`)
	}, [finalCharts, props.name])
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="perps-aggregators"
			warningBanners={props.warningBanners}
			toggleOptions={[]}
		>
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				<div className="col-span-1 flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[360px]">
					<h1 className="flex flex-wrap items-center gap-2 text-xl">
						<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
						<span className="font-bold">
							{props.name ? props.name + `${props.deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}
						</span>
					</h1>
					<KeyMetrics {...props} formatPrice={(value) => formattedNum(value, true)} />
				</div>
				<div className="col-span-1 rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-[2/-1] xl:min-h-[360px]">
					<div className="flex items-center justify-end gap-2 p-2">
						<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
							{INTERVALS_LIST.map((dataInterval) => (
								<Tooltip
									content={capitalizeFirstLetter(dataInterval)}
									render={<button />}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
									data-active={groupBy === dataInterval}
									onClick={() => {
										setGroupBy(dataInterval)
									}}
									key={`${props.name}-perps-aggregators-groupBy-${dataInterval}`}
								>
									{dataInterval.slice(0, 1).toUpperCase()}
								</Tooltip>
							))}
						</div>
						<CSVDownloadButton prepareCsv={prepareCsv} smol />
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<LineAndBarChart charts={finalCharts} valueSymbol="$" />
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{props.hasMultipleChain ? (
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="aggregator-derivatives"
							title="Perp Aggregator Volume by chain"
						/>
					</div>
				) : null}
				{props.hasMultipleVersions ? (
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="aggregator-derivatives"
							title="Perp Aggregator Volume by protocol version"
						/>
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
