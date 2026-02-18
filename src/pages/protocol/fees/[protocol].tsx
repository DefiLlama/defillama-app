import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { lazy, Suspense, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { ensureChronologicalRows, formatBarChart } from '~/components/ECharts/utils'
import { feesOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select/Select'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { getAdapterProtocolOverview } from '~/containers/DimensionAdapters/queries'
import { KeyMetrics } from '~/containers/ProtocolOverview'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import type { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const getStaticProps = withPerformanceLogging(
	'protocol/fees/[protocol]',
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

		if (!metadata || !metadata[1].fees) {
			return { notFound: true, props: null }
		}

		const [protocolData, feesData, revenueData, holdersRevenueData, bribeRevenueData, tokenTaxData] = await Promise.all(
			[
				fetchProtocolOverviewMetrics(protocol),
				getAdapterProtocolOverview({
					adapterType: 'fees',
					protocol: metadata[1].displayName,
					excludeTotalDataChart: false
				}),
				metadata[1].revenue
					? getAdapterProtocolOverview({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: false,
							dataType: 'dailyRevenue'
						}).catch(() => null)
					: Promise.resolve(null),
				metadata[1].holdersRevenue
					? getAdapterProtocolOverview({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: false,
							dataType: 'dailyHoldersRevenue'
						}).catch(() => null)
					: Promise.resolve(null),
				metadata[1].bribeRevenue
					? getAdapterProtocolOverview({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: false,
							dataType: 'dailyBribesRevenue'
						}).catch(() => null)
					: Promise.resolve(null),
				metadata[1].tokenTax
					? getAdapterProtocolOverview({
							adapterType: 'fees',
							protocol: metadata[1].displayName,
							excludeTotalDataChart: false,
							dataType: 'dailyTokenTaxes'
						}).catch(() => null)
					: Promise.resolve(null)
			]
		)

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })

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

		const linkedProtocolsSet = new Set((feesData?.linkedProtocols ?? []).slice(1))
		const linkedProtocolsWithFeesData = []
		const linkedProtocolsWithRevenueData = []
		if (protocolData.isParentProtocol) {
			for (const key in protocolMetadata) {
				if (linkedProtocolsSet.size === 0) break
				if (linkedProtocolsSet.has(protocolMetadata[key].displayName)) {
					if (protocolMetadata[key].fees) {
						linkedProtocolsWithFeesData.push(protocolMetadata[key])
					}
					if (protocolMetadata[key].revenue) {
						linkedProtocolsWithRevenueData.push(protocolMetadata[key])
					}
					linkedProtocolsSet.delete(protocolMetadata[key].displayName)
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
			holdersRevenue: holdersRevenueData?.totalDataChart ?? [],
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

		if (
			charts.holdersRevenue.length > 0 ||
			bribeRevenueData?.totalDataChart?.length > 0 ||
			tokenTaxData?.totalDataChart?.length > 0
		) {
			defaultCharts.push('Holders Revenue')
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
				protocolChains: feesData?.chains ?? [],
				protocolFeesVersions: linkedProtocolsWithFeesData?.map((protocol) => protocol.displayName) ?? [],
				protocolRevenueVersions: linkedProtocolsWithRevenueData?.map((protocol) => protocol.displayName) ?? [],
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

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const [groupBy, setGroupBy] = useState<(typeof INTERVALS_LIST)[number]>(props.defaultChartView)
	const [charts, setCharts] = useState<string[]>(props.defaultCharts)
	const [feesSettings] = useLocalStorageSettingsManager('fees')
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const finalCharts = useMemo(() => {
		let feesChart = props.charts.fees
		let revenueChart = props.charts.revenue
		let holdersRevenueChart = props.charts.holdersRevenue

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
			if (charts.includes('Holders Revenue')) {
				holdersRevenueChart = props.charts.holdersRevenue.map(([date, value]) => [
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
			if (charts.includes('Holders Revenue')) {
				holdersRevenueChart = props.charts.holdersRevenue.map(([date, value]) => [
					date,
					value + (props.charts.tokenTax?.[date] ?? 0)
				])
			}
		}

		const seriesType = (groupBy === 'cumulative' ? 'line' : 'bar') as 'line' | 'bar'
		const seriesData: Record<string, Array<[number, number]>> = {}
		const chartsConfig = []

		if (charts.includes('Fees')) {
			seriesData['Fees'] = formatBarChart({ data: feesChart, groupBy, denominationPriceHistory: null, dateInMs: false })
			chartsConfig.push({
				type: seriesType,
				name: 'Fees',
				encode: { x: 'timestamp', y: 'Fees' },
				color: CHART_COLORS[0],
				stack: 'Fees'
			})
		}
		if (charts.includes('Revenue')) {
			seriesData['Revenue'] = formatBarChart({
				data: revenueChart,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: false
			})
			chartsConfig.push({
				type: seriesType,
				name: 'Revenue',
				encode: { x: 'timestamp', y: 'Revenue' },
				color: CHART_COLORS[1],
				stack: 'Revenue'
			})
		}
		if (charts.includes('Holders Revenue')) {
			seriesData['Holders Revenue'] = formatBarChart({
				data: holdersRevenueChart,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: false
			})
			chartsConfig.push({
				type: seriesType,
				name: 'Holders Revenue',
				encode: { x: 'timestamp', y: 'Holders Revenue' },
				color: CHART_COLORS[2],
				stack: 'Holders Revenue'
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
	}, [props.charts, charts, feesSettings, groupBy, props.bribeRevenue?.totalAllTime, props.tokenTax?.totalAllTime])

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
							filename={`${slug(props.name)}-fees-revenue`}
							title="Fees & Revenue"
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
					<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="fees"
							breakdownNames={props.protocolChains}
							metadata={{
								bribeRevenue: props.bribeRevenue ?? false,
								tokenTax: props.tokenTax ?? false
							}}
							title="Fees by chain"
						/>
					</div>
				) : null}
				{props.protocolFeesVersions?.length > 1 ? (
					<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="fees"
							breakdownNames={props.protocolFeesVersions}
							metadata={{
								bribeRevenue: props.bribeRevenue ?? false,
								tokenTax: props.tokenTax ?? false
							}}
							title="Fees by protocol version"
						/>
					</div>
				) : null}
				{props.protocolRevenueVersions?.length > 1 ? (
					<>
						{props.protocolChains?.length > 1 ? (
							<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
								<DimensionProtocolChartByType
									chartType="chain"
									protocolName={slug(props.name)}
									adapterType="fees"
									dataType="dailyRevenue"
									breakdownNames={props.protocolChains}
									metadata={{
										bribeRevenue: props.metrics.bribeRevenue ?? false,
										tokenTax: props.metrics.tokenTax ?? false
									}}
									title="Revenue by chain"
								/>
							</div>
						) : null}

						<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:only:col-span-full">
							<DimensionProtocolChartByType
								chartType="version"
								protocolName={slug(props.name)}
								adapterType="fees"
								dataType="dailyRevenue"
								breakdownNames={props.protocolRevenueVersions}
								metadata={{
									bribeRevenue: props.metrics.bribeRevenue ?? false,
									tokenTax: props.metrics.tokenTax ?? false
								}}
								title="Revenue by protocol version"
							/>
						</div>
					</>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
