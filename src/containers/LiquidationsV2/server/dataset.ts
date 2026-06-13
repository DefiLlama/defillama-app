import { fetchProtocolLiquidations, fetchProtocolsList } from '~/containers/LiquidationsV2/api'
import type {
	LiquidationsChainPageProps,
	LiquidationsOverviewPageProps,
	LiquidationsProtocolPageProps,
	RawProtocolsResponse,
	TokenLiquidationsSectionData
} from '~/containers/LiquidationsV2/api.types'
import {
	getLiquidationsChainPageDataFromNetwork,
	getLiquidationsOverviewPageDataFromNetwork,
	getLiquidationsProtocolPageDataFromNetwork,
	getTokenLiquidationsSectionDataFromNetwork,
	hasTokenLiquidationsDataFromNetwork,
	type LiquidationsMetadataCache
} from '~/containers/LiquidationsV2/queries'
import { readThroughDatasetCache } from '~/server/datasetCache/runtime/source'
import {
	getLiquidationsChainFromCache,
	getLiquidationsOverviewFromCache,
	getLiquidationsProtocolChainIdsFromCache,
	getLiquidationsProtocolFromCache,
	getLiquidationsProtocolsResponseFromCache,
	getTokenLiquidationsFromCache,
	hasTokenLiquidationsInCache
} from './dataset.cache'

export function getLiquidationsProtocolsList(): Promise<RawProtocolsResponse> {
	return readThroughDatasetCache({
		domain: 'liquidations',
		readCache: () => getLiquidationsProtocolsResponseFromCache(),
		readNetwork: () => fetchProtocolsList()
	})
}

export function getLiquidationsProtocolChainIds(protocolId: string): Promise<string[]> {
	return readThroughDatasetCache({
		domain: 'liquidations',
		readCache: () => getLiquidationsProtocolChainIdsFromCache(protocolId),
		readNetwork: async () => Object.keys((await fetchProtocolLiquidations(protocolId)).data)
	})
}

export function getLiquidationsOverviewPageData(
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsOverviewPageProps> {
	return readThroughDatasetCache({
		domain: 'liquidations',
		readCache: () => getLiquidationsOverviewFromCache(metadataCache),
		readNetwork: () => getLiquidationsOverviewPageDataFromNetwork(metadataCache)
	})
}

export function getTokenLiquidationsSectionData(
	tokenSymbol: string,
	metadataCache: LiquidationsMetadataCache
): Promise<TokenLiquidationsSectionData | null> {
	return readThroughDatasetCache({
		domain: 'liquidations',
		readCache: () => getTokenLiquidationsFromCache(tokenSymbol, metadataCache),
		readNetwork: () => getTokenLiquidationsSectionDataFromNetwork(tokenSymbol, metadataCache)
	})
}

export function hasTokenLiquidationsData(tokenSymbol: string): Promise<boolean> {
	return readThroughDatasetCache({
		domain: 'liquidations',
		readCache: () => hasTokenLiquidationsInCache(tokenSymbol),
		readNetwork: () => hasTokenLiquidationsDataFromNetwork(tokenSymbol)
	})
}

export function getLiquidationsProtocolPageData(
	protocolParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsProtocolPageProps | null> {
	return readThroughDatasetCache({
		domain: 'liquidations',
		readCache: () => getLiquidationsProtocolFromCache(protocolParam, metadataCache),
		readNetwork: () => getLiquidationsProtocolPageDataFromNetwork(protocolParam, metadataCache)
	})
}

export function getLiquidationsChainPageData(
	protocolParam: string,
	chainParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsChainPageProps | null> {
	return readThroughDatasetCache({
		domain: 'liquidations',
		readCache: () => getLiquidationsChainFromCache(protocolParam, chainParam, metadataCache),
		readNetwork: () => getLiquidationsChainPageDataFromNetwork(protocolParam, chainParam, metadataCache)
	})
}
