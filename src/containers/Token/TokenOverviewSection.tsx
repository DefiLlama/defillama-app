import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { matchSorter } from 'match-sorter'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useDeferredValue, useMemo, useState } from 'react'
import { BuyOnLlamaswap } from '~/components/BuyOnLlamaswap'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { MetricRow, MetricSection, SubMetricRow, SubMetricSection } from '~/components/MetricPrimitives'
import { TokenLogo } from '~/components/TokenLogo'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks/useIsClient'
import { formattedNum } from '~/utils'
import { tokenIconUrl } from '~/utils/icons'
import { pushShallowQuery, readSingleQueryValue, toNonEmptyArrayParam } from '~/utils/routerQuery'
import { fetchTokenMarkets } from './api'
import type { TokenMarketCategory, TokenMarketsResponse, TokenMarketsTotalsByCategory } from './tokenMarkets.types'
import {
	buildDisplayedTokenChartData,
	TOKEN_OVERVIEW_DEFAULT_CHARTS,
	type TokenOverviewChartLabel,
	type TokenOverviewData
} from './tokenOverview'
import { useFetchTokenOverviewChartData } from './useFetchTokenOverviewChartData'

const TOKEN_OVERVIEW_CHART_COLORS: Record<TokenOverviewChartLabel, string> = {
	'Token Price': '#2563eb',
	'Token Volume': '#92400e',
	Mcap: '#b45309',
	FDV: '#0f766e'
}

const TOKEN_OVERVIEW_CHART_ORDER: TokenOverviewChartLabel[] = ['Token Price', 'Token Volume', 'Mcap', 'FDV']
const FDV_TOOLTIP =
	"Fully Diluted Valuation, this is calculated by taking the expected maximum supply of the token and multiplying it by the price. It's mainly used to calculate the hypothetical marketcap of the token if all the tokens were unlocked and circulating."
const OUTSTANDING_FDV_TOOLTIP =
	'Outstanding FDV is calculated by taking the outstanding supply of the token and multiplying it by the price.\n\nOutstanding supply is the total supply minus the supply that is not yet allocated to anything (eg coins in treasury or reserve).'
const LIQUIDITY_TOOLTIP =
	'Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data.'
const CIRCULATING_SUPPLY_TOOLTIP =
	'Circulating supply is the number of tokens currently available and circulating in the market.'
const MAX_SUPPLY_TOOLTIP = 'Max supply is the maximum number of tokens that can ever exist for this asset.'
const MARKET_CAP_TOOLTIP = 'Market cap is calculated by multiplying the circulating supply by the current token price.'
const VOLUME_24H_TOOLTIP = 'Volume 24h is the total dollar value traded across tracked markets over the last 24 hours.'
const OPEN_INTEREST_TOOLTIP =
	'Open Interest is the total notional USD value of outstanding perpetual contracts across tracked markets.'
const TREASURY_TOOLTIP = 'Treasury is the value of assets held by the entity issuing or stewarding this token.'

const MARKET_CATEGORY_LABELS: Record<TokenMarketCategory, string> = {
	spot: 'Spot',
	linear_perp: 'Linear Perp',
	inverse_perp: 'Inverse Perp'
}
const MARKET_CATEGORY_ORDER: TokenMarketCategory[] = ['spot', 'linear_perp', 'inverse_perp']
const TOKEN_OVERVIEW_CHART_QUERY_KEY = 'chart'
const TOKEN_OVERVIEW_CHART_GROUP_QUERY_KEY = 'chartGroup'

const DeferredProtocolChart = dynamic(() => import('~/containers/ProtocolOverview/Chart'), {
	loading: () => <div className="min-h-[360px]" />
})

function formatCurrency(value: number | null | undefined) {
	if (value == null) return 'N/A'
	return formattedNum(value, true)
}

function formatSupply(value: number | null | undefined, symbol: string) {
	if (value == null) return 'N/A'
	if (value === Infinity) return `∞ ${symbol}`.trim()
	return `${formattedNum(value, false)} ${symbol}`.trim()
}

function formatPercent(value: number | null | undefined) {
	if (value == null) return null
	return `${value > 0 ? '+' : ''}${formattedNum(value, false)}%`
}

function formatRaiseAmount(value: number | null | undefined) {
	if (value == null) return 'Undisclosed'
	return formattedNum(value * 1_000_000, true)
}

