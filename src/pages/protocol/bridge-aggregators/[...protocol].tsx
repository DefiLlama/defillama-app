import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata, IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { lazy, Suspense, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { downloadChart, formatBarChart } from '~/components/ECharts/utils'
import { Tooltip } from '~/components/Tooltip'
import { KeyMetrics } from '~/containers/ProtocolOverview'
import { TokenLogo } from '~/components/TokenLogo'
import { oldBlue } from '~/constants/colors'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart'))

export const getStaticProps = withPerformanceLogging(
	'protocol/bridge-aggregators/[...protocol]',
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

		if (!metadata || !metadata[1].bridgeAggregators) {
			return { notFound: true, props: null }
		}

		const [protocolData, adapterData] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				adapterType: 'bridge-aggregators',
				protocol: metadata[1].displayName,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			})
		])

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const bridgeAggregatorVolume: IProtocolOverviewPageData['bridgeAggregatorVolume'] = {
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
					if (protocolMetadata[key].bridgeAggregators) {
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
				bridgeAggregatorVolume,
				chart,
				hasMultipleChain: adapterData?.chains?.length > 1 ? true : false,
				hasMultipleVersions: linkedProtocolsWithAdapterData.length > 1 ? true : false,
				warningBanners: getProtocolWarningBanners(protocolData)
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
	const [groupBy, setGroupBy] = useState<typeof INTERVALS_LIST[number]>('daily')
	const finalCharts = useMemo(() => {
		return {
			'Bridge Aggregator Volume': {
				name: 'Bridge Aggregator Volume',
				stack: 'Bridge Aggregator Volume',
				type: (groupBy === 'cumulative' ? 'line' : 'bar') as 'line' | 'bar',
				data: formatBarChart({
					data: props.chart,
					groupBy,
					denominationPriceHistory: null,
					dateInMs: true
				}),
				color: oldBlue
			}
		}
	}, [props.chart, groupBy])
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="bridge-aggregators"
			warningBanners={props.warningBanners}
			toggleOptions={[]}
		>
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
				<div className="col-span-1 flex flex-col gap-6 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2 xl:min-h-[360px]">
					<h1 className="flex items-center flex-wrap gap-2 text-xl">
						<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
						<span className="font-bold">
							{props.name ? props.name + `${props.deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}
						</span>
					</h1>
					<KeyMetrics {...props} formatPrice={(value) => formattedNum(value, true)} />
				</div>
				<div className="col-span-1 xl:col-[2/-1] bg-(--cards-bg) border border-(--cards-border) rounded-md xl:min-h-[360px]">
					<div className="flex items-center justify-end gap-2 p-2">
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-[#666] dark:text-[#919296]">
							{INTERVALS_LIST.map((dataInterval) => (
								<Tooltip
									content={capitalizeFirstLetter(dataInterval)}
									render={<button />}
									className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
									data-active={groupBy === dataInterval}
									onClick={() => {
										setGroupBy(dataInterval)
									}}
								>
									{dataInterval.slice(0, 1).toUpperCase()}
								</Tooltip>
							))}
						</div>
						<CSVDownloadButton
							onClick={() => {
								try {
									const dataByChartType = {}
									for (const chartType in finalCharts) {
										dataByChartType[chartType] = finalCharts[chartType].data
									}
									downloadChart(dataByChartType, `${props.name}-total-bridge-aggregator-volume.csv`)
								} catch (error) {
									console.error('Error generating CSV:', error)
								}
							}}
							smol
							className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<LineAndBarChart charts={finalCharts} valueSymbol="$" />
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{props.hasMultipleChain ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full bg-(--cards-bg) border border-(--cards-border) rounded-md min-h-[418px]">
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="bridge-aggregators"
							title="Bridge Aggregator Volume by chain"
						/>
					</div>
				) : null}
				{props.hasMultipleVersions ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full bg-(--cards-bg) border border-(--cards-border) rounded-md min-h-[418px]">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="bridge-aggregators"
							title="Bridge Aggregator Volume by protocol version"
						/>
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
