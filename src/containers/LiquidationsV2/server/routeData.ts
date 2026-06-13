import { getLiquidationsProtocolChainIdsFromCache, getLiquidationsProtocolsResponseFromCache } from './dataset.cache'

export type LiquidationsSitemapProtocolChains = Array<{
	protocolId: string
	chainIds: string[]
}>

export async function getLiquidationsSitemapProtocolChainsFromCache(): Promise<LiquidationsSitemapProtocolChains> {
	const protocolsResponse = await getLiquidationsProtocolsResponseFromCache()
	return Promise.all(
		protocolsResponse.protocols.map(async (protocolId) => ({
			protocolId,
			chainIds: await getLiquidationsProtocolChainIdsFromCache(protocolId)
		}))
	)
}
