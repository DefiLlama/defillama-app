import type {
	LiquidationsChainPageProps,
	LiquidationsOverviewPageProps,
	LiquidationsProtocolPageProps,
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
import {
	getLiquidationsChainFromCache,
	getLiquidationsOverviewFromCache,
	getLiquidationsProtocolFromCache,
	getTokenLiquidationsFromCache,
	hasTokenLiquidationsInCache
} from '../liquidations'
import { readThroughDatasetCache } from './source'

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
