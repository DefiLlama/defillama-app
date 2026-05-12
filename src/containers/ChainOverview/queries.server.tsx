import { fetchCoinPrices, fetchLlamaConfig } from '~/api'
import { fetchCoinGeckoCoinById } from '~/api/coingecko'
import type { CoinGeckoCoinDetailResult } from '~/api/coingecko.types'
import { feesOptions, tvlOptions } from '~/components/Filters/options'
import type { ToggleOption } from '~/components/Filters/types'
import { REV_PROTOCOLS, TRADFI_API } from '~/constants'
import { fetchChainsAssets } from '~/containers/BridgedTVL/api'
import type { RawChainAsset } from '~/containers/BridgedTVL/api.types'
import { getBridgeChainNetInflows } from '~/containers/Bridges/queries.server'
import { fetchChainChart } from '~/containers/Chains/api'
import { fetchCexVolume } from '~/containers/DimensionAdapters/api'
import { fetchAdapterChainMetrics, fetchAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api'
import type { IAdapterChainMetrics, IAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api.types'
import { getAdapterChainOverview } from '~/containers/DimensionAdapters/queries'
import type { IAdapterChainOverview } from '~/containers/DimensionAdapters/types'
import { getETFData } from '~/containers/ETF/queries'
import {
	getChainIncentivesFromAggregatedEmissions,
	getProtocolEmissionsLookupFromAggregated
} from '~/containers/Incentives/queries'
import type { ChainIncentivesSummary, ProtocolEmissionsLookup } from '~/containers/Incentives/types'
import { fetchProtocols } from '~/containers/Protocols/api'
import type { ProtocolsResponse } from '~/containers/Protocols/api.types'
import { fetchRaises } from '~/containers/Raises/api'
import type { RawRaisesResponse } from '~/containers/Raises/api.types'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import type { StablecoinsListResponse } from '~/containers/Stablecoins/api.types'
import { getStablecoinChainMcapSummary } from '~/containers/Stablecoins/queries.server'
import { fetchTreasuries } from '~/containers/Treasuries/api'
import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import { getAllProtocolEmissions } from '~/containers/Unlocks/queries'
import type { ProtocolEmissionWithHistory } from '~/containers/Unlocks/types'
import { TVL_SETTINGS_KEYS_SET, type FeesSettingKey, type TvlSettingsKey } from '~/contexts/LocalStorage'
import { formatNum, getPercentChange, getPrevTvlFromChart, lastDayOfWeek, slug, getAnnualizedRatio } from '~/utils'
import { fetchJson } from '~/utils/async'
import { tokenIconUrl } from '~/utils/icons'
import type {
	ICategoriesAndTags,
	IChainMetadata,
	IProtocolMetadata,
	ProtocolLlamaswapMetadata
} from '~/utils/metadata/types'
import type { ChainChartLabels } from './constants'
import type { IChainOverviewData, IChildProtocol, ILiteChart, ILiteProtocol, IProtocol, TVL_TYPES } from './types'
import { formatChainAssets, toFilterProtocol, toStrikeTvl } from './utils'

type DimensionProtocolMetric = IAdapterChainMetrics['protocols'][number]

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

const hasAnyDimensionTotal = (protocol: DimensionProtocolMetric) =>
	protocol.total24h != null ||
	protocol.total7d != null ||
	protocol.total30d != null ||
	protocol.total1y != null ||
	protocol.monthlyAverage1y != null ||
	protocol.totalAllTime != null

const getDimensionTotals = (protocol: DimensionProtocolMetric) => ({
	total24h: protocol.total24h ?? null,
	total7d: protocol.total7d ?? null,
	total30d: protocol.total30d ?? null,
	total1y: protocol.total1y ?? null,
	monthlyAverage1y: protocol.monthlyAverage1y ?? null,
	totalAllTime: protocol.totalAllTime ?? null
})

const hasAnyProtocolDimensionTotal = (protocols: DimensionProtocolMetric[] | undefined) =>
	protocols?.some(hasAnyDimensionTotal) ?? false

export async function getChainOverviewData({
	chain,
	chainMetadata,
	protocolMetadata,
	categoriesAndTagsMetadata,
	protocolLlamaswapDataset = null
}: {
	chain: string
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	categoriesAndTagsMetadata: ICategoriesAndTags
	protocolLlamaswapDataset?: ProtocolLlamaswapMetadata | null
}): Promise<IChainOverviewData | null> {
	const currentChainMetadata: IChainMetadata =
		chain === 'All'
			? { name: 'All', stablecoins: true, fees: true, dexs: true, perps: true, id: 'all' }
			: chainMetadata[slug(chain)]

	if (!currentChainMetadata) return null

	const shouldFetchDexs = shouldFetchChainDexs({ chain, currentChainMetadata, categoriesAndTagsMetadata })
	const shouldFetchPerps = shouldFetchChainPerps({ chain, currentChainMetadata, categoriesAndTagsMetadata })

	try {
		const [
			chartData,
			{ protocols, chains, fees, dexs, feeExtraOptions },
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
			perps,
			cexVolume,
			etfData,
			upcomingUnlocks,
			chainIncentives,
			datInflows,
			stablecoinsData,
			chainStablecoins
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
			IAdapterChainMetrics | null,
			number | null,
			Array<[number, number]> | null,
			ProtocolEmissionWithHistory[] | null,
			ChainIncentivesSummary | null,
			{ chart: Array<[number, number]>; total30d: number } | null,
			StablecoinsListResponse | null,
			Array<string> | null
		] = await Promise.all([
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
			}),
			getProtocolsByChain({ chain, chainMetadata, protocolMetadata, protocolLlamaswapDataset, shouldFetchDexs }),
			currentChainMetadata.stablecoins
				? getStablecoinChainMcapSummary(chain === 'All' ? null : currentChainMetadata.name)
				: Promise.resolve(null),
			!currentChainMetadata.inflows ? Promise.resolve(null) : getBridgeChainNetInflows(currentChainMetadata.name),
			!currentChainMetadata.chainActiveUsers
				? Promise.resolve(null)
				: fetchAdapterChainMetrics({
						chain: currentChainMetadata.name,
						adapterType: 'active-users'
					}).then((data) => data?.total24h ?? null),
			!currentChainMetadata.txCount
				? Promise.resolve(null)
				: fetchAdapterChainMetrics({
						chain: currentChainMetadata.name,
						adapterType: 'active-users',
						dataType: 'dailyTransactionsCount'
					}).then((data) => data?.total24h ?? null),
			!currentChainMetadata.chainNewUsers
				? Promise.resolve(null)
				: fetchAdapterChainMetrics({
						chain: currentChainMetadata.name,
						adapterType: 'new-users'
					}).then((data) => data?.total24h ?? null),
			fetchRaises(),
			chain === 'All' ? Promise.resolve(null) : fetchTreasuries(),
			currentChainMetadata.gecko_id
				? fetchCoinGeckoCoinById(currentChainMetadata.gecko_id)
				: Promise.resolve({} as CoinGeckoCoinDetailResult),
			chain && chain !== 'All'
				? fetchJson<Record<string, number>>(`https://defillama-datasets.llama.fi/temp/chainNfts`)
				: Promise.resolve(null),
			fetchChainsAssets()
				.then((chainAssets) => (chain !== 'All' ? (chainAssets[currentChainMetadata.name] ?? null) : null))
				.catch(() => null),
			currentChainMetadata.revenue && chain !== 'All'
				? fetchAdapterChainMetrics({
						adapterType: 'fees',
						chain: currentChainMetadata.name,
						dataType: 'dailyAppRevenue'
					})
				: Promise.resolve(null),
			currentChainMetadata.fees && chain !== 'All'
				? fetchAdapterChainMetrics({
						adapterType: 'fees',
						chain: currentChainMetadata.name,
						dataType: 'dailyAppFees'
					})
				: Promise.resolve(null),
			currentChainMetadata.chainFees
				? fetchAdapterProtocolMetrics({
						adapterType: 'fees',
						protocol: currentChainMetadata.name
					})
				: Promise.resolve(null),
			currentChainMetadata.chainRevenue
				? fetchAdapterProtocolMetrics({
						adapterType: 'fees',
						protocol: currentChainMetadata.name,
						dataType: 'dailyRevenue'
					})
				: Promise.resolve(null),
			shouldFetchPerps
				? fetchAdapterChainMetrics({
						adapterType: 'derivatives',
						chain: currentChainMetadata.name
					})
				: Promise.resolve(null),
			fetchCexVolume(),
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
				: Promise.resolve(null),
			chain === 'All' ? getAllProtocolEmissions({ getHistoricalPrices: false }) : Promise.resolve(null),
			currentChainMetadata.incentives && chain !== 'All'
				? getChainIncentivesFromAggregatedEmissions(currentChainMetadata.name)
				: Promise.resolve(null),
			chain === 'All' ? getDATInflows() : Promise.resolve(null),
			chain !== 'All' ? fetchStablecoinAssetsApi().catch(() => null) : Promise.resolve(null),
			chain !== 'All'
				? fetchLlamaConfig()
						.then((data) => data.chainCoingeckoIds?.[currentChainMetadata.name]?.stablecoins ?? null)
						.catch(() => null)
				: Promise.resolve(null)
		])

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

		const tvlAndFeesOptions: Array<ToggleOption<TvlSettingsKey | FeesSettingKey>> = [
			...tvlOptions.filter((o) => chartData?.[o.key]?.length),
			...(feeExtraOptions ?? [])
		]
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

		const uniqueUnlockTokens = new Set<string>()
		let total14dUnlocks = 0
		const unlocksChart =
			upcomingUnlocks?.reduce(
				(acc, protocol) => {
					if (protocol.tPrice && protocol.events) {
						for (const event of protocol.events) {
							if (
								+event.timestamp * 1e3 > Date.now() &&
								+event.timestamp * 1e3 < Date.now() + 14 * 24 * 60 * 60 * 1000
							) {
								const date = new Date(event.timestamp * 1000)
								const utcTimestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
								const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
								const valueUSD = Number((Number(totalTokens.toFixed(2)) * protocol.tPrice).toFixed(2))
								acc[utcTimestamp] = { ...(acc[utcTimestamp] || {}), [protocol.tSymbol]: valueUSD }
								uniqueUnlockTokens.add(protocol.tSymbol)
								total14dUnlocks += valueUSD
							}
						}
					}
					return acc
				},
				{} as Record<string, Record<string, number>>
			) ?? {}
		const finalUnlocksChart = Object.entries(unlocksChart)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([date, tokens]) => {
				const topTokens = Object.entries(tokens).sort((a, b) => b[1] - a[1]) as Array<[string, number]>
				const others = topTokens.slice(10).reduce((acc, curr) => (acc += curr[1]), 0)
				if (others) {
					uniqueUnlockTokens.add('Others')
				}
				const finalTokens = Object.fromEntries(topTokens.slice(0, 10).concat(others ? [['Others', others]] : []))
				return [+date, finalTokens]
			}) as Array<[number, Record<string, number>]>

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

		const precomputedUnlocksChart = finalUnlocksChart.map(([date, tokensInDate]) => {
			const entries = Object.entries(tokensInDate).sort((a, b) => b[1] - a[1])
			const total = entries.reduce((sum, [, v]) => sum + v, 0)
			return {
				date,
				total,
				breakdown: entries
					.filter(([, v]) => v > 0)
					.map(([token, value]) => ({
						token,
						value,
						pct: total > 0 ? ((value / total) * 100).toFixed(2) : '0'
					}))
			}
		})

		const charts: ChainChartLabels[] = []

		if (chartData) {
			charts.push('TVL')
		}

		if (stablecoins?.mcap != null) {
			charts.push('Stablecoins Mcap')
		}
		if (chainFees?.total24h != null) {
			charts.push('Chain Fees')
		}
		if (chainRevenue?.total24h != null) {
			charts.push('Chain Revenue')
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
			charts.push('App Revenue')
		}
		if (appFees?.total24h != null) {
			charts.push('App Fees')
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

		const isDataAvailable = charts.length > 0 || protocols.length > 0

		return {
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
			chainFees: {
				total24h: chainFees?.total24h ?? null,
				feesGenerated24h: feesGenerated24h,
				topProtocolsChart: topProtocolsByFeesChart?.length > 0 ? topProtocolsByFeesChart : null,
				totalREV24h: chainREV
			},
			chainRevenue: { total24h: chainRevenue?.total24h ?? null },
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
			unlocks: upcomingUnlocks
				? {
						chart: precomputedUnlocksChart,
						total14d: total14dUnlocks
					}
				: null,
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
					: isDataAvailable
						? `Comprehensive overview of all metrics tracked on ${currentChainMetadata.name}, including ${charts.join(', ')}, and protocols on ${currentChainMetadata.name}.`
						: `Comprehensive overview of all metrics tracked on ${currentChainMetadata.name}`,
			isDataAvailable,
			datInflows: datInflows ?? null,
			chainStablecoins:
				chainStablecoins?.map((coin) => {
					const coinData = stablecoinsData?.peggedAssets?.find((c) => c.gecko_id === coin)
					return { name: coinData?.name ?? coin, url: `/stablecoin/${coin}`, symbol: coinData?.symbol ?? null }
				}) ?? null
		}
	} catch (error) {
		const msg = `Error fetching chainOverview:${chain} ${error instanceof Error ? error.message : 'Failed to fetch'}`
		const errorWithContext = new Error(msg, { cause: error })
		if (error instanceof Error && error.stack) {
			errorWithContext.stack = `${errorWithContext.stack}\nCaused by: ${error.stack}`
		}
		console.log(errorWithContext)
		throw errorWithContext
	}
}

