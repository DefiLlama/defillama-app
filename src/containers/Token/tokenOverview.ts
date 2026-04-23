import { fetchLiquidityTokensDataset } from '~/api'
import {
	fetchCoinGeckoChartByIdWithCacheFallback,
	fetchCoinGeckoCoinById,
	fetchCoinPriceByCoinGeckoIdViaLlamaPrices
} from '~/api/coingecko'
import type { CgChartResponse, CoinGeckoCoinDetailResultForOptions } from '~/api/coingecko.types'
import type { ProtocolLiquidityTokensResponse } from '~/api/types'
import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { formatLineChart } from '~/components/ECharts/utils'
import { CACHE_SERVER, YIELD_CONFIG_API } from '~/constants'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { normalizeChartPointsToMs } from '~/containers/ProtocolOverview/chartSeries.utils'
import { fetchRaises } from '~/containers/Raises/api'
import type { RawRaise } from '~/containers/Raises/api.types'
import { fetchTreasuries } from '~/containers/Treasuries/api'
import { fetchProtocolEmissionFromDatasets } from '~/containers/Unlocks/api'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { IProtocolLlamaswapChain, IProtocolMetadata, ITokenListEntry } from '~/utils/metadata/types'
import type { TokenDirectoryRecord } from '~/utils/tokenDirectory'

export type TokenOverviewChartLabel = 'Token Price' | 'Token Volume' | 'Mcap' | 'FDV'

export interface TokenOverviewTreasury {
	ownTokens: number | null
	stablecoins: number | null
	majors: number | null
	others: number | null
	total: number | null
}

export interface TokenOverviewRaise {
	date: number
	round: string | null
	amount: number | null
	source: string | null
	investors: string[]
}

export interface TokenOverviewTokenLiquidity {
	pools: Array<[string, string, number]>
	total: number
}

export interface TokenOverviewMarketData {
	currentPrice: number | null
	percentChange24h: number | null
	ath: number | null
	athDate: string | null
	atl: number | null
	atlDate: string | null
	circulatingSupply: number | null
	totalSupply: number | null
	maxSupply: number | null
	mcap: number | null
	fdv: number | null
	volume24h: {
		total: number | null
		cex: number | null
		dex: number | null
	}
}

export type TokenOverviewRawChartData = Partial<Record<TokenOverviewChartLabel, Array<[number, number]>>>

export interface TokenOverviewData {
	name: string
	displayName: string
	symbol: string
	llamaswapChains: IProtocolLlamaswapChain[] | null
	marketData: TokenOverviewMarketData
	treasury: TokenOverviewTreasury | null
	raises: TokenOverviewRaise[] | null
	tokenLiquidity: TokenOverviewTokenLiquidity | null
	outstandingFDV: number | null
	rawChartData: TokenOverviewRawChartData
}

type IYieldsConfigResult = { protocols?: Record<string, { name?: string }> } | null

export const TOKEN_OVERVIEW_DEFAULT_CHARTS: TokenOverviewChartLabel[] = ['Token Price']
export const TOKEN_OVERVIEW_ALL_CHARTS: TokenOverviewChartLabel[] = ['Token Price', 'Token Volume', 'Mcap', 'FDV']

const emptyMarketData: TokenOverviewMarketData = {
	currentPrice: null,
	percentChange24h: null,
	ath: null,
	athDate: null,
	atl: null,
	atlDate: null,
	circulatingSupply: null,
	totalSupply: null,
	maxSupply: null,
	mcap: null,
	fdv: null,
	volume24h: {
		total: null,
		cex: null,
		dex: null
	}
}

function needsCoinDetailFallback(tokenEntry: ITokenListEntry | null): boolean {
	if (!tokenEntry) return true

	return (
		tokenEntry.current_price == null ||
		tokenEntry.circulating_supply == null ||
		tokenEntry.total_supply == null ||
		tokenEntry.market_cap == null ||
		tokenEntry.fully_diluted_valuation == null ||
		tokenEntry.total_volume == null
	)
}

type TokenOverviewCoinDetail = CoinGeckoCoinDetailResultForOptions<{
	localization: false
	tickers: false
	marketData: true
	communityData: false
	developerData: false
	sparkline: false
	includeCategoriesDetails: false
}>

