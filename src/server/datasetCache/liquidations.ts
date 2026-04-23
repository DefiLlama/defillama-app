import type { BlockExplorersResponse } from '~/api/types'
import type {
	LiquidationsChainPageProps,
	LiquidationsOverviewPageProps,
	LiquidationsProtocolPageProps,
	RawAllLiquidationsResponse,
	RawProtocolsResponse,
	TokenLiquidationsSectionData
} from '~/containers/LiquidationsV2/api.types'
import { createProtocolMetadataLookup } from '~/containers/LiquidationsV2/protocolMetadata'
import {
	buildLiquidationsChainPageData,
	buildLiquidationsOverviewPageData,
	buildLiquidationsProtocolPageData,
	buildTokenLiquidationsSectionData,
	resolveChainId,
	resolveProtocolId,
	type LiquidationsMetadataCache
} from '~/containers/LiquidationsV2/queries'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

function getLiquidationsDomainDir(): string {
	return getDatasetDomainDir('liquidations')
}

async function getLiquidationsProtocolsResponse(): Promise<RawProtocolsResponse> {
	return readJsonFile<RawProtocolsResponse>(`${getLiquidationsDomainDir()}/raw/protocols.json`)
}

async function getLiquidationsAllResponse(): Promise<RawAllLiquidationsResponse> {
	return readJsonFile<RawAllLiquidationsResponse>(`${getLiquidationsDomainDir()}/raw/all.json`)
}

async function getLiquidationsBlockExplorers(): Promise<BlockExplorersResponse> {
	return readJsonFile<BlockExplorersResponse>(`${getLiquidationsDomainDir()}/raw/block-explorers.json`)
}

export async function getLiquidationsOverviewFromCache(
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsOverviewPageProps> {
	await readDatasetManifest()
	const [protocolsResponse, allResponse] = await Promise.all([
		getLiquidationsProtocolsResponse(),
		getLiquidationsAllResponse()
	])
	return buildLiquidationsOverviewPageData(protocolsResponse, allResponse, metadataCache)
}

export async function getTokenLiquidationsFromCache(
	tokenSymbol: string,
	metadataCache: LiquidationsMetadataCache
): Promise<TokenLiquidationsSectionData | null> {
	await readDatasetManifest()
	const [protocolsResponse, allResponse] = await Promise.all([
		getLiquidationsProtocolsResponse(),
		getLiquidationsAllResponse()
	])
	return buildTokenLiquidationsSectionData(tokenSymbol, protocolsResponse, allResponse, metadataCache)
}

async function resolveCachedLiquidationsProtocolId(
	protocolParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<string | null> {
	const protocolsResponse = await getLiquidationsProtocolsResponse()
	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	return resolveProtocolId(protocolParam, protocolsResponse.protocols, protocolMetadataLookup)
}

export async function getLiquidationsProtocolFromCache(
	protocolParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsProtocolPageProps | null> {
	await readDatasetManifest()
	const [protocolsResponse, allResponse, blockExplorers] = await Promise.all([
		getLiquidationsProtocolsResponse(),
		getLiquidationsAllResponse(),
		getLiquidationsBlockExplorers()
	])
	const protocolId = await resolveCachedLiquidationsProtocolId(protocolParam, metadataCache)
	if (!protocolId) {
		return null
	}

	const protocolData = allResponse.data[protocolId]
	if (!protocolData) {
		return null
	}

	return buildLiquidationsProtocolPageData(
		protocolId,
		protocolsResponse.protocols,
		protocolData,
		allResponse.timestamp,
		blockExplorers,
		metadataCache
	)
}

export async function getLiquidationsChainFromCache(
	protocolParam: string,
	chainParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsChainPageProps | null> {
	await readDatasetManifest()
	const [protocolsResponse, allResponse, blockExplorers] = await Promise.all([
		getLiquidationsProtocolsResponse(),
		getLiquidationsAllResponse(),
		getLiquidationsBlockExplorers()
	])
	const protocolId = await resolveCachedLiquidationsProtocolId(protocolParam, metadataCache)
	if (!protocolId) {
		return null
	}

	const protocolData = allResponse.data[protocolId]
	if (!protocolData) {
		return null
	}
	const availableChainIds = []
	for (const chainId in protocolData) {
		availableChainIds.push(chainId)
	}

	const chainId = resolveChainId(chainParam, availableChainIds, metadataCache.chainMetadata)
	if (!chainId) {
		return null
	}

	return buildLiquidationsChainPageData(
		protocolId,
		chainId,
		protocolsResponse.protocols,
		protocolData,
		allResponse.timestamp,
		blockExplorers,
		metadataCache
	)
}