export const getProtocolsByChain = async ({
	chain,
	chainMetadata,
	protocolMetadata,
	protocolLlamaswapDataset = null,
	shouldFetchDexs,
	oracle = null,
	fork = null
}: {
	chain: string
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	protocolLlamaswapDataset?: ProtocolLlamaswapMetadata | null
	shouldFetchDexs?: boolean
	oracle?: string | null
	fork?: string | null
}) => {
	const currentChainMetadata: IChainMetadata =
		chain === 'All'
			? { name: 'All', stablecoins: true, fees: true, dexs: true, perps: true, id: 'all' }
			: chainMetadata[slug(chain)]

	if (!currentChainMetadata) return null
	const shouldFetchDexsForChain = shouldFetchDexs ?? !!currentChainMetadata.dexs

	const normalizedOracle = oracle ? slug(oracle) : null
	const normalizedFork = fork ? slug(fork) : null

	const protocolMatchesForkFilter = (protocol: ILiteProtocol): boolean => {
		if (!normalizedFork) return true

		const forkedFrom = protocol.forkedFrom
		if (!forkedFrom) return false
		for (const forkName of forkedFrom) {
			if (slug(forkName) === normalizedFork) return true
		}
		return false
	}

	const protocolMatchesOracleFilter = (protocol: ILiteProtocol): boolean => {
		if (!normalizedOracle) return true

		const oraclesByChain = protocol.oraclesByChain
		let hasOraclesByChain = false
		for (const _chain in oraclesByChain) {
			hasOraclesByChain = true
			break
		}

		if (hasOraclesByChain) {
			if (chain !== 'All') {
				const normalizedChainName = slug(currentChainMetadata.name)
				for (const chainName in oraclesByChain) {
					if (slug(chainName) !== normalizedChainName) continue
					const oracleNames = oraclesByChain[chainName]
					for (const oracleName of oracleNames) {
						if (slug(oracleName) === normalizedOracle) return true
					}
					return false
				}
				return false
			}

			for (const chainName in oraclesByChain) {
				const oracleNames = oraclesByChain[chainName]
				for (const oracleName of oracleNames) {
					if (slug(oracleName) === normalizedOracle) return true
				}
			}
			return false
		}

		return (protocol.oracles ?? []).some((oracleName) => slug(oracleName) === normalizedOracle)
	}

	const [
		{ protocols, chains, parentProtocols },
		fees,
		revenue,
		holdersRevenue,
		bribeRevenue,
		tokenTax,
		dexs,
		emissionsProtocols
	]: [
		ProtocolsResponse,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainOverview | null,
		ProtocolEmissionsLookup
	] = await Promise.all([
		fetchProtocols(),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name
				})
			: Promise.resolve(null),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name,
					dataType: 'dailyRevenue'
				})
			: Promise.resolve(null),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name,
					dataType: 'dailyHoldersRevenue'
				})
			: Promise.resolve(null),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name,
					dataType: 'dailyBribesRevenue'
				}).catch(() => null)
			: Promise.resolve(null),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name,
					dataType: 'dailyTokenTaxes'
				}).catch(() => null)
			: Promise.resolve(null),
		shouldFetchDexsForChain
			? getAdapterChainOverview({
					adapterType: 'dexs',
					chain: currentChainMetadata.name,
					excludeTotalDataChart: false
				})
			: Promise.resolve(null),
		getProtocolEmissionsLookupFromAggregated().catch((err) => {
			console.log(err)
			return {}
		})
	])

	const parentProtocolsMap = new Map(parentProtocols.map((parentProtocol) => [parentProtocol.id, parentProtocol]))
	const eligibleProtocols = protocols.filter(
		(protocol) =>
			!protocol.defillamaId.startsWith('chain#') &&
			protocolMetadata[protocol.defillamaId] &&
			protocolMatchesForkFilter(protocol) &&
			protocolMatchesOracleFilter(protocol) &&
			toFilterProtocol({
				protocolMetadata: protocolMetadata[protocol.defillamaId],
				protocolData: protocol,
				chainDisplayName: currentChainMetadata.name
			})
	)

	const geckoIds = new Set<string>()
	for (const protocol of eligibleProtocols) {
		if (protocol.geckoId) {
			geckoIds.add(`coingecko:${protocol.geckoId}`)
		}

		if (protocol.parentProtocol) {
			const parentProtocol = parentProtocolsMap.get(protocol.parentProtocol)
			if (parentProtocol?.gecko_id) {
				geckoIds.add(`coingecko:${parentProtocol.gecko_id}`)
			}
		}
	}

	const protocolTokenPrices = geckoIds.size > 0 ? await fetchCoinPrices(Array.from(geckoIds)).catch(() => ({})) : {}

	const dimensionProtocols = {}

	for (const protocol of fees?.protocols ?? []) {
		if (hasAnyDimensionTotal(protocol)) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				fees: getDimensionTotals(protocol)
			}
		}
	}

	for (const protocol of revenue?.protocols ?? []) {
		if (hasAnyDimensionTotal(protocol)) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				revenue: getDimensionTotals(protocol)
			}
		}
	}

	for (const protocol of holdersRevenue?.protocols ?? []) {
		if (hasAnyDimensionTotal(protocol)) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				holdersRevenue: getDimensionTotals(protocol)
			}
		}
	}

	for (const protocol of bribeRevenue?.protocols ?? []) {
		if (hasAnyDimensionTotal(protocol)) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				bribeRevenue: getDimensionTotals(protocol)
			}
		}
	}

	for (const protocol of tokenTax?.protocols ?? []) {
		if (hasAnyDimensionTotal(protocol)) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				tokenTax: getDimensionTotals(protocol)
			}
		}
	}

	for (const protocol of dexs?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				dexs: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					change_7dover7d: protocol.change_7dover7d ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}
	const protocolsStore: Record<string, IProtocol> = {}

	const parentStore: Record<string, Array<IChildProtocol>> = {}

	for (const protocol of eligibleProtocols) {
		const tvls = {} as Record<TVL_TYPES, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }>

		if (chain === 'All') {
			tvls.default = {
				tvl: protocol.tvl ?? null,
				tvlPrevDay: protocol.tvlPrevDay ?? null,
				tvlPrevWeek: protocol.tvlPrevWeek ?? null,
				tvlPrevMonth: protocol.tvlPrevMonth ?? null
			}
		} else {
			tvls.default = {
				tvl: protocol?.chainTvls?.[currentChainMetadata.name]?.tvl ?? null,
				tvlPrevDay: protocol?.chainTvls?.[currentChainMetadata.name]?.tvlPrevDay ?? null,
				tvlPrevWeek: protocol?.chainTvls?.[currentChainMetadata.name]?.tvlPrevWeek ?? null,
				tvlPrevMonth: protocol?.chainTvls?.[currentChainMetadata.name]?.tvlPrevMonth ?? null
			}
		}

		const tvlChange = tvls.default.tvl
			? {
					change1d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevDay),
					change7d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevWeek),
					change1m: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevMonth)
				}
			: null

		for (const chainKey in protocol.chainTvls ?? {}) {
			if (chain === 'All') {
				if (TVL_SETTINGS_KEYS_SET.has(chainKey as any) || chainKey === 'excludeParent') {
					tvls[chainKey] = {
						tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
						tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
						tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
						tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
					}
				}
			} else {
				if (chainKey.startsWith(`${currentChainMetadata.name}-`)) {
					const tvlKey = chainKey.split('-')[1]
					tvls[tvlKey] = {
						tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
						tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
						tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
						tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
					}
				}
			}
		}

		const childProtocolTvl = tvls?.default?.tvl
		const childMcapTvl =
			protocol.mcap != null &&
			protocol.category !== 'Bridge' &&
			childProtocolTvl != null &&
			childProtocolTvl !== 0 &&
			Number.isFinite(childProtocolTvl)
				? +formatNum(+protocol.mcap.toFixed(2) / +childProtocolTvl.toFixed(2))
				: null

		const llamaswapChains = protocol.geckoId ? (protocolLlamaswapDataset?.[protocol.geckoId] ?? null) : null
		const childStore: IChildProtocol & { defillamaId: string } = {
			name: protocolMetadata[protocol.defillamaId].displayName,
			slug: slug(protocolMetadata[protocol.defillamaId].displayName),
			chains: protocolMetadata[protocol.defillamaId].chains,
			category: protocol.category ?? null,
			tvl: protocol.tvl != null && protocol.category !== 'Bridge' ? tvls : null,
			tvlChange: protocol.tvl != null && protocol.category !== 'Bridge' ? tvlChange : null,
			mcap: protocol.mcap ?? null,
			tokenPrice: protocol.geckoId ? (protocolTokenPrices[`coingecko:${protocol.geckoId}`]?.price ?? null) : null,
			...(llamaswapChains?.length ? { llamaswapChains } : {}),
			mcaptvl: childMcapTvl,
			strikeTvl:
				protocol.category !== 'Bridge'
					? toStrikeTvl(protocol, {
							liquidstaking: !!tvls?.liquidstaking,
							doublecounted: !!tvls?.doublecounted
						})
					: false,
			defillamaId: protocol.defillamaId
		}

		if (protocol.deprecated) {
			childStore.deprecated = true
		}

		if (dimensionProtocols[protocol.defillamaId]?.fees) {
			childStore.fees = dimensionProtocols[protocol.defillamaId].fees
			childStore.fees.pf = protocol.mcap
				? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].fees.total30d)
				: null
		}

		if (dimensionProtocols[protocol.defillamaId]?.revenue) {
			childStore.revenue = dimensionProtocols[protocol.defillamaId].revenue
			childStore.revenue.ps = protocol.mcap
				? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].revenue.total30d)
				: null
		}

		if (dimensionProtocols[protocol.defillamaId]?.holdersRevenue) {
			childStore.holdersRevenue = dimensionProtocols[protocol.defillamaId].holdersRevenue
		}

		if (dimensionProtocols[protocol.defillamaId]?.bribeRevenue) {
			childStore.bribeRevenue = dimensionProtocols[protocol.defillamaId].bribeRevenue
		}

		if (dimensionProtocols[protocol.defillamaId]?.tokenTax) {
			childStore.tokenTax = dimensionProtocols[protocol.defillamaId].tokenTax
		}

		if (dimensionProtocols[protocol.defillamaId]?.dexs) {
			childStore.dexs = dimensionProtocols[protocol.defillamaId].dexs
		}

		const emissionsMatch =
			emissionsProtocols[protocol.defillamaId] ||
			emissionsProtocols[protocolMetadata[protocol.defillamaId]?.displayName]

		if (emissionsMatch) {
			childStore.emissions = {
				total24h: emissionsMatch.emissions24h,
				total7d: emissionsMatch.emissions7d,
				total30d: emissionsMatch.emissions30d,
				total1y: emissionsMatch.emissions1y,
				monthlyAverage1y: emissionsMatch.emissionsMonthlyAverage1y,
				totalAllTime: emissionsMatch.emissionsAllTime
			}
		}

		if (protocol.parentProtocol && protocolMetadata[protocol.parentProtocol]) {
			parentStore[protocol.parentProtocol] = [...(parentStore?.[protocol.parentProtocol] ?? []), childStore]
		} else {
			protocolsStore[protocol.defillamaId] = childStore
		}
	}

	// Keep protocols ungrouped when filtering leaves only one child under a parent.
	for (const parentId in parentStore) {
		if (parentStore[parentId].length !== 1) continue
		const onlyChild = parentStore[parentId][0] as IChildProtocol & { defillamaId?: string }
		if (onlyChild.defillamaId) {
			protocolsStore[onlyChild.defillamaId] = onlyChild
		}
	}

	for (const parentProtocol of parentProtocols) {
		if (parentStore[parentProtocol.id] && parentStore[parentProtocol.id].length > 1) {
			const parentTvl = parentStore[parentProtocol.id].some((child) => child.tvl !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const chainOrExtraTvlKey in curr.tvl ?? {}) {
								if (!acc[chainOrExtraTvlKey]) {
									acc[chainOrExtraTvlKey] = {}
								}
								for (const currentOrPreviousTvlKey in curr.tvl[chainOrExtraTvlKey]) {
									let currValue = curr.tvl[chainOrExtraTvlKey][currentOrPreviousTvlKey]

									// Skip if accumulator is already null (don't override)
									if (acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] === null) {
										continue
									}

									if (currValue == null) {
										// If current value is null, propagate null to parent only for these keys
										if (['tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth'].includes(currentOrPreviousTvlKey)) {
											acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] = null
										}
									} else {
										acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] =
											(acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] ?? 0) + currValue
									}
								}
							}
							return acc
						},
						{} as IChildProtocol['tvl']
					)
				: null

			const parentFees = parentStore[parentProtocol.id].some((child) => child.fees !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.fees ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + (curr.fees[key1] ?? 0)
							}
							return acc
						},
						{} as IChildProtocol['fees']
					)
				: null

			if (parentFees) {
				parentFees.pf = getAnnualizedRatio(parentProtocol.mcap, parentFees.total30d)
			}

			const parentRevenue = parentStore[parentProtocol.id].some((child) => child.revenue !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.revenue ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + (curr.revenue[key1] ?? 0)
							}
							return acc
						},
						{} as IChildProtocol['revenue']
					)
				: null

			if (parentRevenue) {
				parentRevenue.ps = getAnnualizedRatio(parentProtocol.mcap, parentRevenue.total30d)
			}

			const parentHoldersRevenue = parentStore[parentProtocol.id].some((child) => child.holdersRevenue !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.holdersRevenue ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + (curr.holdersRevenue[key1] ?? 0)
							}
							return acc
						},
						{} as IChildProtocol['holdersRevenue']
					)
				: null

			const parentBribeRevenue = parentStore[parentProtocol.id].some((child) => child.bribeRevenue != null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.bribeRevenue ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + (curr.bribeRevenue[key1] ?? 0)
							}
							return acc
						},
						{} as IChildProtocol['bribeRevenue']
					)
				: null

			const parentTokenTax = parentStore[parentProtocol.id].some((child) => child.tokenTax != null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.tokenTax ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + (curr.tokenTax[key1] ?? 0)
							}
							return acc
						},
						{} as IChildProtocol['tokenTax']
					)
				: null

			const parentDexs = parentStore[parentProtocol.id].some((child) => child.dexs !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.dexs ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + curr.dexs[key1]
							}
							return acc
						},
						{} as IChildProtocol['dexs']
					)
				: null

			let parentEmissions = parentStore[parentProtocol.id].some((child) => child.emissions !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.emissions ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + curr.emissions[key1]
							}
							return acc
						},
						{} as IChildProtocol['emissions']
					)
				: null

			if (!parentEmissions) {
				const parentEmissionsMatch = emissionsProtocols[protocolMetadata[parentProtocol.id]?.displayName]
				if (parentEmissionsMatch) {
					parentEmissions = {
						total24h: parentEmissionsMatch.emissions24h,
						total7d: parentEmissionsMatch.emissions7d,
						total30d: parentEmissionsMatch.emissions30d,
						total1y: parentEmissionsMatch.emissions1y,
						monthlyAverage1y: parentEmissionsMatch.emissionsMonthlyAverage1y,
						totalAllTime: parentEmissionsMatch.emissionsAllTime
					}
				}
			}

			if (parentTvl?.excludeParent) {
				parentTvl.default.tvl = (parentTvl.default.tvl ?? 0) - (parentTvl.excludeParent.tvl ?? 0)
				// Only subtract excludeParent from prev values if they're not null
				// (null means incomplete data, so we shouldn't compute a change)
				if (parentTvl.default.tvlPrevDay != null) {
					parentTvl.default.tvlPrevDay = parentTvl.default.tvlPrevDay - (parentTvl.excludeParent.tvlPrevDay ?? 0)
				}
				if (parentTvl.default.tvlPrevWeek != null) {
					parentTvl.default.tvlPrevWeek = parentTvl.default.tvlPrevWeek - (parentTvl.excludeParent.tvlPrevWeek ?? 0)
				}
				if (parentTvl.default.tvlPrevMonth != null) {
					parentTvl.default.tvlPrevMonth = parentTvl.default.tvlPrevMonth - (parentTvl.excludeParent.tvlPrevMonth ?? 0)
				}
			}

			const prevKeys = ['tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth'] as const
			const missingPrevKeys = prevKeys.filter((key) =>
				parentStore[parentProtocol.id].some(
					(child) => child.tvl?.default?.['tvl'] != null && child.tvl?.default?.[key] == null
				)
			)

			if (missingPrevKeys.length && parentTvl?.default) {
				for (const key of missingPrevKeys) {
					parentTvl.default[key] = null
				}
			}

			const parentTvlChange =
				parentTvl?.default?.tvl != null
					? {
							change1d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevDay),
							change7d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevWeek),
							change1m: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevMonth)
						}
					: null

			const categorySet = new Set<string>()
			for (const p of parentStore[parentProtocol.id]) {
				if (p.category) categorySet.add(p.category)
			}
			const chilsProtocolCategories = Array.from(categorySet)

			const parentProtocolTvl = parentTvl?.default?.tvl
			const parentMcapTvl =
				parentProtocol.mcap != null &&
				parentProtocolTvl != null &&
				parentProtocolTvl !== 0 &&
				Number.isFinite(parentProtocolTvl)
					? +formatNum(+parentProtocol.mcap.toFixed(2) / +parentProtocolTvl.toFixed(2))
					: null

			const parentLlamaswapChains = parentProtocol.gecko_id
				? (protocolLlamaswapDataset?.[parentProtocol.gecko_id] ?? null)
				: null

			protocolsStore[parentProtocol.id] = {
				name: protocolMetadata[parentProtocol.id].displayName,
				slug: slug(protocolMetadata[parentProtocol.id].displayName),
				category: chilsProtocolCategories.length > 1 ? null : chilsProtocolCategories[0],
				childProtocols: parentStore[parentProtocol.id],
				chains: Array.from(new Set(...parentStore[parentProtocol.id].map((p) => p.chains ?? []))),
				tvl: parentTvl,
				tvlChange: parentTvlChange,
				strikeTvl: parentStore[parentProtocol.id].some((child) => child.strikeTvl),
				mcap: parentProtocol.mcap ?? null,
				tokenPrice: parentProtocol.gecko_id
					? (protocolTokenPrices[`coingecko:${parentProtocol.gecko_id}`]?.price ?? null)
					: null,
				...(parentLlamaswapChains?.length ? { llamaswapChains: parentLlamaswapChains } : {}),
				mcaptvl: parentMcapTvl
			}

			if (parentFees) {
				protocolsStore[parentProtocol.id].fees = parentFees
			}
			if (parentRevenue) {
				protocolsStore[parentProtocol.id].revenue = parentRevenue
			}
			if (parentDexs) {
				protocolsStore[parentProtocol.id].dexs = parentDexs
			}
			if (parentHoldersRevenue) {
				protocolsStore[parentProtocol.id].holdersRevenue = parentHoldersRevenue
			}
			if (parentBribeRevenue) {
				protocolsStore[parentProtocol.id].bribeRevenue = parentBribeRevenue
			}
			if (parentTokenTax) {
				protocolsStore[parentProtocol.id].tokenTax = parentTokenTax
			}
			if (parentEmissions) {
				protocolsStore[parentProtocol.id].emissions = parentEmissions
			}
		}
	}

	const finalProtocols: IProtocol[] = []

	for (const protocol in protocolsStore) {
		finalProtocols.push(protocolsStore[protocol])
	}

	const feeExtraOptions = feesOptions.filter((option) =>
		option.key === 'bribes'
			? hasAnyProtocolDimensionTotal(bribeRevenue?.protocols)
			: option.key === 'tokentax'
				? hasAnyProtocolDimensionTotal(tokenTax?.protocols)
				: false
	)

	return {
		protocols: finalProtocols.sort((a, b) => (b.tvl?.default?.tvl ?? 0) - (a.tvl?.default?.tvl ?? 0)),
		chains,
		fees,
		dexs,
		emissionsData: emissionsProtocols,
		feeExtraOptions
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