async function fetchTokenOverviewCoinDetail(geckoId: string): Promise<TokenOverviewCoinDetail | null> {
	if (!geckoId) return null

	return fetchCoinGeckoCoinById(geckoId, {
		localization: false,
		tickers: false,
		marketData: true,
		communityData: false,
		developerData: false,
		sparkline: false,
		includeCategoriesDetails: false
	}).catch(() => null)
}

function buildTokenMarketDataFallback(
	coinDetail: TokenOverviewCoinDetail | null | undefined,
	currentPriceViaLlama: number | null
): TokenOverviewMarketData {
	const marketData = coinDetail?.market_data

	return {
		currentPrice: marketData?.current_price?.usd ?? currentPriceViaLlama,
		percentChange24h: null,
		ath: marketData?.ath?.usd ?? null,
		athDate: marketData?.ath_date?.usd ?? null,
		atl: marketData?.atl?.usd ?? null,
		atlDate: marketData?.atl_date?.usd ?? null,
		circulatingSupply: marketData?.circulating_supply ?? null,
		totalSupply: marketData?.total_supply ?? null,
		maxSupply: marketData?.max_supply ?? null,
		mcap: marketData?.market_cap?.usd ?? null,
		fdv: marketData?.fully_diluted_valuation?.usd ?? null,
		volume24h: {
			total: marketData?.total_volume?.usd ?? null,
			cex: null,
			dex: null
		}
	}
}

function buildTokenMarketData(
	tokenEntry: ITokenListEntry | null,
	tickers: CgChartResponse['data']['coinData']['tickers'] | undefined,
	cgExchangeIdentifiers: string[],
	marketDataFallback: TokenOverviewMarketData = emptyMarketData
): TokenOverviewMarketData {
	if (!tokenEntry) {
		return marketDataFallback
	}

	let cexVolume: number | null = null
	let dexVolume: number | null = null
	if (tickers) {
		const cexIds = new Set(cgExchangeIdentifiers)
		let cex = 0
		let dex = 0

		for (const ticker of tickers) {
			const volume = ticker.converted_volume?.usd ?? 0
			if (ticker.trust_score === 'red') continue

			if (cexIds.has(ticker.market?.identifier ?? '')) {
				cex += volume
			} else {
				dex += volume
			}
		}

		cexVolume = cex
		dexVolume = dex
	}

	return {
		currentPrice: tokenEntry.current_price ?? marketDataFallback.currentPrice,
		percentChange24h: tokenEntry.price_change_percentage_24h ?? marketDataFallback.percentChange24h,
		ath: tokenEntry.ath ?? marketDataFallback.ath,
		athDate: tokenEntry.ath_date ?? marketDataFallback.athDate,
		atl: tokenEntry.atl ?? marketDataFallback.atl,
		atlDate: tokenEntry.atl_date ?? marketDataFallback.atlDate,
		circulatingSupply: tokenEntry.circulating_supply ?? marketDataFallback.circulatingSupply,
		totalSupply: tokenEntry.total_supply ?? marketDataFallback.totalSupply,
		maxSupply: tokenEntry.max_supply ?? marketDataFallback.maxSupply,
		mcap: tokenEntry.market_cap ?? marketDataFallback.mcap,
		fdv: tokenEntry.fully_diluted_valuation ?? marketDataFallback.fdv,
		volume24h: {
			total: tokenEntry.total_volume ?? marketDataFallback.volume24h.total,
			cex: cexVolume,
			dex: dexVolume
		}
	}
}

function buildTreasurySummary(
	treasury: {
		tokenBreakdowns?: { ownTokens: number; stablecoins: number; majors: number; others: number }
	} | null
): TokenOverviewTreasury | null {
	if (!treasury?.tokenBreakdowns) return null

	const { majors = 0, stablecoins = 0, ownTokens = 0, others = 0 } = treasury.tokenBreakdowns

	return {
		majors,
		stablecoins,
		ownTokens,
		others,
		total: majors + stablecoins + ownTokens + others
	}
}

function buildRaisesSummary(raises: RawRaise[] | null): TokenOverviewRaise[] | null {
	if (!raises?.length) return null

	return [...raises]
		.sort((a, b) => a.date - b.date)
		.map((raise) => ({
			date: raise.date,
			round: raise.round ?? null,
			amount: raise.amount ?? null,
			source: raise.source ?? null,
			investors: [...(raise.leadInvestors ?? []), ...(raise.otherInvestors ?? [])]
		}))
}