function getTotalRaisedAmount(raises: TokenOverviewData['raises']): number | null {
	if (!raises?.length) return null

	let totalRaised = 0
	let hasDisclosedRaise = false

	for (const raise of raises) {
		if (raise.amount == null) continue
		totalRaised += raise.amount
		hasDisclosedRaise = true
	}

	return hasDisclosedRaise ? totalRaised : null
}

function formatDateLabel(value: string | number | null | undefined) {
	if (value == null) return null
	const date = typeof value === 'number' ? dayjs.unix(value) : dayjs(value)
	return date.isValid() ? date.format('MMM D, YYYY') : null
}

function getChartLabel(label: TokenOverviewChartLabel, symbol: string) {
	if (label.startsWith('Token ')) {
		return symbol ? label.replace('Token', `$${symbol}`) : label
	}

	return label
}

function isTokenOverviewChartLabel(value: string): value is TokenOverviewChartLabel {
	return TOKEN_OVERVIEW_CHART_ORDER.includes(value as TokenOverviewChartLabel)
}

function normalizeTokenOverviewChartGrouping(value: string | undefined): LowercaseDwmcGrouping {
	const normalizedValue = value?.toLowerCase()
	if (DWMC_GROUPING_OPTIONS_LOWERCASE.some((option) => option.value === normalizedValue)) {
		return normalizedValue as LowercaseDwmcGrouping
	}

	return 'daily'
}

function areTokenOverviewChartsEqual(a: TokenOverviewChartLabel[], b: TokenOverviewChartLabel[]) {
	return a.length === b.length && a.every((value, index) => value === b[index])
}

export function TokenPageHero({
	overview,
	logo,
	headingAs: Heading = 'h1'
}: {
	overview: TokenOverviewData
	logo?: string | null
	headingAs?: 'h1' | 'div'
}) {
	const percentChange = formatPercent(overview.marketData.percentChange24h)
	const hasPriceBreakdown = overview.marketData.ath != null || overview.marketData.atl != null
	const percentChangeColor =
		overview.marketData.percentChange24h != null && overview.marketData.percentChange24h >= 0
			? 'rgba(18, 182, 0, 0.7)'
			: 'rgba(211, 0, 0, 0.7)'

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-2 text-xl">
				{logo ? (
					<TokenLogo src={logo} fallbackSrc={tokenIconUrl(overview.name)} size={24} alt={`Logo of ${overview.name}`} />
				) : (
					<TokenLogo name={overview.name} kind="token" size={24} alt={`Logo of ${overview.name}`} />
				)}
				<Heading className="flex flex-wrap items-center gap-2 text-xl">
					<span className="font-bold">{overview.name}</span>
					{overview.symbol ? <span className="font-normal">({overview.symbol})</span> : null}
				</Heading>
				<span className="ml-auto flex items-center gap-2">
					{overview.llamaswapChains?.length ? (
						<BuyOnLlamaswap chains={overview.llamaswapChains} placement="token_page" size="large" />
					) : null}
				</span>
			</div>
			{hasPriceBreakdown ? (
				<details className="group/price">
					<summary className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span className="basis-full text-sm text-(--text-label)">Token Price</span>
						<span className="font-jetbrains text-2xl font-semibold" suppressHydrationWarning>
							{formatCurrency(overview.marketData.currentPrice)}
						</span>
						<Icon
							name="chevron-down"
							height={18}
							width={18}
							className="transition-transform duration-100 group-open/price:rotate-180"
						/>
					</summary>
					<div className="mt-3 flex flex-col">
						{percentChange ? (
							<SubMetricRow
								label="24h Change"
								value={<span style={{ color: percentChangeColor }}>{percentChange}</span>}
							/>
						) : null}
						{overview.marketData.ath != null ? (
							<SubMetricRow
								label="All Time High"
								className="items-end"
								extra={
									formatDateLabel(overview.marketData.athDate) ? (
										<span className="ml-auto self-end text-xs text-(--text-tertiary)">
											{formatDateLabel(overview.marketData.athDate)}
										</span>
									) : null
								}
								valueClassName="font-jetbrains"
								value={formatCurrency(overview.marketData.ath)}
							/>
						) : null}
						{overview.marketData.atl != null ? (
							<SubMetricRow
								label="All Time Low"
								className="items-end"
								extra={
									formatDateLabel(overview.marketData.atlDate) ? (
										<span className="ml-auto self-end text-xs text-(--text-tertiary)">
											{formatDateLabel(overview.marketData.atlDate)}
										</span>
									) : null
								}
								valueClassName="font-jetbrains"
								value={formatCurrency(overview.marketData.atl)}
							/>
						) : null}
					</div>
				</details>
			) : (
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span className="basis-full text-sm text-(--text-label)">Token Price</span>
					<span className="font-jetbrains text-2xl font-semibold" suppressHydrationWarning>
						{formatCurrency(overview.marketData.currentPrice)}
					</span>
					{percentChange ? (
						<span className="text-sm font-medium" style={{ color: percentChangeColor }}>
							{percentChange}
						</span>
					) : null}
				</div>
			)}
		</div>
	)
}

