import { ENABLE_LLAMASWAP_PROTOCOLS_CHAINS } from '~/constants'
import type { CoreMetadataPayload } from './artifactContract'
import { buildProtocolLlamaswapDataset } from './buy-on-llamaswap'
import { buildChainDisplayNameLookupRecord, buildProtocolDisplayNameLookupRecord } from './displayLookups'
import { extractLiquidationsTokenSymbols } from './liquidations'
import { fetchCoreMetadataSources } from './sources'
import type { ITokenListEntry, ProtocolLlamaswapMetadata } from './types'

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

export async function fetchCoreMetadata({
	existingProtocolLlamaswapDataset
}: {
	existingProtocolLlamaswapDataset?: ProtocolLlamaswapMetadata
} = {}): Promise<CoreMetadataPayload> {
	const {
		protocols,
		chains,
		categoriesAndTags,
		cexsResponse,
		rwaList,
		rwaPerpsList,
		tokenlistArray,
		tokenDirectory,
		liquidationsResponse,
		bridgesResponse,
		emissionsProtocolsList
	} = await fetchCoreMetadataSources()

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

	return {
		protocols,
		chains,
		categoriesAndTags,
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
		bridgeProtocolSlugs,
		bridgeChainSlugs,
		bridgeChainSlugToName,
		protocolLlamaswapDataset
	}
}
