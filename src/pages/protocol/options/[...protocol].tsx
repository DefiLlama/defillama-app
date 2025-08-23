import { lazy, Suspense, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { downloadChart, formatBarChart } from '~/components/ECharts/utils'
import { Select } from '~/components/Select'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { oldBlue } from '~/constants/colors'
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
	'protocol/options/[...protocol]',
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

		if (!metadata || !metadata[1].options) {
			return { notFound: true, props: null }
		}

		const [protocolData, premiumVolumeData, notionalVolumeData] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				adapterType: 'options',
				protocol: metadata[1].displayName,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
			getAdapterProtocolSummary({
				adapterType: 'options',
				protocol: metadata[1].displayName,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true,
				dataType: 'dailyNotionalVolume'
			}).catch(() => null)
		])

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const optionsPremiumVolume: IProtocolOverviewPageData['optionsPremiumVolume'] = {
			total24h: premiumVolumeData.total24h ?? null,
			total7d: premiumVolumeData.total7d ?? null,
			total30d: premiumVolumeData.total30d ?? null,
			totalAllTime: premiumVolumeData.totalAllTime ?? null
		}

		const optionsNotionalVolume: IProtocolOverviewPageData['optionsNotionalVolume'] = {
			total24h: notionalVolumeData?.total24h ?? null,
			total7d: notionalVolumeData?.total7d ?? null,
			total30d: notionalVolumeData?.total30d ?? null,
			totalAllTime: notionalVolumeData?.totalAllTime ?? null
		}

		const linkedProtocols = Array.from(
			new Set([
				...(premiumVolumeData?.linkedProtocols ?? []).slice(1),
				...(notionalVolumeData?.linkedProtocols ?? []).slice(1)
			])
		)
		const linkedProtocolsWithAdapterData = []
		if (protocolData.isParentProtocol) {
			for (const key in protocolMetadata) {
				if (linkedProtocols.length === 0) break
				if (linkedProtocols.includes(protocolMetadata[key].displayName)) {
					if (protocolMetadata[key].options) {
						linkedProtocolsWithAdapterData.push(protocolMetadata[key])
					}
					linkedProtocols.splice(linkedProtocols.indexOf(protocolMetadata[key].displayName), 1)
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
				hasMultipleChain: premiumVolumeData?.chains?.length > 1 ? true : false,
				hasMultipleVersions: linkedProtocolsWithAdapterData.length > 1 ? true : false,
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

	const finalCharts = useMemo(() => {
		const finalCharts = {}
		if (charts.includes('Premium Volume')) {
			finalCharts['Premium Volume'] = {
				name: 'Premium Volume',
				stack: 'Premium Volume',
				type: groupBy === 'cumulative' ? 'line' : 'bar',
				data: formatBarChart({
					data: props.charts['Premium Volume'],
					groupBy,
					denominationPriceHistory: null,
					dateInMs: false
				}),
				color: oldBlue
			}
		}
		if (charts.includes('Notional Volume')) {
			finalCharts['Notional Volume'] = {
				name: 'Notional Volume',
				stack: 'Notional Volume',
				type: groupBy === 'cumulative' ? 'line' : 'bar',
				data: formatBarChart({
					data: props.charts['Notional Volume'],
					groupBy,
					denominationPriceHistory: null,
					dateInMs: false
				}),
				color: '#E59421'
			}
		}
		return finalCharts
	}, [charts, groupBy, props.charts])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="options"
			toggleOptions={[]}
			warningBanners={props.warningBanners}
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
									key={`${props.name}-options-groupBy-${dataInterval}`}
								>
									{dataInterval.slice(0, 1).toUpperCase()}
								</Tooltip>
							))}
						</div>
						{props.defaultCharts.length > 0 ? (
							<Select
								allValues={props.defaultCharts}
								selectedValues={charts}
								setSelectedValues={setCharts}
								label="Charts"
								clearAll={() => setCharts([])}
								toggleAll={() => setCharts(props.defaultCharts)}
								selectOnlyOne={(newChart) => {
									setCharts([newChart])
								}}
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
								}}
								labelType="smol"
							/>
						) : null}
						<CSVDownloadButton
							onClick={() => {
								try {
									const dataByChartType = {}
									for (const chartType in finalCharts) {
										dataByChartType[chartType] = finalCharts[chartType].data
									}
									downloadChart(dataByChartType, `${props.name}-total-options-volume.csv`)
								} catch (error) {
									console.error('Error generating CSV:', error)
								}
							}}
							smol
							replaceClassName
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-[6px] text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						/>
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
							adapterType="options"
							title="Options Premium Volume by chain"
						/>
					</div>
				) : null}
				{props.hasMultipleVersions ? (
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="options"
							title="Options Premium Volume by protocol version"
						/>
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