function getCategoryMetric(
	totals: TokenMarketsTotalsByCategory,
	category: TokenMarketCategory,
	metric: 'volume' | 'oi'
): number | null {
	const entry = totals[category]
	if (!entry) return null
	return metric === 'volume' ? (entry.total_volume_24h ?? null) : (entry.total_oi_usd ?? null)
}

function sumVenueMetric(totals: TokenMarketsTotalsByCategory, metric: 'volume' | 'oi'): number | null {
	let sum = 0
	let hasValue = false
	for (const category of MARKET_CATEGORY_ORDER) {
		const value = getCategoryMetric(totals, category, metric)
		if (value != null) {
			sum += value
			hasValue = true
		}
	}
	return hasValue ? sum : null
}

function MarketsCategoryBreakdown({
	totals,
	metric
}: {
	totals: TokenMarketsTotalsByCategory
	metric: 'volume' | 'oi'
}) {
	const visibleCategories = metric === 'oi' ? MARKET_CATEGORY_ORDER.filter((c) => c !== 'spot') : MARKET_CATEGORY_ORDER
	return (
		<>
			{visibleCategories.map((category) => {
				const value = getCategoryMetric(totals, category, metric)
				return (
					<SubMetricRow
						key={category}
						label={MARKET_CATEGORY_LABELS[category]}
						value={value == null ? 'N/A' : formatCurrency(value)}
					/>
				)
			})}
		</>
	)
}

function MarketsMetricSection({
	label,
	tooltip,
	totalValue,
	markets,
	metric
}: {
	label: string
	tooltip: string
	totalValue: number | null
	markets: TokenMarketsResponse
	metric: 'volume' | 'oi'
}) {
	const cexValue = sumVenueMetric(markets.totals.cex, metric)
	const dexValue = sumVenueMetric(markets.totals.dex, metric)
	return (
		<MetricSection label={label} tooltip={tooltip} value={formatCurrency(totalValue)}>
			<SubMetricSection label="CEX" value={cexValue == null ? 'N/A' : formatCurrency(cexValue)}>
				<MarketsCategoryBreakdown totals={markets.totals.cex} metric={metric} />
			</SubMetricSection>
			<SubMetricSection label="DEX" value={dexValue == null ? 'N/A' : formatCurrency(dexValue)}>
				<MarketsCategoryBreakdown totals={markets.totals.dex} metric={metric} />
			</SubMetricSection>
		</MetricSection>
	)
}