function buildTokenLiquiditySummary({
	protocolDataId,
	yieldsConfig,
	liquidityInfo
}: {
	protocolDataId: string | null
	yieldsConfig: IYieldsConfigResult
	liquidityInfo: ProtocolLiquidityTokensResponse | null
}): TokenOverviewTokenLiquidity | null {
	if (!protocolDataId || !yieldsConfig?.protocols || !liquidityInfo) return null

	const tokenPools =
		liquidityInfo.find((protocol: ProtocolLiquidityTokensResponse[number]) => protocol.id === protocolDataId)
			?.tokenPools ?? []

	if (tokenPools.length === 0) return null

	const liquidityAggregated = tokenPools.reduce(
		(agg: Record<string, Record<string, number>>, pool: { project: string; chain: string; tvlUsd: number }) => {
			if (!agg[pool.project]) agg[pool.project] = {}
			agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
			return agg
		},
		{} as Record<string, Record<string, number>>
	)

	const rows: Array<[string, string, number]> = []
	for (const protocolSlug in liquidityAggregated) {
		const protocolName = yieldsConfig.protocols?.[protocolSlug]?.name ?? protocolSlug

		const chainValues = liquidityAggregated[protocolSlug]
		for (const chainName in chainValues) {
			rows.push([protocolName, chainName, Number(chainValues[chainName])])
		}
	}

	rows.sort((a, b) => b[2] - a[2])
	return rows.length > 0 ? { pools: rows, total: rows.reduce((sum, row) => sum + row[2], 0) } : null
}

async function fetchTotalSupply(geckoId: string): Promise<number | null> {
	const data = await fetchJson<{ data?: { total_supply?: number } }>(`${CACHE_SERVER}/supply/${geckoId}`).catch(
		() => null
	)
	return data?.data?.total_supply ?? null
}

export function buildTokenOverviewRawChartData({
	chart,
	totalSupply,
	includeCharts = TOKEN_OVERVIEW_ALL_CHARTS
}: {
	chart: CgChartResponse | null
	totalSupply: number | null
	includeCharts?: TokenOverviewChartLabel[]
}): TokenOverviewRawChartData {
	const includedCharts = new Set(includeCharts)
	const priceSeries = normalizeChartPointsToMs(chart?.data?.prices)
	const mcapSeries = normalizeChartPointsToMs(chart?.data?.mcaps)
	const volumeSeries = normalizeChartPointsToMs(chart?.data?.volumes)

	const fdvSeries =
		priceSeries && totalSupply != null && Number.isFinite(totalSupply)
			? priceSeries.map(([timestamp, price]) => [timestamp, price * totalSupply] as [number, number])
			: null

	return {
		...(includedCharts.has('Token Price') && priceSeries ? { 'Token Price': priceSeries } : {}),
		...(includedCharts.has('Token Volume') && volumeSeries ? { 'Token Volume': volumeSeries } : {}),
		...(includedCharts.has('Mcap') && mcapSeries ? { Mcap: mcapSeries } : {}),
		...(includedCharts.has('FDV') && fdvSeries ? { FDV: fdvSeries } : {})
	}
}

export function buildDisplayedTokenChartData({
	rawChartData,
	activeCharts,
	groupBy
}: {
	rawChartData: TokenOverviewRawChartData
	activeCharts: TokenOverviewChartLabel[]
	groupBy: ChartTimeGroupingWithCumulative
}): Record<TokenOverviewChartLabel, Array<[number, number | null]>> {
	const charts = {} as Record<TokenOverviewChartLabel, Array<[number, number | null]>>

	for (const chartLabel of activeCharts) {
		const chartData = rawChartData[chartLabel]
		if (!chartData?.length) continue

		charts[chartLabel] = formatLineChart({
			data: chartData,
			groupBy,
			dateInMs: true,
			denominationPriceHistory: null
		})
	}

	return charts
}

