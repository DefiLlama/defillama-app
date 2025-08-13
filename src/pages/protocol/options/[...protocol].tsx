import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata, IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { TokenLogo } from '~/components/TokenLogo'
import { KeyMetrics } from '~/containers/ProtocolOverview'
import { lazy, Suspense, useMemo, useState } from 'react'
import { oldBlue } from '~/constants/colors'
import { downloadChart, formatBarChart } from '~/components/ECharts/utils'
import { Tooltip } from '~/components/Tooltip'
import { Select } from '~/components/Select'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'

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
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-(--text-form)">
							{INTERVALS_LIST.map((dataInterval) => (
								<Tooltip
									content={capitalizeFirstLetter(dataInterval)}
									render={<button />}
									className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
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
										'h-[30px] bg-transparent! border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) flex items-center gap-1 rounded-md p-2 text-xs'
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
							className="h-[30px] bg-transparent! border border-(--form-control-border) text-(--text-form)! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<LineAndBarChart charts={finalCharts} valueSymbol="$" />
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{props.hasMultipleChain ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full bg-(--cards-bg) border border-(--cards-border) rounded-md min-h-[408px]">
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="options"
							title="Options Premium Volume by chain"
						/>
					</div>
				) : null}
				{props.hasMultipleVersions ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full bg-(--cards-bg) border border-(--cards-border) rounded-md min-h-[408px]">
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
