interface RawChainAssetCategory {
	total: string
	breakdown: Record<string, string>
}

export interface RawChainAsset {
	canonical?: RawChainAssetCategory
	ownTokens?: RawChainAssetCategory
	native?: RawChainAssetCategory
	thirdParty?: RawChainAssetCategory
	total: RawChainAssetCategory
}

export type RawChainsAssetsResponse = Record<string, RawChainAsset>

export interface RawChainAssetsFlowEntry {
	total?: { perc?: number }
}

export type RawChainAssetsFlows1dResponse = Record<string, RawChainAssetsFlowEntry>

interface RawBridgeInflowDataPoint {
	timestamp: number
	data: Record<string, number>
}

export type RawBridgeInflowsResponse = {
	data: RawBridgeInflowDataPoint[]
}

interface RawChainAssetsChartDataPoint {
	timestamp: number
	data: {
		total: number | string
		ownTokens?: number | string
	}
}

export type RawChainAssetsChartResponse = RawChainAssetsChartDataPoint[]