function TokenMetrics({ overview }: { overview: TokenOverviewData }) {
	const totalRaised = getTotalRaisedAmount(overview.raises)
	const { data: markets } = useQuery({
		queryKey: ['token-markets', overview.symbol],
		queryFn: () => fetchTokenMarkets(overview.symbol),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(overview.symbol)
	})
	const marketsHasVolume = markets != null && (markets.total_volume_24h ?? 0) > 0
	const marketsHasOi = markets != null && (markets.total_oi_usd ?? 0) > 0

	return (
		<div className="flex flex-1 flex-col gap-2">
			<h2 className="font-semibold" id="token-key-metrics">
				Key Metrics
			</h2>
			<div className="flex flex-col">
				{overview.marketData.mcap != null ? (
					<MetricRow label="Market Cap" tooltip={MARKET_CAP_TOOLTIP} value={formatCurrency(overview.marketData.mcap)} />
				) : null}
				{overview.marketData.fdv != null ? (
					<MetricRow
						label="Fully Diluted Valuation"
						tooltip={FDV_TOOLTIP}
						value={formatCurrency(overview.marketData.fdv)}
					/>
				) : null}
				{overview.marketData.circulatingSupply != null ? (
					<MetricRow
						label="Circ. Supply"
						tooltip={CIRCULATING_SUPPLY_TOOLTIP}
						value={formatSupply(overview.marketData.circulatingSupply, overview.symbol)}
					/>
				) : null}
				{overview.marketData.maxSupply != null ? (
					<MetricRow
						label="Max Supply"
						tooltip={MAX_SUPPLY_TOOLTIP}
						value={formatSupply(overview.marketData.maxSupply, overview.symbol)}
					/>
				) : null}
				{overview.outstandingFDV != null ? (
					<MetricRow
						label="Outstanding FDV"
						tooltip={OUTSTANDING_FDV_TOOLTIP}
						value={formatCurrency(overview.outstandingFDV)}
					/>
				) : null}
				{marketsHasVolume && markets ? (
					<MarketsMetricSection
						label="Volume 24h"
						tooltip={VOLUME_24H_TOOLTIP}
						totalValue={markets.total_volume_24h ?? null}
						markets={markets}
						metric="volume"
					/>
				) : overview.marketData.volume24h.total != null ||
				  overview.marketData.volume24h.cex != null ||
				  overview.marketData.volume24h.dex != null ? (
					<MetricSection
						label="Volume 24h"
						tooltip={VOLUME_24H_TOOLTIP}
						value={formatCurrency(overview.marketData.volume24h.total)}
					>
						{overview.marketData.volume24h.cex != null ? (
							<SubMetricRow label="CEX Volume" value={formatCurrency(overview.marketData.volume24h.cex)} />
						) : null}
						{overview.marketData.volume24h.dex != null ? (
							<SubMetricRow label="DEX Volume" value={formatCurrency(overview.marketData.volume24h.dex)} />
						) : null}
					</MetricSection>
				) : null}
				{marketsHasOi && markets ? (
					<MarketsMetricSection
						label="Open Interest"
						tooltip={OPEN_INTEREST_TOOLTIP}
						totalValue={markets.total_oi_usd ?? null}
						markets={markets}
						metric="oi"
					/>
				) : null}
				{overview.tokenLiquidity ? (
					<MetricSection
						label="Token Liquidity"
						tooltip={LIQUIDITY_TOOLTIP}
						value={formatCurrency(overview.tokenLiquidity.total)}
					>
						{overview.tokenLiquidity.pools.slice(0, 6).map(([protocol, chain, value]) => (
							<SubMetricRow
								key={`${protocol}-${chain}`}
								label={`${protocol} · ${chain}`}
								value={formatCurrency(value)}
							/>
						))}
					</MetricSection>
				) : null}
				{overview.treasury ? (
					<MetricSection label="Treasury" tooltip={TREASURY_TOOLTIP} value={formatCurrency(overview.treasury.total)}>
						{overview.treasury.majors != null ? (
							<SubMetricRow label="Majors" tooltip="BTC, ETH" value={formatCurrency(overview.treasury.majors)} />
						) : null}
						{overview.treasury.stablecoins != null ? (
							<SubMetricRow label="Stablecoins" value={formatCurrency(overview.treasury.stablecoins)} />
						) : null}
						{overview.treasury.ownTokens != null ? (
							<SubMetricRow label="Own Tokens" value={formatCurrency(overview.treasury.ownTokens)} />
						) : null}
						{overview.treasury.others != null ? (
							<SubMetricRow label="Others" value={formatCurrency(overview.treasury.others)} />
						) : null}
					</MetricSection>
				) : null}
				{overview.raises?.length ? (
					<MetricSection label="Total Raised" value={formatRaiseAmount(totalRaised)}>
						{overview.raises.map((raise) => (
							<SubMetricRow
								key={`${raise.date}-${raise.round ?? 'raise'}`}
								label={
									raise.round
										? `${raise.round} · ${formatDateLabel(raise.date) ?? 'Unknown date'}`
										: (formatDateLabel(raise.date) ?? 'Unknown date')
								}
								value={formatRaiseAmount(raise.amount)}
							/>
						))}
					</MetricSection>
				) : null}
			</div>
		</div>
	)
}

