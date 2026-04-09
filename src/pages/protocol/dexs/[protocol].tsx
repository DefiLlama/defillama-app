import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { ensureChronologicalRows, formatBarChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select/Select'
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
import { buildHallmarksWithGenuineSpikes } from '~/utils/hallmarks'
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

		if (!metadata || (!metadata[1].dexs && !metadata[1].dexsNotionalVolume)) {
			return { notFound: true }
		}

		const [protocolData, volumeData, notionalVolumeData] = await Promise.all([
			fetchProtocolOverviewMetrics(protocol),
			metadata[1].dexs
				? getAdapterProtocolOverview({
						adapterType: 'dexs',
						protocol: metadata[1].displayName,
						excludeTotalDataChart: false
					}).catch(() => null)
				: null,
			metadata[1].dexsNotionalVolume
				? getAdapterProtocolOverview({
						adapterType: 'dexs',
						protocol: metadata[1].displayName,
						excludeTotalDataChart: false,
						dataType: 'dailyNotionalVolume'
					}).catch(() => null)
				: null
		])

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })
		const hallmarks = buildHallmarksWithGenuineSpikes({
			dimensions: protocolData.dimensions
		})

		const seoTitle = `${protocolData.name} DEX Trading Volume & Stats - DefiLlama`
		const seoDescription = `Track ${protocolData.name} decentralized exchange trading volume with daily, weekly, and cumulative charts on DefiLlama.`

		const dexVolume: IProtocolOverviewPageData['dexVolume'] = {
			total24h: volumeData?.total24h ?? null,
			total7d: volumeData?.total7d ?? null,
			total30d: volumeData?.total30d ?? null,
			totalAllTime: volumeData?.totalAllTime ?? null
		}

		const dexNotionalVolume: IProtocolOverviewPageData['dexNotionalVolume'] = {
			total24h: notionalVolumeData?.total24h ?? null,
			total7d: notionalVolumeData?.total7d ?? null,
			total30d: notionalVolumeData?.total30d ?? null,
			totalAllTime: notionalVolumeData?.totalAllTime ?? null
		}

		const linkedProtocolsSet = new Set([
			...(volumeData?.linkedProtocols ?? []).slice(1),
			...(notionalVolumeData?.linkedProtocols ?? []).slice(1)
		])
		const linkedProtocolsWithAdapterData = []
		if (protocolData.isParentProtocol) {
			for (const key in protocolMetadata) {
				if (linkedProtocolsSet.size === 0) break
				if (linkedProtocolsSet.has(protocolMetadata[key].displayName)) {
					if (protocolMetadata[key].dexs || protocolMetadata[key].dexsNotionalVolume) {
						linkedProtocolsWithAdapterData.push(protocolMetadata[key])
					}
					linkedProtocolsSet.delete(protocolMetadata[key].displayName)
				}
			}
		}

		const charts: Record<string, Array<[string | number, number]>> = {}
		if (volumeData?.totalDataChart?.length > 0) {
			charts['DEX Volume'] = volumeData.totalDataChart
		}
		if (notionalVolumeData?.totalDataChart?.length > 0) {
			charts['Notional Volume'] = notionalVolumeData.totalDataChart
		}

		const defaultCharts: string[] = []
		for (const chartName in charts) {
			defaultCharts.push(chartName)
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
				dexVolume: volumeData && volumeData.totalAllTime ? dexVolume : null,
				dexNotionalVolume: notionalVolumeData && notionalVolumeData.totalAllTime ? dexNotionalVolume : null,
				charts,
				defaultCharts,
				protocolChains: volumeData?.chains ?? [],
				protocolVersions: linkedProtocolsWithAdapterData?.map((versionProtocol) => versionProtocol.displayName) ?? [],
				warningBanners: getProtocolWarningBanners(protocolData),
				hallmarks,
				defaultChartView: volumeData?.defaultChartView ?? notionalVolumeData?.defaultChartView ?? 'daily',
				seoTitle,
				seoDescription
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths = () => {
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
	const [charts, setCharts] = useState<string[]>(props.defaultCharts)
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const finalCharts = useMemo(() => {
		const seriesType = (groupBy === 'cumulative' ? 'line' : 'bar') as 'line' | 'bar'
		const seriesData: Record<string, Array<[number, number]>> = {}
		const chartsConfig = []

		if (charts.includes('DEX Volume')) {
			seriesData['DEX Volume'] = formatBarChart({
				data: props.charts['DEX Volume'],
				groupBy,
				denominationPriceHistory: null,
				dateInMs: false
			})
			chartsConfig.push({
				type: seriesType,
				name: 'DEX Volume',
				encode: { x: 'timestamp', y: 'DEX Volume' },
				color: CHART_COLORS[0],
				stack: 'DEX Volume'
			})
		}
		if (charts.includes('Notional Volume')) {
			seriesData['Notional Volume'] = formatBarChart({
				data: props.charts['Notional Volume'],
				groupBy,
				denominationPriceHistory: null,
				dateInMs: false
			})
			chartsConfig.push({
				type: seriesType,
				name: 'Notional Volume',
				encode: { x: 'timestamp', y: 'Notional Volume' },
				color: CHART_COLORS[1],
				stack: 'Notional Volume'
			})
		}

		const rowMap = new Map<number, Record<string, number>>()
		const seriesNames: string[] = []
		for (const seriesName in seriesData) {
			seriesNames.push(seriesName)
		}
		for (const name of seriesNames) {
			for (const [timestamp, value] of seriesData[name]) {
				const row = rowMap.get(timestamp) ?? { timestamp }
				row[name] = value
				rowMap.set(timestamp, row)
			}
		}

		return {
			dataset: {
				source: ensureChronologicalRows(Array.from(rowMap.values())),
				dimensions: ['timestamp', ...seriesNames]
			},
			charts: chartsConfig
		}
	}, [charts, groupBy, props.charts])
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
						{props.defaultCharts.length > 1 ? (
							<Select
								allValues={props.defaultCharts}
								selectedValues={charts}
								setSelectedValues={setCharts}
								label="Charts"
								variant="filter"
								labelType="smol"
							/>
						) : null}
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
