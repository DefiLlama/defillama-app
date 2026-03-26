import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { formatBarChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { getAdapterProtocolOverview } from '~/containers/DimensionAdapters/queries'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { KeyMetrics } from '~/containers/ProtocolOverview/KeyMetrics'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import type { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_TOGGLE_OPTIONS = []

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const getStaticProps = withPerformanceLogging(
	'protocol/dexs/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true }
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

		if (!metadata || !metadata[1].dexs) {
			return { notFound: true }
		}

		const [protocolData, adapterData] = await Promise.all([
			fetchProtocolOverviewMetrics(protocol),
			getAdapterProtocolOverview({
				adapterType: 'dexs',
				protocol: metadata[1].displayName,
				excludeTotalDataChart: false
			})
		])

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })
		const hallmarks: Array<[number, string]> = []
		for (const mark of protocolData.hallmarks ?? []) {
			if (!Array.isArray(mark[0]) && typeof mark[0] === 'number') {
				hallmarks.push([mark[0], mark[1]])
			}
		}

		const seoTitle = `${protocolData.name} DEX Trading Volume & Stats - DefiLlama`
		const seoDescription = `Track ${protocolData.name} decentralized exchange trading volume with daily, weekly, and cumulative charts on DefiLlama.`

		const dexVolume: IProtocolOverviewPageData['dexVolume'] = {
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
					if (protocolMetadata[key].dexs) {
						linkedProtocolsWithAdapterData.push(protocolMetadata[key])
					}
					linkedProtocolsSet.delete(protocolMetadata[key].displayName)
				}
			}
		}

		let chart = (adapterData.totalDataChart ?? []).map(([date, value]) => [+date * 1e3, value] as [number, number])
		const nonZeroIndex = chart.findIndex(([_date, value]) => value > 0)
		if (nonZeroIndex !== -1) {
			chart = chart.slice(nonZeroIndex)
		}
		return {
			props: {
				name: protocolData.name,
				deprecated: protocolData.deprecated ?? false,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				hasKeyMetrics: true,
				openSmolStatsSummaryByDefault: true,
				dexVolume,
				chart,
				protocolChains: adapterData?.chains ?? [],
				protocolVersions: linkedProtocolsWithAdapterData?.map((versionProtocol) => versionProtocol.displayName) ?? [],
				warningBanners: getProtocolWarningBanners(protocolData),
				hallmarks: hallmarks.length > 0 ? hallmarks : null,
				defaultChartView: adapterData?.defaultChartView ?? 'daily',
				seoTitle,
				seoDescription
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths = () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const [groupBy, setGroupBy] = useState<LowercaseDwmcGrouping>(props.defaultChartView)
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const finalCharts = useMemo(() => {
		const formattedData = formatBarChart({
			data: props.chart,
			groupBy,
			denominationPriceHistory: null,
			dateInMs: true
		})
		return {
			dataset: {
				source: formattedData.map(([timestamp, value]) => ({ timestamp, 'DEX Volume': value })),
				dimensions: ['timestamp', 'DEX Volume']
			},
			charts: [
				{
					type: (groupBy === 'cumulative' ? 'line' : 'bar') as 'line' | 'bar',
					name: 'DEX Volume',
					encode: { x: 'timestamp', y: 'DEX Volume' },
					color: CHART_COLORS[0],
					stack: 'DEX Volume'
				}
			]
		}
	}, [props.chart, groupBy])
	const deferredFinalCharts = useDeferredValue(finalCharts)

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="dexs"
			warningBanners={props.warningBanners}
			toggleOptions={EMPTY_TOGGLE_OPTIONS}
			seoTitle={props.seoTitle}
			seoDescription={props.seoDescription}
		>
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				<div className="col-span-1 flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[360px]">
					<h1 className="flex flex-wrap items-center gap-2 text-xl">
						<TokenLogo name={props.name} kind="token" size={24} alt={`Logo of ${props.name}`} />
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
					<div className="flex items-center justify-end gap-2 p-2 pb-0">
						<ChartGroupingSelector value={groupBy} setValue={setGroupBy} options={DWMC_GROUPING_OPTIONS_LOWERCASE} />
						<ChartExportButtons
							chartInstance={chartInstance}
							filename={`${props.name}-dex-volume`}
							title="DEX Volume"
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={deferredFinalCharts.dataset}
							charts={deferredFinalCharts.charts}
							groupBy={groupBy}
							valueSymbol="$"
							hallmarks={props.hallmarks ?? undefined}
							onReady={handleChartReady}
						/>
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{props.protocolChains?.length > 1 ? (
					<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="dexs"
							breakdownNames={props.protocolChains}
							hallmarks={props.hallmarks ?? undefined}
							title="DEX Volume by chain"
						/>
					</div>
				) : null}
				{props.protocolVersions?.length > 1 ? (
					<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="dexs"
							breakdownNames={props.protocolVersions}
							hallmarks={props.hallmarks ?? undefined}
							title="DEX Volume by protocol version"
						/>
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
