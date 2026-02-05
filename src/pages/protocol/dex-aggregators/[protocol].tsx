import { GetStaticPropsContext } from 'next'
import { lazy, Suspense, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { formatBarChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { KeyMetrics } from '~/containers/ProtocolOverview'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_TOGGLE_OPTIONS = []

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const getStaticProps = withPerformanceLogging(
	'protocol/dex-aggregators/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
		}
		const { protocol } = params
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

		if (!metadata || !metadata[1].dexAggregators) {
			return { notFound: true, props: null }
		}

		const [protocolData, adapterData] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				adapterType: 'aggregators',
				protocol: metadata[1].displayName,
				excludeTotalDataChart: false
			})
		])

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const dexAggregatorVolume: IProtocolOverviewPageData['dexAggregatorVolume'] = {
			total24h: adapterData.total24h ?? null,
			total7d: adapterData.total7d ?? null,
			total30d: adapterData.total30d ?? null,
			totalAllTime: adapterData.totalAllTime ?? null
		}

		const linkedProtocolsSet = new Set((adapterData?.linkedProtocols ?? []).slice(1))
		const linkedProtocolsWithAdapterData = []
		if (protocolData.isParentProtocol) {
			for (const key in protocolMetadata) {
				if (linkedProtocolsSet.size === 0) break
				if (linkedProtocolsSet.has(protocolMetadata[key].displayName)) {
					if (protocolMetadata[key].dexAggregators) {
						linkedProtocolsWithAdapterData.push(protocolMetadata[key])
					}
					linkedProtocolsSet.delete(protocolMetadata[key].displayName)
				}
			}
		}

		let chart = (adapterData.totalDataChart ?? []).map(([date, value]) => [+date * 1e3, value])
		const nonZeroIndex = chart.findIndex(([_date, value]) => value > 0)
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
				dexAggregatorVolume,
				chart,
				protocolChains: adapterData?.chains ?? [],
				protocolVersions: linkedProtocolsWithAdapterData?.map((protocol) => protocol.displayName) ?? [],
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
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const { chartInstance: exportChartCsvInstance, handleChartReady: handleChartCsvReady } = useChartCsvExport()

	const finalCharts = useMemo(() => {
		const formattedData = formatBarChart({
			data: props.chart,
			groupBy,
			denominationPriceHistory: null,
			dateInMs: true
		})
		return {
			dataset: {
				source: formattedData.map(([timestamp, value]) => ({ timestamp, 'DEX Aggregator Volume': value })),
				dimensions: ['timestamp', 'DEX Aggregator Volume']
			},
			charts: [
				{
					type: (groupBy === 'cumulative' ? 'line' : 'bar') as 'line' | 'bar',
					name: 'DEX Aggregator Volume',
					encode: { x: 'timestamp', y: 'DEX Aggregator Volume' },
					color: CHART_COLORS[0],
					stack: 'DEX Aggregator Volume'
				}
			]
		}
	}, [props.chart, groupBy])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="dexAggregators"
			warningBanners={props.warningBanners}
			toggleOptions={EMPTY_TOGGLE_OPTIONS}
		>
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				<div className="col-span-1 flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[360px]">
					<h1 className="flex flex-wrap items-center gap-2 text-xl">
						<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
						<span className="font-bold">{props.name}</span>
						{props.deprecated ? (
							<Tooltip content="Deprecated protocol" className="text-(--error)">
								<Icon name="alert-triangle" height={16} width={16} />
							</Tooltip>
						) : null}
					</h1>
					<KeyMetrics {...props} formatPrice={(value) => formattedNum(value, true)} />
				</div>
				<div className="col-span-1 rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-[2/-1]">
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
									key={`${props.name}-dex-aggregators-groupBy-${dataInterval}`}
								>
									{dataInterval.slice(0, 1).toUpperCase()}
								</Tooltip>
							))}
						</div>
						<ChartCsvExportButton
							chartInstance={exportChartCsvInstance}
							filename={`${slug(props.name)}-dex-aggregator-volume`}
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
						<ChartExportButton
							chartInstance={exportChartInstance}
							filename={`${slug(props.name)}-dex-aggregator-volume`}
							title="DEX Aggregator Volume"
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={finalCharts.dataset}
							charts={finalCharts.charts}
							valueSymbol="$"
							onReady={(instance) => {
								handleChartReady(instance)
								handleChartCsvReady(instance)
							}}
						/>
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{props.protocolChains?.length > 1 ? (
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="aggregators"
							breakdownNames={props.protocolChains}
							title="DEX Aggregator Volume by chain"
						/>
					</div>
				) : null}
				{props.protocolVersions?.length > 1 ? (
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="aggregators"
							breakdownNames={props.protocolVersions}
							title="DEX Aggregator Volume by protocol version"
						/>
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