function TokenChartPanel({ overview, geckoId }: { overview: TokenOverviewData; geckoId: string | null }) {
	const router = useRouter()
	const [isThemeDark] = useDarkModeManager()
	const isClient = useIsClient()
	const availableCharts = useMemo(
		() =>
			TOKEN_OVERVIEW_CHART_ORDER.filter((label) =>
				geckoId
					? label !== 'Token Price' || (overview.rawChartData[label]?.length ?? 0) > 0
					: (overview.rawChartData[label]?.length ?? 0) > 0
			),
		[geckoId, overview.rawChartData]
	)
	const defaultCharts = useMemo(() => {
		const defaultCharts = TOKEN_OVERVIEW_DEFAULT_CHARTS.filter(
			(label) => (overview.rawChartData[label]?.length ?? 0) > 0
		)
		return defaultCharts.length > 0 ? defaultCharts : availableCharts.slice(0, 1)
	}, [availableCharts, overview.rawChartData])
	const groupBy = normalizeTokenOverviewChartGrouping(
		readSingleQueryValue(router.query[TOKEN_OVERVIEW_CHART_GROUP_QUERY_KEY])
	)
	const selectedChartsQuery = router.query[TOKEN_OVERVIEW_CHART_QUERY_KEY] as string | string[] | undefined
	const activeCharts = useMemo(() => {
		if (selectedChartsQuery === 'None') {
			return []
		}

		const availableChartsSet = new Set(availableCharts)
		const queryCharts = toNonEmptyArrayParam(selectedChartsQuery).filter(
			(chart): chart is TokenOverviewChartLabel => isTokenOverviewChartLabel(chart) && availableChartsSet.has(chart)
		)

		if (selectedChartsQuery != null) {
			return queryCharts.length > 0 ? queryCharts : defaultCharts
		}

		return defaultCharts
	}, [availableCharts, defaultCharts, selectedChartsQuery])
	const metricsDialogStore = Ariakit.useDialogStore()
	const [metricsSearchValue, setMetricsSearchValue] = useState('')
	const deferredMetricsSearchValue = useDeferredValue(metricsSearchValue)
	const { rawChartData, isLoading } = useFetchTokenOverviewChartData({
		geckoId,
		overview,
		activeCharts,
		enabled: isClient
	})
	const displayedChartData = useMemo(
		() =>
			buildDisplayedTokenChartData({
				rawChartData,
				activeCharts,
				groupBy
			}),
		[rawChartData, activeCharts, groupBy]
	)
	const pendingCharts = useMemo(
		() => activeCharts.filter((chart) => !displayedChartData[chart]?.length),
		[activeCharts, displayedChartData]
	)
	let hasChartData = false
	for (const _chart in displayedChartData) {
		hasChartData = true
		break
	}
	const shouldWaitForClient = !isClient && geckoId != null && pendingCharts.length > 0
	const showLoadingState = isClient && geckoId != null && pendingCharts.length > 0 && isLoading
	const loadingLabel =
		pendingCharts.length === 1 ? getChartLabel(pendingCharts[0], overview.symbol) : `${pendingCharts.length} metrics`
	const filteredMetricOptions = useMemo(() => {
		const options = availableCharts.map((chart) => ({
			id: chart,
			label: getChartLabel(chart, overview.symbol),
			active: activeCharts.includes(chart)
		}))

		if (!deferredMetricsSearchValue) return options

		return matchSorter(options, deferredMetricsSearchValue, {
			keys: ['label', 'id'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [activeCharts, availableCharts, deferredMetricsSearchValue, overview.symbol])

	const setGroupBy = (nextGroupBy: LowercaseDwmcGrouping) => {
		void pushShallowQuery(router, {
			[TOKEN_OVERVIEW_CHART_GROUP_QUERY_KEY]: nextGroupBy === 'daily' ? undefined : nextGroupBy
		})
	}

	const setActiveCharts = (nextCharts: TokenOverviewChartLabel[]) => {
		const availableChartsSet = new Set(availableCharts)
		const normalizedCharts = nextCharts.filter(
			(chart, index, charts) => availableChartsSet.has(chart) && charts.indexOf(chart) === index
		)

		void pushShallowQuery(router, {
			[TOKEN_OVERVIEW_CHART_QUERY_KEY]:
				normalizedCharts.length === 0
					? 'None'
					: areTokenOverviewChartsEqual(normalizedCharts, defaultCharts)
						? undefined
						: normalizedCharts
		})
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				{availableCharts.length > 0 ? (
					<Ariakit.DialogProvider store={metricsDialogStore}>
						<Ariakit.DialogDisclosure className="flex shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-white px-2 py-1 font-normal hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) dark:bg-[#181A1C]">
							<span>Add Metrics</span>
							<Icon name="plus" className="h-3.5 w-3.5" />
						</Ariakit.DialogDisclosure>
						<Ariakit.Dialog className="dialog gap-3 max-sm:drawer sm:w-full" unmountOnHide>
							<span className="flex items-center justify-between gap-1">
								<Ariakit.DialogHeading className="text-2xl font-bold">Add metrics to chart</Ariakit.DialogHeading>
								<Ariakit.DialogDismiss aria-label="Close dialog" className="ml-auto p-2 opacity-50">
									<Icon name="x" aria-hidden="true" className="h-5 w-5" />
								</Ariakit.DialogDismiss>
							</span>

							<label className="relative">
								<span className="sr-only">Search metrics</span>
								<Icon
									name="search"
									height={16}
									width={16}
									className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
								/>
								<input
									type="text"
									name="search"
									inputMode="search"
									placeholder="Search..."
									value={metricsSearchValue}
									className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-base text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
									onInput={(e) => setMetricsSearchValue(e.currentTarget.value)}
								/>
							</label>

							<div className="flex flex-wrap gap-2">
								{filteredMetricOptions.map((option) => (
									<button
										key={`token-chart-option-${option.id}`}
										type="button"
										aria-label={`${option.active ? 'Remove' : 'Add'} ${option.label}`}
										onClick={() => {
											setActiveCharts(
												activeCharts.includes(option.id)
													? activeCharts.filter((value) => value !== option.id)
													: [...activeCharts, option.id]
											)
											metricsDialogStore.toggle()
										}}
										data-active={option.active}
										className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>{option.label}</span>
										{option.active ? (
											<Icon name="x" aria-hidden="true" className="h-3.5 w-3.5" />
										) : (
											<Icon name="plus" aria-hidden="true" className="h-3.5 w-3.5" />
										)}
									</button>
								))}
								{filteredMetricOptions.length === 0 ? (
									<p className="py-2 text-sm text-(--text-tertiary)">No metrics found.</p>
								) : null}
							</div>
						</Ariakit.Dialog>
					</Ariakit.DialogProvider>
				) : null}
				{activeCharts.map((chart) => (
					<button
						key={chart}
						type="button"
						aria-label={`Remove ${getChartLabel(chart, overview.symbol)}`}
						onClick={() => setActiveCharts(activeCharts.filter((value) => value !== chart))}
						className="flex items-center gap-1 rounded-full border-2 px-2 py-1 text-xs"
						style={{ borderColor: TOKEN_OVERVIEW_CHART_COLORS[chart] }}
					>
						<span>{getChartLabel(chart, overview.symbol)}</span>
						<Icon name="x" aria-hidden="true" className="h-3.5 w-3.5" />
					</button>
				))}
				<div className="ml-auto">
					<ChartGroupingSelector value={groupBy} setValue={setGroupBy} options={DWMC_GROUPING_OPTIONS_LOWERCASE} />
				</div>
			</div>
			<div className="relative flex min-h-[360px] flex-col">
				{shouldWaitForClient ? null : showLoadingState ? (
					<p className="my-auto flex min-h-[360px] items-center justify-center gap-1 text-center text-xs">
						fetching {loadingLabel}
						<LoadingDots />
					</p>
				) : hasChartData ? (
					<DeferredProtocolChart
						key={`${groupBy}:${activeCharts.join('|')}`}
						chartData={displayedChartData}
						chartColors={TOKEN_OVERVIEW_CHART_COLORS}
						isThemeDark={isThemeDark}
						valueSymbol="$"
						groupBy={groupBy}
						hallmarks={null}
						rangeHallmarks={null}
					/>
				) : (
					<p className="m-auto max-w-sm text-center text-sm text-(--text-label)">
						{geckoId
							? activeCharts.length > 0
								? 'Chart unavailable for this token right now.'
								: 'Select metrics to chart.'
							: 'Chart unavailable without CoinGecko market data.'}
					</p>
				)}
			</div>
		</div>
	)
}

export function TokenOverviewSection({
	overview,
	geckoId,
	logo
}: {
	overview: TokenOverviewData
	geckoId: string | null
	logo?: string | null
}) {
	return (
		<section className="scroll-mt-24" id="token-overview">
			<h2 className="sr-only">Overview</h2>
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				<div className="col-span-1 flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[360px]">
					<TokenPageHero overview={overview} logo={logo} />
					<TokenMetrics overview={overview} />
				</div>
				<div className="col-span-1 grid grid-cols-2 gap-2 xl:col-[2/-1]">
					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
						<TokenChartPanel overview={overview} geckoId={geckoId} />
					</div>
				</div>
			</div>
		</section>
	)
}