export async function getTokenOverviewData({
	record,
	displayName,
	geckoId,
	tokenEntry,
	protocolMetadata,
	cgExchangeIdentifiers,
	llamaswapChains,
	prefetchedCharts = TOKEN_OVERVIEW_ALL_CHARTS
}: {
	record: TokenDirectoryRecord
	displayName: string
	geckoId: string | null
	tokenEntry: ITokenListEntry | null
	protocolMetadata: IProtocolMetadata | null
	cgExchangeIdentifiers: string[]
	llamaswapChains: IProtocolLlamaswapChain[] | null
	prefetchedCharts?: TokenOverviewChartLabel[]
}): Promise<TokenOverviewData> {
	const chainDefiLlamaId = record.chainId ? `chain#${record.chainId.toLowerCase()}` : null
	const protocolDefiLlamaId = record.protocolId ?? protocolMetadata?.name ?? null
	const protocolSlug = protocolDefiLlamaId ? slug(protocolDefiLlamaId.replace(/^parent#/, '')) : null

	const shouldFetchProtocolData = Boolean(protocolSlug)
	const shouldFetchTreasury = Boolean(!record.chainId && protocolDefiLlamaId)
	const shouldFetchRaises = Boolean(chainDefiLlamaId || protocolDefiLlamaId)
	const shouldFetchLiquidity = Boolean(shouldFetchProtocolData && protocolMetadata?.liquidity)
	const shouldFetchOutstandingFdv = Boolean(shouldFetchProtocolData && protocolMetadata?.emissions)
	const shouldFetchCoinDetail = Boolean(geckoId && needsCoinDetailFallback(tokenEntry))
	const totalSupply = tokenEntry?.max_supply ?? tokenEntry?.total_supply ?? null

	const [
		cgChart,
		coinDetail,
		currentPriceViaLlama,
		protocolData,
		raisesData,
		treasuries,
		adjustedSupply,
		yieldsConfig,
		liquidityInfo,
		fetchedTotalSupply
	] = await Promise.all([
		geckoId ? fetchCoinGeckoChartByIdWithCacheFallback(geckoId).catch(() => null) : Promise.resolve(null),
		shouldFetchCoinDetail ? fetchTokenOverviewCoinDetail(geckoId) : Promise.resolve(null),
		shouldFetchCoinDetail
			? fetchCoinPriceByCoinGeckoIdViaLlamaPrices(geckoId).catch(() => null)
			: Promise.resolve(null),
		shouldFetchProtocolData ? fetchProtocolOverviewMetrics(protocolSlug!).catch(() => null) : Promise.resolve(null),
		shouldFetchRaises ? fetchRaises().catch(() => ({ raises: [] as RawRaise[] })) : Promise.resolve(null),
		shouldFetchTreasury ? fetchTreasuries().catch(() => []) : Promise.resolve(null),
		shouldFetchOutstandingFdv
			? fetchProtocolEmissionFromDatasets(protocolSlug!)
					.then((data) => data?.supplyMetrics?.adjustedSupply ?? null)
					.catch(() => null)
			: Promise.resolve(null),
		shouldFetchLiquidity ? fetchJson<IYieldsConfigResult>(YIELD_CONFIG_API).catch(() => null) : Promise.resolve(null),
		shouldFetchLiquidity ? fetchLiquidityTokensDataset().catch(() => null) : Promise.resolve(null),
		geckoId ? fetchTotalSupply(geckoId) : Promise.resolve(null)
	])

	const marketDataFallback = buildTokenMarketDataFallback(coinDetail, currentPriceViaLlama?.price ?? null)
	const marketData = buildTokenMarketData(
		tokenEntry,
		cgChart?.data?.coinData?.tickers,
		cgExchangeIdentifiers,
		marketDataFallback
	)
	const treasury =
		shouldFetchTreasury && treasuries
			? buildTreasurySummary(treasuries.find((item) => item.id === `${protocolDefiLlamaId}-treasury`) ?? null)
			: null

	const matchedRaises = raisesData
		? (raisesData.raises.filter((raise) => raise.defillamaId === (chainDefiLlamaId ?? protocolDefiLlamaId)) ?? [])
		: []

	const tokenLiquidity = buildTokenLiquiditySummary({
		protocolDataId: protocolData?.id ?? null,
		yieldsConfig,
		liquidityInfo
	})

	return {
		name: record.name,
		displayName,
		symbol: record.symbol,
		llamaswapChains,
		marketData,
		treasury,
		raises: buildRaisesSummary(matchedRaises),
		tokenLiquidity,
		outstandingFDV:
			adjustedSupply != null && marketData.currentPrice != null ? adjustedSupply * marketData.currentPrice : null,
		rawChartData: buildTokenOverviewRawChartData({
			chart: cgChart,
			totalSupply: totalSupply ?? fetchedTotalSupply,
			includeCharts: prefetchedCharts
		})
	}
}
