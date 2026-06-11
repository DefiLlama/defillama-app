import { fetchLlamaConfig } from '~/api'
import { fetchCoinGeckoCoinById } from '~/api/coingecko'
import type { CoinGeckoCoinDetailResult } from '~/api/coingecko.types'
import { feesOptions, tvlOptions } from '~/components/Filters/options'
import { REV_PROTOCOLS, TRADFI_API } from '~/constants'
import { fetchCexVolume } from '~/containers/AdapterMetrics/api'
import { fetchAdapterChainMetrics, fetchAdapterProtocolMetrics } from '~/containers/AdapterMetrics/api'
import type { IAdapterChainMetrics, IAdapterProtocolMetrics } from '~/containers/AdapterMetrics/api.types'
import { fetchChainsAssets } from '~/containers/BridgedTVL/api'
import type { RawChainAsset } from '~/containers/BridgedTVL/api.types'
import { getBridgeChainNetInflows } from '~/containers/Bridges/queries.server'
import { fetchChainChart } from '~/containers/Chains/api'
import { getETFData } from '~/containers/ETF/queries'
import { getChainIncentivesFromAggregatedEmissions } from '~/containers/Incentives/queries'
import type { ChainIncentivesSummary } from '~/containers/Incentives/types'
import { getProtocolsByChain } from '~/containers/ProtocolRankings/queries.server'
import { fetchRaises } from '~/containers/Raises/api'
import type { RawRaisesResponse } from '~/containers/Raises/api.types'
import { fetchRWAStats } from '~/containers/RWA/api'
import type { IRWAStatsResponse } from '~/containers/RWA/api.types'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import type { StablecoinsListResponse } from '~/containers/Stablecoins/api.types'
import { getStablecoinChainMcapSummary } from '~/containers/Stablecoins/queries.server'
import { fetchTreasuries } from '~/containers/Treasuries/api'
import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import {
	FEE_EXTRA_DATA_TYPES_BY_SETTING,
	FEE_EXTRA_TOTAL_FIELD_BY_SETTING,
	FEE_EXTRA_TOTAL_KEYS,
	hasAnyFeeExtraTotals,
	type FeeExtraSetting,
	type FeeExtraMetric,
	type FeeExtraTotals
} from '~/metrics/feeExtras'
import { feeRevenueMetrics, shouldFetchChainOverviewFeeRevenueMetric } from '~/metrics/feesRevenue'
import { getPercentChange, getPrevTvlFromChart, lastDayOfWeek, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { tokenIconUrl } from '~/utils/icons'
import type {
	ICategoriesAndTags,
	IChainMetadata,
	IProtocolMetadata,
	ProtocolLlamaswapMetadata
} from '~/utils/metadata/types'
import type { RoutePhaseTimer } from '~/utils/perf'
import type { ChainChartLabels } from './constants'
import { fetchHomepageUnlocksSummary } from './homepageUnlocks.server'
import type { IChainOverviewData, ILiteChart } from './types'
import { formatChainAssets } from './utils'

function computeTvlChartSummary(chart: Array<[number, number]>): {
	totalValueUSD: number | null
	tvlPrevDay: number | null
	valueChange24hUSD: number | null
	change24h: number | null
} {
	const lastValue = getPrevTvlFromChart(chart, 0)
	const tvlPrevDay = getPrevTvlFromChart(chart, 1)
	const valueChange24hUSD = lastValue != null && tvlPrevDay != null ? lastValue - tvlPrevDay : null
	const change24h = lastValue != null && tvlPrevDay != null ? getPercentChange(lastValue, tvlPrevDay) : null

	return { totalValueUSD: lastValue, tvlPrevDay, valueChange24hUSD, change24h }
}

export function shouldFetchChainDexs({
	chain,
	currentChainMetadata,
	categoriesAndTagsMetadata
}: {
	chain: string
	currentChainMetadata: IChainMetadata
	categoriesAndTagsMetadata?: ICategoriesAndTags
}): boolean {
	if (!currentChainMetadata.dexs) return false
	if (chain === 'All' || currentChainMetadata.id === 'all') return true

	return categoriesAndTagsMetadata?.configs?.Dexs?.chains?.includes(currentChainMetadata.id) ?? false
}

export function shouldFetchChainPerps({
	chain,
	currentChainMetadata,
	categoriesAndTagsMetadata
}: {
	chain: string
	currentChainMetadata: IChainMetadata
	categoriesAndTagsMetadata?: ICategoriesAndTags
}): boolean {
	if (!currentChainMetadata.perps) return false
	if (chain === 'All' || currentChainMetadata.id === 'all') return true

	return categoriesAndTagsMetadata?.configs?.Derivatives?.chains?.includes(currentChainMetadata.id) ?? false
}

export function getRwaActiveMcapForChain(rwaStats: IRWAStatsResponse | null, chainName: string): number | null {
	const exactMatch = rwaStats?.byChain?.[chainName]
	if (exactMatch) return exactMatch.base.activeMcap || null

	const chainSlug = rwaSlug(chainName)
	for (const chain in rwaStats?.byChain ?? {}) {
		if (rwaSlug(chain) !== chainSlug) continue
		return rwaStats.byChain[chain].base.activeMcap || null
	}

	return null
}

export function hasRwaActiveMcapChain(rwaChains: string[] | null | undefined, chainName: string): boolean {
	const chainSlug = rwaSlug(chainName)
	for (const chain of rwaChains ?? []) {
		if (rwaSlug(chain) === chainSlug) return true
	}
	return false
}

function toFeeExtraTotals(data: FeeExtraTotals | null | undefined): FeeExtraTotals | null {
	if (!data || !hasAnyFeeExtraTotals(data)) return null
	const totals: FeeExtraTotals = {}
	for (const key of FEE_EXTRA_TOTAL_KEYS) {
		totals[key] = data[key] ?? null
	}
	return totals
}

async function fetchChainNativeFeeExtraTotals({
	chain,
	dataType
}: {
	chain: string
	dataType: FeeExtraMetric
}): Promise<FeeExtraTotals | null> {
	if (chain !== 'All') {
		return fetchAdapterProtocolMetrics({ adapterType: 'fees', protocol: chain, dataType })
			.then(toFeeExtraTotals)
			.catch(() => null)
	}

	return fetchAdapterChainMetrics({ adapterType: 'fees', chain: 'All', dataType })
		.then((data) => {
			const totals: FeeExtraTotals = {}

			for (const protocol of data.protocols) {
				if (protocol.protocolType !== 'chain') continue
				for (const key of FEE_EXTRA_TOTAL_KEYS) {
					totals[key] = (totals[key] ?? 0) + (protocol[key] ?? 0)
				}
			}

			return toFeeExtraTotals(totals)
		})
		.catch(() => null)
}

export function getChainOverviewMetricFilterOptions({
	chartData,
	chainFees,
	chainRevenue,
	appRevenue,
	appFees,
	feeExtras
}: {
	chartData: ILiteChart | null | undefined
	chainFees: { total24h: number | null } | null | undefined
	chainRevenue: { total24h: number | null } | null | undefined
	appRevenue: { total24h: number | null } | null | undefined
	appFees: { total24h: number | null } | null | undefined
	feeExtras: IChainOverviewData['feeExtras']
}) {
	const hasVisibleChainNativeFeeMetric = chainFees?.total24h != null || chainRevenue?.total24h != null
	const hasVisibleAppFeeMetric = appRevenue?.total24h != null || appFees?.total24h != null
	const hasFeeExtraOption = (setting: FeeExtraSetting) => {
		const totalsKey = FEE_EXTRA_TOTAL_FIELD_BY_SETTING[setting]
		return (
			(hasVisibleChainNativeFeeMetric && hasAnyFeeExtraTotals(feeExtras.chainNative[totalsKey])) ||
			(hasVisibleAppFeeMetric && hasAnyFeeExtraTotals(feeExtras.app[totalsKey]))
		)
	}

	return [
		...tvlOptions.filter((o) => chartData?.[o.key]?.length),
		...feesOptions.filter((option) => hasFeeExtraOption(option.key))
	]
}

export async function getChainOverviewData({
	chain,
	chainMetadata,
	protocolMetadata,
	categoriesAndTagsMetadata,
	protocolLlamaswapDataset = null,
	rwaChainsForActiveMcap = null,
	phaseTimer
}: {
	chain: string
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	categoriesAndTagsMetadata: ICategoriesAndTags
	protocolLlamaswapDataset?: ProtocolLlamaswapMetadata | null
	rwaChainsForActiveMcap?: string[] | null
	phaseTimer?: RoutePhaseTimer
}): Promise<IChainOverviewData | null> {
	const currentChainMetadata: IChainMetadata =
		chain === 'All'
			? { name: 'All', stablecoins: true, fees: true, dexs: true, perps: true, id: 'all' }
			: chainMetadata[slug(chain)]

	if (!currentChainMetadata) return null

	const shouldFetchDexs = shouldFetchChainDexs({ chain, currentChainMetadata, categoriesAndTagsMetadata })
	const shouldFetchPerps = shouldFetchChainPerps({ chain, currentChainMetadata, categoriesAndTagsMetadata })
	const shouldFetchRwaActiveMcap =
		chain !== 'All' && hasRwaActiveMcapChain(rwaChainsForActiveMcap, currentChainMetadata.name)
	function timePhase<T>(label: string, run: () => T | Promise<T>): Promise<Awaited<T>> {
		return phaseTimer ? phaseTimer.time(label, run) : (Promise.resolve().then(run) as Promise<Awaited<T>>)
	}

	const chainFeesMetric = feeRevenueMetrics.chainFees
	const chainRevenueMetric = feeRevenueMetrics.chainRevenue
	const appFeesMetric = feeRevenueMetrics.appFees
	const appRevenueMetric = feeRevenueMetrics.appRevenue
	const shouldFetchChainFeesMetric = shouldFetchChainOverviewFeeRevenueMetric({
		metric: chainFeesMetric,
		metadata: currentChainMetadata,
		chain
	})
	const shouldFetchChainRevenueMetric = shouldFetchChainOverviewFeeRevenueMetric({
		metric: chainRevenueMetric,
		metadata: currentChainMetadata,
		chain
	})
	const shouldFetchAppFeesMetric = shouldFetchChainOverviewFeeRevenueMetric({
		metric: appFeesMetric,
		metadata: currentChainMetadata,
		chain
	})
	const shouldFetchAppRevenueMetric = shouldFetchChainOverviewFeeRevenueMetric({
		metric: appRevenueMetric,
		metadata: currentChainMetadata,
		chain
	})
	const shouldFetchChainNativeFeeExtras = shouldFetchChainFeesMetric || shouldFetchChainRevenueMetric
	const shouldFetchAppFeeExtras = shouldFetchAppFeesMetric || shouldFetchAppRevenueMetric

	try {
		const [
			chartData,
			{ protocols, chains, fees, dexs },
			stablecoins,
			inflowsData,
			activeUsers,
			transactions,
			newUsers,
			raisesData,
			treasuriesData,
			cgData,
			nftVolumesData,
			chainAssets,
			appRevenue,
			appFees,
			chainFees,
			chainRevenue,
			chainNativeBribes,
			chainNativeTokenTax,
			appBribes,
			appTokenTax,
			perps,
			cexVolume,
			etfData,
			homepageUnlocks,
			chainIncentives,
			datInflows,
			stablecoinsData,
			chainStablecoins,
			rwaStats
		]: [
			ILiteChart,
			Awaited<ReturnType<typeof getProtocolsByChain>>,
			Awaited<ReturnType<typeof getStablecoinChainMcapSummary>>,
			{ netInflows: number | null } | null,
			number | null,
			number | null,
			number | null,
			RawRaisesResponse,
			RawTreasuriesResponse | null,
			CoinGeckoCoinDetailResult,
			Record<string, number> | null,
			RawChainAsset | null,
			IAdapterChainMetrics | null,
			IAdapterChainMetrics | null,
			IAdapterProtocolMetrics | null,
			IAdapterProtocolMetrics | null,
			FeeExtraTotals | null,
			FeeExtraTotals | null,
			FeeExtraTotals | null,
			FeeExtraTotals | null,
			IAdapterChainMetrics | null,
			number | null,
			Array<[number, number]> | null,
			IChainOverviewData['unlocks'],
			ChainIncentivesSummary | null,
			{ chart: Array<[number, number]>; total30d: number } | null,
			StablecoinsListResponse | null,
			Array<string> | null,
			IRWAStatsResponse | null
		] = await Promise.all([
			timePhase('chain_chart', () =>
				fetchChainChart<ILiteChart>(chain === 'All' ? undefined : currentChainMetadata.name).catch((err) => {
					console.log(err)
					return {
						tvl: [],
						staking: [],
						borrowed: [],
						pool2: [],
						vesting: [],
						offers: [],
						doublecounted: [],
						liquidstaking: [],
						dcAndLsOverlap: []
					}
				})
			),
			timePhase('protocols_by_chain', () =>
				getProtocolsByChain({ chain, chainMetadata, protocolMetadata, protocolLlamaswapDataset, shouldFetchDexs })
			),
			timePhase('stablecoins', () =>
				currentChainMetadata.stablecoins
					? getStablecoinChainMcapSummary(chain === 'All' ? null : currentChainMetadata.name)
					: Promise.resolve(null)
			),
			timePhase('inflows', () =>
				!currentChainMetadata.inflows ? Promise.resolve(null) : getBridgeChainNetInflows(currentChainMetadata.name)
			),
			timePhase('active_users', () =>
				!currentChainMetadata.chainActiveUsers
					? Promise.resolve(null)
					: fetchAdapterChainMetrics({
							chain: currentChainMetadata.name,
							adapterType: 'active-users'
						}).then((data) => data?.total24h ?? null)
			),
			timePhase('transactions', () =>
				!currentChainMetadata.txCount
					? Promise.resolve(null)
					: fetchAdapterChainMetrics({
							chain: currentChainMetadata.name,
							adapterType: 'active-users',
							dataType: 'dailyTransactionsCount'
						}).then((data) => data?.total24h ?? null)
			),
			timePhase('new_users', () =>
				!currentChainMetadata.chainNewUsers
					? Promise.resolve(null)
					: fetchAdapterChainMetrics({
							chain: currentChainMetadata.name,
							adapterType: 'new-users'
						}).then((data) => data?.total24h ?? null)
			),
			timePhase('raises', () => fetchRaises()),
			timePhase('treasuries', () => (chain === 'All' ? Promise.resolve(null) : fetchTreasuries())),
			timePhase('coingecko', () =>
				currentChainMetadata.gecko_id
					? fetchCoinGeckoCoinById(currentChainMetadata.gecko_id)
					: Promise.resolve({} as CoinGeckoCoinDetailResult)
			),
			timePhase('nft_volumes', () =>
				chain && chain !== 'All'
					? fetchJson<Record<string, number>>(`https://defillama-datasets.llama.fi/temp/chainNfts`)
					: Promise.resolve(null)
			),
			timePhase('chain_assets', () =>
				fetchChainsAssets()
					.then((assets) => (chain !== 'All' ? (assets[currentChainMetadata.name] ?? null) : null))
					.catch(() => null)
			),
			timePhase(appRevenueMetric.chainOverview.phase, () =>
				shouldFetchAppRevenueMetric
					? fetchAdapterChainMetrics({
							adapterType: appRevenueMetric.chainOverview.source.adapterType,
							chain: currentChainMetadata.name,
							dataType: appRevenueMetric.chainOverview.source.dataType
						})
					: Promise.resolve(null)
			),
			timePhase(appFeesMetric.chainOverview.phase, () =>
				shouldFetchAppFeesMetric
					? fetchAdapterChainMetrics({
							adapterType: appFeesMetric.chainOverview.source.adapterType,
							chain: currentChainMetadata.name,
							dataType: appFeesMetric.chainOverview.source.dataType
						})
					: Promise.resolve(null)
			),
			timePhase(chainFeesMetric.chainOverview.phase, () =>
				shouldFetchChainFeesMetric
					? fetchAdapterProtocolMetrics({
							adapterType: chainFeesMetric.chainOverview.source.adapterType,
							protocol: currentChainMetadata.name
						})
					: Promise.resolve(null)
			),
			timePhase(chainRevenueMetric.chainOverview.phase, () =>
				shouldFetchChainRevenueMetric
					? fetchAdapterProtocolMetrics({
							adapterType: chainRevenueMetric.chainOverview.source.adapterType,
							protocol: currentChainMetadata.name,
							dataType: chainRevenueMetric.chainOverview.source.dataType
						})
					: Promise.resolve(null)
			),
			timePhase('chain_native_bribes', () =>
				shouldFetchChainNativeFeeExtras
					? fetchChainNativeFeeExtraTotals({
							chain: currentChainMetadata.name,
							dataType: FEE_EXTRA_DATA_TYPES_BY_SETTING.bribes
						})
					: Promise.resolve(null)
			),
			timePhase('chain_native_token_tax', () =>
				shouldFetchChainNativeFeeExtras
					? fetchChainNativeFeeExtraTotals({
							chain: currentChainMetadata.name,
							dataType: FEE_EXTRA_DATA_TYPES_BY_SETTING.tokentax
						})
					: Promise.resolve(null)
			),
			timePhase('app_bribes', () =>
				shouldFetchAppFeeExtras
					? fetchAdapterChainMetrics({
							adapterType: 'fees',
							chain: currentChainMetadata.name,
							dataType: FEE_EXTRA_DATA_TYPES_BY_SETTING.bribes
						})
							.then(toFeeExtraTotals)
							.catch(() => null)
					: Promise.resolve(null)
			),
			timePhase('app_token_tax', () =>
				shouldFetchAppFeeExtras
					? fetchAdapterChainMetrics({
							adapterType: 'fees',
							chain: currentChainMetadata.name,
							dataType: FEE_EXTRA_DATA_TYPES_BY_SETTING.tokentax
						})
							.then(toFeeExtraTotals)
							.catch(() => null)
					: Promise.resolve(null)
			),
			timePhase('perps', () =>
				shouldFetchPerps
					? fetchAdapterChainMetrics({
							adapterType: 'derivatives',
							chain: currentChainMetadata.name
						})
					: Promise.resolve(null)
			),
			timePhase('cex_volume', () => fetchCexVolume()),
			timePhase('etf_data', () =>
				chain === 'All'
					? getETFData()
							.then((data) => {
								const recentFlows = Object.entries(data.flows)
									.slice(-14)
									.map((item) => [
										+item[0] * 1000,
										Object.entries(item[1]).reduce((acc, curr) => {
											if (curr[0] !== 'date') {
												acc += curr[1]
											}
											return acc
										}, 0)
									])
								return recentFlows
							})
							.catch(() => null)
					: Promise.resolve(null)
			),
			timePhase('homepage_unlocks', () => (chain === 'All' ? fetchHomepageUnlocksSummary() : Promise.resolve(null))),
			timePhase('chain_incentives', () =>
				currentChainMetadata.incentives && chain !== 'All'
					? getChainIncentivesFromAggregatedEmissions(currentChainMetadata.name)
					: Promise.resolve(null)
			),
			timePhase('dat_inflows', () => (chain === 'All' ? getDATInflows() : Promise.resolve(null))),
			timePhase('stablecoin_assets', () =>
				chain !== 'All' ? fetchStablecoinAssetsApi().catch(() => null) : Promise.resolve(null)
			),
			timePhase('chain_stablecoins', () =>
				chain !== 'All'
					? fetchLlamaConfig()
							.then((data) => data.chainCoingeckoIds?.[currentChainMetadata.name]?.stablecoins ?? null)
							.catch(() => null)
					: Promise.resolve(null)
			),
			timePhase('rwa_stats', () =>
				shouldFetchRwaActiveMcap ? fetchRWAStats().catch(() => null) : Promise.resolve(null)
			)
		])
		const stopOverviewTransform = phaseTimer?.start('overview_transform')

		const {
			tvl = [],
			staking = [],
			borrowed = [],
			pool2 = [],
			vesting = [],
			offers = [],
			doublecounted = [],
			liquidstaking = [],
			dcAndLsOverlap = []
		} = chartData || {}

		const feeExtras = {
			chainNative: {
				bribes: chainNativeBribes,
				tokenTax: chainNativeTokenTax
			},
			app: {
				bribes: appBribes,
				tokenTax: appTokenTax
			}
		}
		const tvlAndFeesOptions = getChainOverviewMetricFilterOptions({
			chartData,
			chainFees,
			chainRevenue,
			appRevenue,
			appFees,
			feeExtras
		})
		const extraTvlCharts = {
			staking: {},
			borrowed: {},
			pool2: {},
			vesting: {},
			offers: {},
			doublecounted: {},
			liquidstaking: {},
			dcAndLsOverlap: {}
		}
		for (const [date, totalLiquidityUSD] of staking) {
			extraTvlCharts.staking[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}
		for (const [date, totalLiquidityUSD] of borrowed) {
			extraTvlCharts.borrowed[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}
		for (const [date, totalLiquidityUSD] of pool2) {
			extraTvlCharts.pool2[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}
		for (const [date, totalLiquidityUSD] of vesting) {
			extraTvlCharts.vesting[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}
		for (const [date, totalLiquidityUSD] of offers) {
			extraTvlCharts.offers[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}
		for (const [date, totalLiquidityUSD] of doublecounted) {
			extraTvlCharts.doublecounted[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}
		for (const [date, totalLiquidityUSD] of liquidstaking) {
			extraTvlCharts.liquidstaking[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}
		for (const [date, totalLiquidityUSD] of dcAndLsOverlap) {
			extraTvlCharts.dcAndLsOverlap[+date * 1e3] = Math.trunc(totalLiquidityUSD)
		}

		// by default we should not include liquidstaking and doublecounted in the tvl chart, but include overlapping tvl so you don't subtract twice
		const tvlChart = tvl.map(([date, totalLiquidityUSD]) => {
			let sum = Math.trunc(totalLiquidityUSD)
			if (extraTvlCharts['liquidstaking']?.[+date * 1e3]) {
				sum -= Math.trunc(extraTvlCharts['liquidstaking'][+date * 1e3])
			}
			if (extraTvlCharts['doublecounted']?.[+date * 1e3]) {
				sum -= Math.trunc(extraTvlCharts['doublecounted'][+date * 1e3])
			}
			if (extraTvlCharts['dcAndLsOverlap']?.[+date * 1e3]) {
				sum += Math.trunc(extraTvlCharts['dcAndLsOverlap'][+date * 1e3])
			}
			return [+date * 1e3, sum]
		}) as Array<[number, number]>

		// Pre-compute TVL summary to avoid client-side iteration
		const tvlChartSummary = computeTvlChartSummary(tvlChart)

		const chainRaises =
			raisesData?.raises?.filter((r) => r.defillamaId === `chain#${currentChainMetadata.name.toLowerCase()}`) ?? null

		const treasury =
			treasuriesData?.find(
				(t) =>
					t?.name?.toLowerCase().startsWith(`${currentChainMetadata.name.toLowerCase()}`) &&
					['Services', 'Chain', 'Foundation'].includes(t?.category)
			) ?? null

		const topProtocolsByFeesChart =
			fees?.protocols?.length > 0
				? (protocols
						.sort((a, b) => (b.fees?.total24h ?? 0) - (a.fees?.total24h ?? 0))
						.filter((a) => !!a.fees?.total24h)
						.slice(0, 14)
						.map((x) => [x.name, x.fees?.total24h ?? 0, tokenIconUrl(x.name)]) as Array<[string, number, string]>)
				: null

		const feesGenerated24h =
			fees?.protocols?.length > 0 ? fees.protocols.reduce((acc, curr) => (acc += curr.total24h || 0), 0) : null

		const chainRevProtocols = new Set(REV_PROTOCOLS[slug(currentChainMetadata.name)] ?? [])

		const chainREV =
			chainFees?.total24h == null && chainRevProtocols.size === 0
				? null
				: (chainFees?.total24h ?? 0) +
					(fees?.protocols?.reduce((acc, curr) => {
						if (chainRevProtocols.has(curr.slug)) {
							acc += curr.total24h || 0
						}
						return acc
					}, 0) ?? 0)

		const charts: ChainChartLabels[] = []

		if (chartData) {
			charts.push('TVL')
		}

		if (stablecoins?.mcap != null) {
			charts.push('Stablecoins Mcap')
		}
		if (chainFees?.total24h != null) {
			charts.push(chainFeesMetric.label)
		}
		if (chainRevenue?.total24h != null) {
			charts.push(chainRevenueMetric.label)
		}
		if (shouldFetchDexs && dexs?.total24h != null) {
			charts.push('DEXs Volume')
		}
		if (shouldFetchPerps && perps?.total24h != null) {
			charts.push('Perps Volume')
		}
		if (chainIncentives?.emissions24h != null) {
			charts.push('Token Incentives')
		}
		if (appRevenue?.total24h != null) {
			charts.push(appRevenueMetric.label)
		}
		if (appFees?.total24h != null) {
			charts.push(appFeesMetric.label)
		}

		if (chain !== 'All' && chainAssets != null) {
			charts.push('Bridged TVL')
		}

		if (currentChainMetadata.chainActiveUsers) {
			charts.push('Active Addresses')
		}
		if (currentChainMetadata.chainNewUsers) {
			charts.push('New Addresses')
		}
		if (currentChainMetadata.txCount) {
			charts.push('Transactions')
		}
		if (currentChainMetadata.gasUsed) {
			charts.push('Gas Used')
		}
		if (chain === 'All') {
			charts.push('Raises')
		}
		if (inflowsData?.netInflows != null && inflowsData.netInflows !== 0) {
			charts.push('Net Inflows')
		}
		if (chain !== 'All' && currentChainMetadata.gecko_id != null) {
			charts.push('Token Price')
		}
		if (chain !== 'All' && currentChainMetadata.gecko_id != null) {
			charts.push('Token Mcap')
		}
		if (chain !== 'All' && currentChainMetadata.gecko_id != null) {
			charts.push('Token Volume')
		}

		if (chain === 'All' && tvlChart.length === 0) {
			throw new Error('Missing chart data')
		}

		const rwaActiveMcap = shouldFetchRwaActiveMcap
			? getRwaActiveMcapForChain(rwaStats, currentChainMetadata.name)
			: null
		const descriptionMetrics = rwaActiveMcap != null ? [...charts, 'RWA Active Mcap'] : charts
		const isDataAvailable = charts.length > 0 || protocols.length > 0 || rwaActiveMcap != null

		const result: IChainOverviewData = {
			chain,
			metadata: currentChainMetadata,
			protocols,
			tvlChart,
			tvlChartSummary,
			extraTvlCharts,
			chainTokenInfo:
				chain !== 'All'
					? {
							gecko_id: currentChainMetadata.gecko_id ?? null,
							token_symbol: currentChainMetadata.tokenSymbol ?? null,
							current_price: cgData?.market_data?.current_price?.usd ?? null,
							market_cap: cgData?.market_data?.market_cap?.usd ?? null,
							fully_diluted_valuation: cgData?.market_data?.fully_diluted_valuation?.usd ?? null,
							llamaswapChains: currentChainMetadata.gecko_id
								? (protocolLlamaswapDataset?.[currentChainMetadata.gecko_id] ?? null)
								: null
						}
					: null,
			stablecoins,
			rwaActiveMcap,
			chainFees: {
				total24h: chainFees?.total24h ?? null,
				feesGenerated24h: feesGenerated24h,
				topProtocolsChart: topProtocolsByFeesChart?.length > 0 ? topProtocolsByFeesChart : null,
				totalREV24h: chainREV
			},
			chainRevenue: { total24h: chainRevenue?.total24h ?? null },
			feeExtras,
			appRevenue: { total24h: appRevenue?.total24h ?? null },
			appFees: { total24h: appFees?.total24h ?? null },
			dexs: {
				total24h: dexs?.total24h ?? null,
				total7d: dexs?.total7d ?? null,
				change_7dover7d: dexs?.change_7dover7d ?? null,
				dexsDominance:
					cexVolume && dexs?.total24h ? +((dexs.total24h / (cexVolume + dexs.total24h)) * 100).toFixed(2) : null,
				chart: dexs ? dexs.totalDataChart.slice(-14).map((x) => [x[0] * 1000, x[1]]) : null
			},
			perps: {
				total24h: perps?.total24h ?? null,
				total7d: perps?.total7d ?? null,
				change_7dover7d: perps?.change_7dover7d ?? null
			},
			users: { activeUsers, newUsers, transactions },
			inflows: inflowsData,
			treasury: treasury ? { tvl: treasury.tvl ?? null, tokenBreakdowns: treasury.tokenBreakdowns ?? null } : null,
			chainRaises: chainRaises ?? null,
			chainAssets: formatChainAssets(chainAssets),
			devMetrics: null,
			nfts:
				nftVolumesData && chain !== 'All' && nftVolumesData[currentChainMetadata.name.toLowerCase()]
					? { total24h: nftVolumesData[currentChainMetadata.name.toLowerCase()] }
					: null,
			etfs: etfData,
			allChains: [{ label: 'All', to: '/' }].concat(chains.map((c) => ({ label: c, to: `/chain/${slug(c)}` }))),
			unlocks: homepageUnlocks,
			chainIncentives: chainIncentives ?? {
				emissions24h: null,
				emissions7d: null,
				emissions30d: null
			},
			tvlAndFeesOptions,
			charts,
			description:
				currentChainMetadata.name === 'All'
					? 'Comprehensive overview of all metrics tracked on all chains, including TVL, Stablecoins Mcap, DEXs Volume, Perps Volume, protocols on all chains. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.'
					: descriptionMetrics.length > 0 && protocols.length > 0
						? `Comprehensive overview of all metrics tracked on ${currentChainMetadata.name}, including ${descriptionMetrics.join(', ')}, and protocols on ${currentChainMetadata.name}.`
						: descriptionMetrics.length > 0
							? `Comprehensive overview of all metrics tracked on ${currentChainMetadata.name}, including ${descriptionMetrics.join(', ')}.`
							: protocols.length > 0
								? `Comprehensive overview of all metrics tracked on ${currentChainMetadata.name}, including protocols on ${currentChainMetadata.name}.`
								: `Comprehensive overview of all metrics tracked on ${currentChainMetadata.name}`,
			isDataAvailable,
			datInflows: datInflows ?? null,
			chainStablecoins:
				chainStablecoins?.map((coin) => {
					const coinData = stablecoinsData?.peggedAssets?.find((c) => c.gecko_id === coin)
					return { name: coinData?.name ?? coin, url: `/stablecoin/${coin}`, symbol: coinData?.symbol ?? null }
				}) ?? null
		}
		stopOverviewTransform?.()
		return result
	} catch (error) {
		const msg = `Error fetching chainOverview:${chain} ${error instanceof Error ? error.message : 'Failed to fetch'}`
		const errorWithContext = new Error(msg, { cause: error })
		if (error instanceof Error && error.stack) {
			errorWithContext.stack = `${errorWithContext.stack}\nCaused by: ${error.stack}`
		}
		throw errorWithContext
	}
}

interface IDATInflow {
	flows: {
		[asset: string]: Array<[number, number, number, number, number, number]> // [timestamp, net, inflow, outflow, purchasePrice, usdValueOfPurchase]
	}
}

function getUTCTimestamp(timestamp: number) {
	// Round to nearest day boundary (midnight UTC)
	const msPerDay = 86400000 // 24 * 60 * 60 * 1000
	return Math.round(timestamp / msPerDay) * msPerDay
}

const getDATInflows = async () => {
	try {
		const data = await fetchJson<IDATInflow>(`${TRADFI_API}/institutions`)
		const weeklyInflows: Record<number, number> = {}

		let total30d = 0
		// Only keep inflows for the last 14 weeks (to match the chart window)
		const fourteenWeeksAgo = Date.now() - 14 * 7 * 24 * 60 * 60 * 1000

		for (const asset in data.flows) {
			for (const [date, _net, _inflow, _outflow, purchasePrice, usdValueOfPurchase] of data.flows[asset]) {
				const utcTimestamp = getUTCTimestamp(date)
				if (utcTimestamp < fourteenWeeksAgo) continue
				const finalDate = lastDayOfWeek(utcTimestamp / 1000) * 1000
				const usdValue = purchasePrice || usdValueOfPurchase || 0
				if (utcTimestamp >= Date.now() - 30 * 24 * 60 * 60 * 1000) {
					total30d += usdValue
				}
				weeklyInflows[finalDate] = (weeklyInflows[finalDate] || 0) + usdValue
			}
		}

		// Always end with the last day of the current week
		const mostRecentTimestamp = lastDayOfWeek(Date.now() / 1000) * 1000
		const oneWeekInMs = 7 * 24 * 60 * 60 * 1000
		const completeChart = []

		// Generate all 14 weekly timestamps ending with current week
		for (let i = 13; i >= 0; i--) {
			const timestamp = mostRecentTimestamp - i * oneWeekInMs
			const value = weeklyInflows[timestamp] ?? 0
			completeChart.push([timestamp, value])
		}

		return {
			chart: completeChart,
			total30d
		}
	} catch (error) {
		console.log('Error fetching DAT inflows:', error)
		return null
	}
}
