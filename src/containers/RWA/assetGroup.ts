export const UNKNOWN_RWA_ASSET_GROUP = 'Unknown'

export function normalizeRwaAssetGroup(assetGroup: string | null | undefined): string {
	// Keep every asset addressable by a concrete bucket key, even when the API omits assetGroup.
	const normalizedAssetGroup = typeof assetGroup === 'string' ? assetGroup.trim() : ''
	return normalizedAssetGroup.length > 0 ? normalizedAssetGroup : UNKNOWN_RWA_ASSET_GROUP
}

export function appendUnknownRwaAssetGroup(assetGroups: string[]): string[] {
	return assetGroups.includes(UNKNOWN_RWA_ASSET_GROUP) ? assetGroups : [...assetGroups, UNKNOWN_RWA_ASSET_GROUP]
}
