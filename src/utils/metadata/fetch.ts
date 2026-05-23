import { COINS_SERVER_URL, ENABLE_LLAMASWAP_PROTOCOLS_CHAINS } from '~/constants'
import {
	buildUnlocksHistoricalPriceRequests,
	type UnlockHistoricalPriceProtocol
} from '~/utils/unlocks/historicalPriceRequests'
import type { CoreMetadataPayload } from './artifactContract'
import { buildProtocolLlamaswapDataset } from './buy-on-llamaswap'
import { buildChainDisplayNameLookupRecord, buildProtocolDisplayNameLookupRecord } from './displayLookups'
import { fetchMetadataJson } from './http'
import { extractLiquidationsTokenSymbols } from './liquidations'
import { fetchMetadataRouteIndexes } from './routeIndexes'
import { fetchCoreMetadataSources } from './sources'
import type { IEmissionsHistoricalPrices, ITokenListEntry, ProtocolLlamaswapMetadata } from './types'

const normalizeSlug = (value: unknown): string =>
	String(value ?? '')
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/'/g, '')

const dedupeNonEmpty = (values: string[]): string[] => {
	const seen = new Set<string>()
	for (const value of values) {
		if (!value) continue
		seen.add(value)
	}
	return [...seen]
}

const EMISSIONS_HISTORICAL_PRICES_BATCH_SIZE = 50

async function fetchEmissionsHistoricalPrices(
	emissions: UnlockHistoricalPriceProtocol[]
): Promise<IEmissionsHistoricalPrices> {
	const { priceReqs, hasPriceRequests } = buildUnlocksHistoricalPriceRequests(emissions)
	if (!hasPriceRequests) return {}

	const prices: IEmissionsHistoricalPrices = {}
	let batchReqs: Record<string, number[]> = {}
	let batchCount = 0

	for (const coin in priceReqs) {
		batchReqs[coin] = priceReqs[coin]
		batchCount++
		if (batchCount < EMISSIONS_HISTORICAL_PRICES_BATCH_SIZE) continue

		Object.assign(prices, await fetchEmissionsHistoricalPriceBatch(batchReqs))
		batchReqs = {}
		batchCount = 0
	}

	if (batchCount > 0) {
		Object.assign(prices, await fetchEmissionsHistoricalPriceBatch(batchReqs))
	}

	return prices
}

async function fetchEmissionsHistoricalPriceBatch(coins: Record<string, number[]>) {
	const response = await fetchMetadataJson<{ coins?: IEmissionsHistoricalPrices }>(
		`${COINS_SERVER_URL}/pro/prices/historical`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ coins, searchWidth: '6h' })
		}
	)
	if (!response.coins) throw new Error('Emissions historical prices response did not include coins')
	return response.coins
}

export async function fetchCoreMetadata({
	existingProtocolLlamaswapDataset
}: {
	existingProtocolLlamaswapDataset?: ProtocolLlamaswapMetadata
} = {}): Promise<CoreMetadataPayload> {
	const [
		{
			protocols,
			chains,
			categoriesAndTags,
			chainCategories,
			cexsResponse,
			rwaList,
			rwaPerpsList,
			tokenlistArray,
			tokenDirectory,
			liquidationsResponse,
			bridgesResponse,
			emissionsProtocolsList,
			emissionsSupplyMetrics,
			emissions
		},
		routeIndexes
	] = await Promise.all([fetchCoreMetadataSources(), fetchMetadataRouteIndexes()])

	const tokenlist: Record<string, ITokenListEntry> = {}
	for (const t of tokenlistArray) {
		if (!t || typeof t.id !== 'string' || !t.id) continue
		tokenlist[t.id] = {
			symbol: t.symbol,
			current_price: t.current_price ?? null,
			price_change_24h: t.price_change_24h ?? null,
			price_change_percentage_24h: t.price_change_percentage_24h ?? null,
			ath: t.ath ?? null,
			ath_date: t.ath_date ?? null,
			atl: t.atl ?? null,
			atl_date: t.atl_date ?? null,
			market_cap: t.market_cap ?? null,
			fully_diluted_valuation: t.fully_diluted_valuation ?? null,
			total_volume: t.total_volume ?? null,
			total_supply: t.total_supply ?? null,
			circulating_supply: t.circulating_supply ?? null,
			max_supply: t.max_supply ?? null
		}
	}

	const bridgeChainSlugToName: Record<string, string> = {}
	const bridgeProtocolSlugs = dedupeNonEmpty(
		(bridgesResponse?.bridges ?? []).flatMap((bridge) => {
			const fromApiSlug = normalizeSlug(bridge.slug)
			const fromDisplayName = normalizeSlug(bridge.displayName)
			if (!fromApiSlug && !fromDisplayName) return []
			return fromApiSlug ? [fromApiSlug, fromDisplayName] : [fromDisplayName]
		})
	)

	const bridgeChainSlugs = dedupeNonEmpty(
		(bridgesResponse?.bridges ?? []).flatMap((bridge) => {
			const destinationChain =
				bridge.destinationChain && bridge.destinationChain !== 'false' ? [bridge.destinationChain] : []
			const chainNames = [...(bridge.chains ?? []), ...destinationChain]
			for (const chainName of chainNames) {
				const normalized = normalizeSlug(chainName)
				if (!normalized || bridgeChainSlugToName[normalized]) continue
				bridgeChainSlugToName[normalized] = chainName
			}
			return chainNames.map(normalizeSlug)
		})
	)

	const protocolLlamaswapDataset = ENABLE_LLAMASWAP_PROTOCOLS_CHAINS
		? await buildProtocolLlamaswapDataset({ chains, protocols, existingDataset: existingProtocolLlamaswapDataset })
		: ({} as ProtocolLlamaswapMetadata)

	const protocolDisplayNames = buildProtocolDisplayNameLookupRecord(protocols)
	const chainDisplayNames = buildChainDisplayNameLookupRecord(chains)
	const liquidationsTokenSymbols = extractLiquidationsTokenSymbols(liquidationsResponse)
	const emissionsHistoricalPrices = await fetchEmissionsHistoricalPrices(emissions)

	return {
		protocols,
		chains,
		categoriesAndTags,
		chainCategories,
		cexs: cexsResponse.cexs,
		cgExchangeIdentifiers: cexsResponse.cg_volume_cexs,
		rwaList,
		rwaPerpsList,
		tokenlist,
		tokenDirectory,
		protocolDisplayNames,
		chainDisplayNames,
		liquidationsTokenSymbols,
		emissionsProtocolsList,
		emissionsSupplyMetrics,
		emissionsHistoricalPrices,
		bridgeProtocolSlugs,
		bridgeChainSlugs,
		bridgeChainSlugToName,
		protocolLlamaswapDataset,
		narrativeCategories: routeIndexes.narrativeCategories,
		oracleRoutes: routeIndexes.oracleRoutes,
		digitalAssetTreasuryRoutes: routeIndexes.digitalAssetTreasuryRoutes,
		stablecoinPeggedAssetSlugs: routeIndexes.stablecoinPeggedAssetSlugs
	}
}
