import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard/AddToDashboardButton'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import type { IPieChartProps } from '~/components/ECharts/types'
import { preparePieChartData } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { Select } from '~/components/Select/Select'
import { LinkPreviewCard } from '~/components/SEO'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import type { StablecoinAssetChartConfig, StablecoinAssetChartType } from '~/containers/ProDashboard/types'
import type { StablecoinChartSeriesPayload } from '~/containers/Stablecoins/chartSeries'
import {
	getStablecoinChartTypeLabel,
	getStablecoinChartTypeOptions,
	getStablecoinChartTypeQueryValue,
	getStablecoinChartViewLabel,
	getStablecoinChartViewOptions,
	getStablecoinChartViewQueryValue,
	parseStablecoinChartState,
	type StablecoinChartType as StablecoinChartCategory,
	type StablecoinChartView
} from '~/containers/Stablecoins/chartState'
import { useCalcCirculating, useGroupBridgeData } from '~/containers/Stablecoins/hooks'
import { useStablecoinChartSeriesData, useStablecoinVolumeChartData } from '~/containers/Stablecoins/queries.client'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { capitalizeFirstLetter, formattedNum, slug } from '~/utils'
import { peggedAssetIconUrl } from '~/utils/icons'
import { isTruthyQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import { StablecoinByChainUsageTable } from './StablecoinUsageByChainTable'
import type { PeggedAssetPageProps } from './types'
import { groupStablecoinVolumeChartPayload } from './volumeChart'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const risksHelperTexts: Record<string, string> = {
	algorithmic:
		'Algorithmic assets have their pegs maintained by mechanisms that influence supply and demand. They may be partially collateralized or over-collateralized, but usually do not have a redemption mechanism for their reserve assets. Risks of algorithmic assets include smart contract risk, price collapse due to bank run or other mechanism failure, and de-pegging.',
	'fiat-backed':
		'Fiat-backed assets are backed 1:1 by a reserve of fiat assets controlled by the issuer. Risks of fiat-backed assets include counterparty risk against the issuer, asset freezing and regulations, and risk of insufficient backing.',
	'crypto-backed':
		'Crypto-backed assets are backed by cryptoassets locked in a smart contract as collateral. Risks of crypto-backed assets include smart contract risk, collateral volatility and liquidation, and de-pegging.'
}

const ASSET_CHART_MODE = { page: 'asset' } as const
const UNRELEASED_QUERY_KEY = 'unreleased'

const getAssetChartConfigType = (chartView: StablecoinChartView): StablecoinAssetChartType => {
	if (chartView === 'total') return 'totalCirc'
	if (chartView === 'dominance') return 'chainDominance'
	if (chartView === 'breakdown') return 'chainMcaps'
	return 'chainPie'
}

export default function PeggedContainer(props: PeggedAssetPageProps) {
	return (
		<>
			<LinkPreviewCard
				stablePage={true}
				cardName={props.peggedAssetData.name}
				token={props.peggedAssetData.name}
				logo={peggedAssetIconUrl(props.peggedAssetData.name)}
				tvl={formattedNum(props.mcap, true)?.toString()}
			/>
			<PeggedAssetInfo {...props} />
		</>
	)
}

export const PeggedAssetInfo = ({
	chainsUnique: _chainsUnique,
	chainCirculatings,
	peggedAssetData,
	defaultChartData,
	totalCirculating,
	unreleased,
	mcap,
	bridgeInfo,
	blockExplorerUrl,
	blockExplorerName
}: PeggedAssetPageProps) => {
	const router = useRouter()
	let {
		name,
		onCoinGecko,
		gecko_id,
		symbol,
		description,
		mintRedeemDescription,
		url,
		pegMechanism,
		twitter,
		auditLinks,
		price
	} = peggedAssetData

	const chartState = parseStablecoinChartState(router.query, ASSET_CHART_MODE)
	const chartType = chartState.type
	const chartView = chartState.view
	const volumeGroupBy = React.useMemo<LowercaseDwmcGrouping>(() => {
		const value = Array.isArray(router.query.groupBy) ? router.query.groupBy[0] : router.query.groupBy
		const normalized = value?.toLowerCase()
		return DWMC_GROUPING_OPTIONS_LOWERCASE.find((option) => option.value === normalized)?.value ?? 'daily'
	}, [router.query.groupBy])
	const chartTypeOptions = React.useMemo(() => getStablecoinChartTypeOptions(ASSET_CHART_MODE), [])
	const chartViewOptions = React.useMemo(() => getStablecoinChartViewOptions(chartState), [chartState])
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const onChartTypeChange = React.useCallback(
		(nextChartType: StablecoinChartCategory) => {
			handleChartReady(null)
			void pushShallowQuery(router, {
				chartType: getStablecoinChartTypeQueryValue(ASSET_CHART_MODE, nextChartType),
				chartView: undefined
			})
		},
		[handleChartReady, router]
	)
	const onChartViewChange = React.useCallback(
		(nextChartView: string) => {
			const view = nextChartView as StablecoinChartView
			handleChartReady(null)
			void pushShallowQuery(router, {
				chartView: getStablecoinChartViewQueryValue(ASSET_CHART_MODE, chartType, view)
			})
		},
		[chartType, handleChartReady, router]
	)
	const onVolumeGroupByChange = React.useCallback(
		(nextGroupBy: LowercaseDwmcGrouping) => {
			void pushShallowQuery(router, { groupBy: nextGroupBy === 'daily' ? undefined : nextGroupBy })
		},
		[router]
	)

	const includeUnreleased = React.useMemo(() => isTruthyQueryParam(router.query[UNRELEASED_QUERY_KEY]), [router.query])
	const onUnreleasedToggle = React.useCallback(() => {
		const nextValue = !includeUnreleased
		const nextQuery: Record<string, string | string[]> = {}
		for (const [key, value] of Object.entries(router.query)) {
			if (typeof value === 'undefined' || key === UNRELEASED_QUERY_KEY) continue
			if (typeof value === 'string' || Array.isArray(value)) nextQuery[key] = value
		}
		if (nextValue) nextQuery[UNRELEASED_QUERY_KEY] = 'true'
		void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true, scroll: false })
	}, [includeUnreleased, router])

	const chainTotals = useCalcCirculating(chainCirculatings, includeUnreleased)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: chainTotals, sliceIdentifier: 'name', sliceValue: 'circulating', limit: 10 })
	}, [chainTotals])

	const displayedTotalCirculating = React.useMemo(() => {
		if (!includeUnreleased) return totalCirculating
		let total = 0
		let hasValue = false
		for (const chain of chainTotals) {
			const value = Number(chain.circulating ?? 0)
			if (!Number.isFinite(value)) continue
			total += value
			hasValue = true
		}
		return hasValue ? total : totalCirculating
	}, [chainTotals, includeUnreleased, totalCirculating])

	const displayedMarketCap = React.useMemo(() => {
		if (!includeUnreleased) return mcap
		const baseMcap = typeof mcap === 'number' && Number.isFinite(mcap) ? mcap : null
		const unreleasedSupply = typeof unreleased === 'number' && Number.isFinite(unreleased) ? unreleased : null
		const tokenPrice = typeof price === 'number' && Number.isFinite(price) ? price : null
		if (baseMcap == null) return null
		if (unreleasedSupply == null || tokenPrice == null) return baseMcap
		return baseMcap + unreleasedSupply * tokenPrice
	}, [includeUnreleased, mcap, unreleased, price])

	const groupedChains = useGroupBridgeData(chainTotals, bridgeInfo)

	const getImageExportTitle = () => {
		return `${name} - ${getStablecoinChartTypeLabel(chartType)} ${getStablecoinChartViewLabel(chartView)}`
	}

	const getImageExportFilename = () => {
		const chartSlug = `${chartType}-${chartView}`.toLowerCase()
		return `${slug(name)}-${chartSlug}`
	}

	const dashboardChartConfig: StablecoinAssetChartConfig = React.useMemo(
		() => ({
			id: `stablecoin-asset-${slug(name)}-${getAssetChartConfigType(chartView)}`,
			kind: 'stablecoin-asset',
			stablecoin: name,
			stablecoinId: slug(name),
			chartType: getAssetChartConfigType(chartView),
			colSpan: 1
		}),
		[name, chartView]
	)

	const selectedSeriesChart =
		chartType === 'marketCap' && chartView === 'total'
			? 'totalCirc'
			: chartType === 'marketCap' && chartView === 'breakdown'
				? 'chainMcaps'
				: chartType === 'marketCap' && chartView === 'dominance'
					? 'chainDominance'
					: null
	const volumeDimension = symbol && symbol !== '-' ? symbol : name
	const volumeChartQuery = useStablecoinVolumeChartData({
		chart: chartType === 'volume' ? 'token' : null,
		dimension: volumeDimension,
		fallbackDimension: name,
		enabled: chartType === 'volume'
	})
	const usesDefaultChartData = selectedSeriesChart === 'totalCirc' && !includeUnreleased
	const chartSeriesQuery = useStablecoinChartSeriesData({
		scope: 'asset',
		stablecoin: slug(name),
		chart: selectedSeriesChart,
		includeUnreleased,
		enabled: selectedSeriesChart != null && !usesDefaultChartData
	})
	const selectedChartData = React.useDeferredValue(
		usesDefaultChartData ? defaultChartData : (chartSeriesQuery.data ?? null)
	)
	const groupedVolumeChartData = React.useMemo(
		() => (volumeChartQuery.data ? groupStablecoinVolumeChartPayload(volumeChartQuery.data, volumeGroupBy) : null),
		[volumeChartQuery.data, volumeGroupBy]
	)
	const selectedVolumeChartData = React.useDeferredValue(groupedVolumeChartData)
	const isSelectedChartLoading =
		!usesDefaultChartData &&
		selectedChartData == null &&
		(chartSeriesQuery.isLoading || chartSeriesQuery.isFetching || chartSeriesQuery.data != null)
	const isSelectedChartError = !isSelectedChartLoading && !usesDefaultChartData && chartSeriesQuery.error != null
	const isVolumeChartLoading =
		selectedVolumeChartData == null &&
		(volumeChartQuery.isLoading || volumeChartQuery.isFetching || volumeChartQuery.data != null)
	const showDefaultLegend = chartType === 'marketCap' && (chartView === 'breakdown' || chartView === 'dominance')

	const hasInfo = description || pegMechanism || mintRedeemDescription || (auditLinks != null && auditLinks.length > 0)

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				{/* Stats card */}
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="flex flex-wrap items-center gap-2 text-xl">
						<TokenLogo name={name} kind="pegged" alt={`Logo of ${name}`} size={24} />
						<span className="font-bold">{name}</span>
						{symbol && symbol !== '-' ? <span className="font-normal">({symbol})</span> : null}
						{peggedAssetData.deprecated ? (
							<Tooltip content="Deprecated protocol" className="text-(--error)">
								<Icon name="alert-triangle" height={18} width={18} />
							</Tooltip>
						) : null}
					</h1>

					<p className="flex flex-col">
						<span className="text-(--text-label)">Market Cap</span>
						<span className="min-h-8 font-jetbrains text-2xl font-semibold">
							{formattedNum(displayedMarketCap ?? '0', true)}
						</span>
					</p>

					<div className="flex flex-col">
						<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
							<span className="text-(--text-label)">Price</span>
							<span className="font-jetbrains">{price === null ? '-' : formattedNum(price, true)}</span>
						</p>
						{displayedTotalCirculating != null ? (
							<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
								<span className="text-(--text-label)">Total Circulating</span>
								<span className="font-jetbrains">{formattedNum(displayedTotalCirculating)}</span>
							</p>
						) : null}
						{unreleased != null && unreleased > 0 ? (
							<p className="flex flex-wrap items-center justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
								<label className="flex cursor-pointer items-center gap-2 text-(--text-label)">
									<input
										type="checkbox"
										value={UNRELEASED_QUERY_KEY}
										checked={includeUnreleased}
										onChange={onUnreleasedToggle}
									/>
									<span style={{ opacity: includeUnreleased ? 1 : 0.7 }}>
										{capitalizeFirstLetter(UNRELEASED_QUERY_KEY)}
									</span>
									<QuestionHelper text="Use this option to choose whether to include coins that have been minted but have never been circulating." />
								</label>
								<span className="font-jetbrains">{formattedNum(unreleased)}</span>
							</p>
						) : null}
					</div>
				</div>

				{/* Chart */}
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
						<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
							{chartTypeOptions.map(({ key, name: optionName }) => (
								<button
									key={key}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
									data-active={chartType === key}
									onClick={() => onChartTypeChange(key)}
								>
									{optionName}
								</button>
							))}
						</div>
						<Select
							allValues={chartViewOptions}
							selectedValues={chartView}
							setSelectedValues={onChartViewChange}
							label={getStablecoinChartViewLabel(chartView)}
							labelType="none"
							variant="filter"
						/>
						{chartType === 'volume' ? null : <AddToDashboardButton chartConfig={dashboardChartConfig} smol />}
						{chartType === 'volume' ? (
							<ChartGroupingSelector
								value={volumeGroupBy}
								options={DWMC_GROUPING_OPTIONS_LOWERCASE}
								onValueChange={onVolumeGroupByChange}
							/>
						) : null}
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={getImageExportFilename()}
							title={getImageExportTitle()}
						/>
					</div>
					{chartType === 'marketCap' && chartView === 'pie' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<PieChart chartData={chainsCirculatingValues} onReady={handleChartReady} />
						</React.Suspense>
					) : chartType === 'volume' ? (
						<SelectedAssetChart
							data={selectedVolumeChartData}
							isLoading={isVolumeChartLoading}
							isError={!isVolumeChartLoading && volumeChartQuery.error != null}
							hideDefaultLegend
							groupBy={volumeGroupBy}
							onReady={handleChartReady}
						/>
					) : (
						<SelectedAssetChart
							data={selectedChartData}
							isLoading={isSelectedChartLoading}
							isError={isSelectedChartError}
							hideDefaultLegend={!showDefaultLegend}
							onReady={handleChartReady}
						/>
					)}
				</div>

				{/* Additional info cards */}
				{hasInfo ? (
					<div className="col-span-full">
						<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
							<h2 className="text-base font-semibold">Stablecoin Information</h2>
							{description ? <p>{description}</p> : null}
							{pegMechanism ? (
								<p className="flex items-center gap-1">
									<span>Category:</span>
									<span>{pegMechanism}</span>
									<QuestionHelper text={risksHelperTexts[pegMechanism] || 'No additional info available'} />
								</p>
							) : null}
							{mintRedeemDescription ? (
								<p className="flex flex-col gap-1">
									<span className="font-medium">Minting and Redemption</span>
									<span className="text-(--text-label)">{mintRedeemDescription}</span>
								</p>
							) : null}
							<p className="flex items-center gap-1">
								<span className="flex flex-nowrap items-center gap-1">
									<span>Audits</span>
									<QuestionHelper text="Audits are not a security guarantee" />
									<span>:</span>
								</span>
								{auditLinks != null && auditLinks.length > 0 ? (
									<Menu
										name="Yes"
										options={auditLinks}
										isExternal
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									/>
								) : (
									<span>No</span>
								)}
							</p>
							<div className="flex flex-wrap gap-2">
								{url ? (
									<a
										href={url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<Icon name="earth" className="h-3 w-3" />
										<span>Website</span>
									</a>
								) : null}
								{twitter ? (
									<a
										href={twitter}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<Icon name="twitter" className="h-3 w-3" />
										<span>Twitter</span>
									</a>
								) : null}
								{blockExplorerUrl ? (
									<a
										href={blockExplorerUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<span>{blockExplorerName}</span>
										<Icon name="arrow-up-right" height={14} width={14} />
									</a>
								) : null}
								{onCoinGecko === 'true' && gecko_id ? (
									<a
										href={`https://www.coingecko.com/en/coins/${gecko_id}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<span>CoinGecko</span>
										<Icon name="arrow-up-right" height={14} width={14} />
									</a>
								) : null}
								{gecko_id ? (
									<a
										href={`https://github.com/DefiLlama/peggedassets-server/tree/master/src/adapters/peggedAssets/${gecko_id}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<Icon name="github" className="h-3 w-3" />
										<span>Check the code</span>
									</a>
								) : null}
							</div>
						</div>
					</div>
				) : null}
			</div>

			<StablecoinByChainUsageTable data={groupedChains} />
		</>
	)
}

function SelectedAssetChart({
	data,
	isLoading,
	isError,
	hideDefaultLegend,
	groupBy,
	onReady
}: {
	data: StablecoinChartSeriesPayload | null
	isLoading: boolean
	isError: boolean
	hideDefaultLegend: boolean
	groupBy?: LowercaseDwmcGrouping
	onReady: (instance: echarts.ECharts | null) => void
}) {
	if (isLoading) {
		return (
			<div className="flex h-[360px] w-full items-center justify-center text-sm text-(--text-label)">
				Loading chart...
			</div>
		)
	}
	if (isError || !data) {
		return (
			<div className="flex h-[360px] w-full items-center justify-center text-sm text-(--text-label)">
				Chart unavailable
			</div>
		)
	}
	if (data.charts.length === 0 || data.dataset.source.length === 0) {
		return (
			<div className="flex h-[360px] w-full items-center justify-center text-sm text-(--text-label)">
				Chart unavailable
			</div>
		)
	}
	return (
		<React.Suspense fallback={<div className="h-[360px] w-full" />}>
			<MultiSeriesChart2
				dataset={data.dataset}
				charts={data.charts}
				stacked={data.stacked}
				expandTo100Percent={data.expandTo100Percent}
				valueSymbol={data.valueSymbol}
				showTotalInTooltip={data.showTotalInTooltip}
				hideDefaultLegend={hideDefaultLegend}
				groupBy={groupBy}
				onReady={onReady}
			/>
		</React.Suspense>
	)
}
