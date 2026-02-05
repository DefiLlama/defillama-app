import { GetStaticPropsContext } from 'next'
import { lazy, Suspense, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ensureChronologicalRows, formatBarChart, prepareChartCsv } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select'
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
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_TOGGLE_OPTIONS = []

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const getStaticProps = withPerformanceLogging(
	'protocol/options/[protocol]',
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

		if (!metadata || (!metadata[1].optionsPremiumVolume && !metadata[1].optionsNotionalVolume)) {
			return { notFound: true, props: null }
		}

		const [protocolData, premiumVolumeData, notionalVolumeData] = await Promise.all([
			getProtocol(protocol),
			metadata[1].optionsPremiumVolume
				? getAdapterProtocolSummary({
						adapterType: 'options',
						protocol: metadata[1].displayName,
						excludeTotalDataChart: false
					}).catch(() => null)
				: null,
			metadata[1].optionsNotionalVolume
				? getAdapterProtocolSummary({
						adapterType: 'options',
						protocol: metadata[1].displayName,
						excludeTotalDataChart: false,
						dataType: 'dailyNotionalVolume'
					}).catch(() => null)
				: null
		])

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const optionsPremiumVolume: IProtocolOverviewPageData['optionsPremiumVolume'] = {
			total24h: premiumVolumeData?.total24h ?? null,
			total7d: premiumVolumeData?.total7d ?? null,
			total30d: premiumVolumeData?.total30d ?? null,
			totalAllTime: premiumVolumeData?.totalAllTime ?? null
		}

		const optionsNotionalVolume: IProtocolOverviewPageData['optionsNotionalVolume'] = {
			total24h: notionalVolumeData?.total24h ?? null,
			total7d: notionalVolumeData?.total7d ?? null,
			total30d: notionalVolumeData?.total30d ?? null,
			totalAllTime: notionalVolumeData?.totalAllTime ?? null
		}

		const linkedProtocolsSet = new Set([
			...(premiumVolumeData?.linkedProtocols ?? []).slice(1),
			...(notionalVolumeData?.linkedProtocols ?? []).slice(1)
		])
		const linkedProtocolsWithAdapterData = []
		if (protocolData.isParentProtocol) {
			for (const key in protocolMetadata) {
				if (linkedProtocolsSet.size === 0) break
				if (linkedProtocolsSet.has(protocolMetadata[key].displayName)) {
					if (protocolMetadata[key].optionsPremiumVolume || protocolMetadata[key].optionsNotionalVolume) {
						linkedProtocolsWithAdapterData.push(protocolMetadata[key])
					}
					linkedProtocolsSet.delete(protocolMetadata[key].displayName)
				}
			}
		}

		const charts: Record<string, Array<[string | number, number]>> = {}
		if (premiumVolumeData?.totalDataChart?.length > 0) {
			charts['Premium Volume'] = premiumVolumeData.totalDataChart
		}
		if (notionalVolumeData?.totalDataChart?.length > 0) {
			charts['Notional Volume'] = notionalVolumeData.totalDataChart
		}

		const defaultCharts = Object.keys(charts)

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				hasKeyMetrics: true,
				openSmolStatsSummaryByDefault: true,
				optionsPremiumVolume: premiumVolumeData && premiumVolumeData.totalAllTime ? optionsPremiumVolume : null,
				optionsNotionalVolume: notionalVolumeData && notionalVolumeData.totalAllTime ? optionsNotionalVolume : null,
				charts,
				defaultCharts,
				protocolChains: premiumVolumeData?.chains ?? [],
				protocolVersions: linkedProtocolsWithAdapterData?.map((protocol) => protocol.displayName) ?? [],
				warningBanners: getProtocolWarningBanners(protocolData),
				defaultChartView: premiumVolumeData?.defaultChartView ?? notionalVolumeData?.defaultChartView ?? 'daily'
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
	const [charts, setCharts] = useState<string[]>(props.defaultCharts)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()

	const finalCharts = useMemo(() => {
		const seriesType = (groupBy === 'cumulative' ? 'line' : 'bar') as 'line' | 'bar'
		const seriesData: Record<string, Array<[number, number]>> = {}
		const chartsConfig = []

		if (charts.includes('Premium Volume')) {
			seriesData['Premium Volume'] = formatBarChart({
				data: props.charts['Premium Volume'],
				groupBy,
				denominationPriceHistory: null,
				dateInMs: false
			})
			chartsConfig.push({
				type: seriesType,
				name: 'Premium Volume',
				encode: { x: 'timestamp', y: 'Premium Volume' },
				color: CHART_COLORS[0],
				stack: 'Premium Volume'
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
		const seriesNames = Object.keys(seriesData)
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

	const prepareCsv = () => {
		const dataByChartType = {}
		for (const chart of finalCharts.charts) {
			dataByChartType[chart.name] = finalCharts.dataset.source.map((row) => [row.timestamp, row[chart.name]])
		}
		return prepareChartCsv(dataByChartType, `${props.name}-total-options-volume.csv`)
	}

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="options"
			toggleOptions={EMPTY_TOGGLE_OPTIONS}
			warningBanners={props.warningBanners}
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
									key={`${props.name}-options-groupBy-${dataInterval}`}
								>
									{dataInterval.slice(0, 1).toUpperCase()}
								</Tooltip>
							))}
						</div>
						{props.defaultCharts.length > 1 ? (
							<Select
								allValues={props.defaultCharts}
								selectedValues={charts}
								setSelectedValues={setCharts}
								label="Charts"
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
								}}
								labelType="smol"
							/>
						) : null}
						<CSVDownloadButton prepareCsv={prepareCsv} smol />
						<ChartExportButton
							chartInstance={exportChartInstance}
							filename={`${slug(props.name)}-options-volume`}
							title="Options Volume"
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={finalCharts.dataset}
							charts={finalCharts.charts}
							valueSymbol="$"
							onReady={handleChartReady}
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
							adapterType="options"
							breakdownNames={props.protocolChains}
							title="Options Premium Volume by chain"
						/>
					</div>
				) : null}
				{props.protocolVersions?.length > 1 ? (
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="options"
							breakdownNames={props.protocolVersions}
							title="Options Premium Volume by protocol version"
						/>
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
