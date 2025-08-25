import { lazy, Suspense, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { formatBarChart } from '~/components/ECharts/utils'
import { useCSVDownload } from '~/hooks/useCSVDownload'
import { feesOptions } from '~/components/Filters/options'
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
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart'))

export const getStaticProps = withPerformanceLogging(
	'protocol/fees/[...protocol]',
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

		if (!metadata || !metadata[1].fees) {
			return { notFound: true, props: null }
		}

		const [protocolData, feesData, revenueData, holdersRevenueData, bribeRevenueData, tokenTaxData] = await Promise.all(
			[
				getProtocol(protocol),
				getAdapterProtocolSummary({
					adapterType: 'fees',
					protocol: metadata[1].displayName,
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
				}),
				metadata[1].revenue
					? getAdapterProtocolSummary({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true,
							dataType: 'dailyRevenue'
						}).catch(() => null)
					: Promise.resolve(null),
				metadata[1].holdersRevenue
					? getAdapterProtocolSummary({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: true,
							excludeTotalDataChartBreakdown: true,
							dataType: 'dailyHoldersRevenue'
						}).catch(() => null)
					: Promise.resolve(null),
				metadata[1].bribeRevenue
					? getAdapterProtocolSummary({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true,
							dataType: 'dailyBribesRevenue'
						}).catch(() => null)
					: Promise.resolve(null),
				metadata[1].tokenTax
					? getAdapterProtocolSummary({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true,
							dataType: 'dailyTokenTaxes'
						}).catch(() => null)
					: Promise.resolve(null)
			]
		)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const fees: IProtocolOverviewPageData['fees'] = {
			total24h: feesData.total24h ?? null,
			total7d: feesData.total7d ?? null,
			total30d: feesData.total30d ?? null,
			totalAllTime: feesData.totalAllTime ?? null
		}

		const revenue: IProtocolOverviewPageData['revenue'] = {
			total24h: revenueData?.total24h ?? null,
			total7d: revenueData?.total7d ?? null,
			total30d: revenueData?.total30d ?? null,
			totalAllTime: revenueData?.totalAllTime ?? null
		}

		const holdersRevenue: IProtocolOverviewPageData['holdersRevenue'] = {
			total24h: holdersRevenueData?.total24h ?? null,
			total7d: holdersRevenueData?.total7d ?? null,
			total30d: holdersRevenueData?.total30d ?? null,
			totalAllTime: holdersRevenueData?.totalAllTime ?? null
		}

		const bribeRevenue: IProtocolOverviewPageData['bribeRevenue'] = {
			total24h: bribeRevenueData?.total24h ?? null,
			total7d: bribeRevenueData?.total7d ?? null,
			total30d: bribeRevenueData?.total30d ?? null,
			totalAllTime: bribeRevenueData?.totalAllTime ?? null
		}

		const tokenTax: IProtocolOverviewPageData['tokenTax'] = {
			total24h: tokenTaxData?.total24h ?? null,
			total7d: tokenTaxData?.total7d ?? null,
			total30d: tokenTaxData?.total30d ?? null,
			totalAllTime: tokenTaxData?.totalAllTime ?? null
		}

		const linkedProtocols = (feesData?.linkedProtocols ?? []).slice(1)
		const linkedProtocolsWithAdapterData = []
		if (protocolData.isParentProtocol) {
			for (const key in protocolMetadata) {
				if (linkedProtocols.length === 0) break
				if (linkedProtocols.includes(protocolMetadata[key].displayName)) {
					if (protocolMetadata[key].fees) {
						linkedProtocolsWithAdapterData.push(protocolMetadata[key])
					}
					linkedProtocols.splice(linkedProtocols.indexOf(protocolMetadata[key].displayName), 1)
				}
			}
		}

		const bribesCharts = {}
		for (const [date, value] of bribeRevenueData?.totalDataChart ?? []) {
			bribesCharts[date] = value
		}
		const tokenTaxCharts = {}
		for (const [date, value] of tokenTaxData?.totalDataChart ?? []) {
			tokenTaxCharts[date] = value
		}

		const charts = {
			fees: feesData?.totalDataChart ?? [],
			revenue: revenueData?.totalDataChart ?? [],
			bribeRevenue: bribeRevenueData && bribeRevenueData.totalAllTime ? bribesCharts : null,
			tokenTax: tokenTaxData && tokenTaxData.totalAllTime ? tokenTaxCharts : null
		}

		const defaultCharts = []

		if (
			charts.fees.length > 0 ||
			bribeRevenueData?.totalDataChart?.length > 0 ||
			tokenTaxData?.totalDataChart?.length > 0
		) {
			defaultCharts.push('Fees')
		}

		if (
			charts.revenue.length > 0 ||
			bribeRevenueData?.totalDataChart?.length > 0 ||
			tokenTaxData?.totalDataChart?.length > 0
		) {
			defaultCharts.push('Revenue')
		}

		const toggleOptions = feesOptions.filter((option) =>
			option.key === 'bribes' ? metrics.bribes : option.key === 'tokentax' ? metrics.tokenTax : true
		)

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				fees,
				revenue: revenueData && revenueData.totalAllTime ? revenue : null,
				holdersRevenue: holdersRevenueData && holdersRevenueData.totalAllTime ? holdersRevenue : null,
				bribeRevenue: bribeRevenueData && bribeRevenueData.totalAllTime ? bribeRevenue : null,
				tokenTax: tokenTaxData && tokenTaxData.totalAllTime ? tokenTax : null,
				hasKeyMetrics: true,
				openSmolStatsSummaryByDefault: true,
				charts,
				defaultCharts,
				hasMultipleChain: feesData?.chains?.length > 1 ? true : false,
				hasMultipleVersions: linkedProtocolsWithAdapterData.length > 1 ? true : false,
				warningBanners: getProtocolWarningBanners(protocolData),
				defaultChartView:
					feesData?.defaultChartView ??
					revenueData?.defaultChartView ??
					holdersRevenueData?.defaultChartView ??
					bribeRevenueData?.defaultChartView ??
					tokenTaxData?.defaultChartView ??
					'daily',
				toggleOptions
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
	const [feesSettings] = useLocalStorageSettingsManager('fees')
	const { downloadChart, isLoading } = useCSVDownload()

	const finalCharts = useMemo(() => {
		const finalCharts = {}

		let feesChart = props.charts.fees
		let revenueChart = props.charts.revenue

		if (feesSettings.bribes && props.bribeRevenue?.totalAllTime) {
			if (charts.includes('Fees')) {
				feesChart = props.charts.fees.map(([date, value]) => [date, value + (props.charts.bribeRevenue?.[date] ?? 0)])
			}
			if (charts.includes('Revenue')) {
				revenueChart = props.charts.revenue.map(([date, value]) => [
					date,
					value + (props.charts.bribeRevenue?.[date] ?? 0)
				])
			}
		}
		if (feesSettings.tokentax && props.tokenTax?.totalAllTime) {
			if (charts.includes('Fees')) {
				feesChart = props.charts.fees.map(([date, value]) => [date, value + (props.charts.tokenTax?.[date] ?? 0)])
			}
			if (charts.includes('Revenue')) {
				revenueChart = props.charts.revenue.map(([date, value]) => [date, value + (props.charts.tokenTax?.[date] ?? 0)])
			}
		}

		if (charts.includes('Fees')) {
			finalCharts['Fees'] = {
				name: 'Fees',
				stack: 'Fees',
				type: groupBy === 'cumulative' ? 'line' : 'bar',
				data: formatBarChart({
					data: feesChart,
					groupBy,
					denominationPriceHistory: null,
					dateInMs: false
				}),
				color: oldBlue
			}
		}
		if (charts.includes('Revenue')) {
			finalCharts['Revenue'] = {
				name: 'Revenue',
				stack: 'Revenue',
				type: groupBy === 'cumulative' ? 'line' : 'bar',
				data: formatBarChart({
					data: revenueChart,
					groupBy,
					denominationPriceHistory: null,
					dateInMs: false
				}),
				color: '#E59421'
			}
		}

		return finalCharts
	}, [props.charts, charts, feesSettings, groupBy])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="fees"
			warningBanners={props.warningBanners}
			toggleOptions={props.toggleOptions}
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
									key={`${props.name}-fees-groupBy-${dataInterval}`}
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
									downloadChart(dataByChartType, `${props.name}-total-fees-revenue.csv`)
								} catch (error) {
									console.error('Error generating CSV:', error)
								}
							}}
							isLoading={isLoading}
							smol
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
							adapterType="fees"
							metadata={{
								revenue: props.metrics.revenue ?? false,
								bribeRevenue: props.metrics.bribeRevenue ?? false,
								tokenTax: props.metrics.tokenTax ?? false
							}}
							title="Fees by chain"
						/>
					</div>
				) : null}
				{props.hasMultipleVersions ? (
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="fees"
							metadata={{
								revenue: props.metrics.revenue ?? false,
								bribeRevenue: props.metrics.bribeRevenue ?? false,
								tokenTax: props.metrics.tokenTax ?? false
							}}
							title="Fees by protocol version"
						/>
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
