import { rwaSlug } from '~/containers/RWA/rwaSlug'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

export function getRWARoutesFromMetadata(metadataCache: MetadataCache): string[] {
	const routes: string[] = []
	const { rwaList, rwaPerpsList } = metadataCache

	for (const canonicalMarketId of rwaList.canonicalMarketIds) {
		if (canonicalMarketId) routes.push(`rwa/asset/${encodeURIComponent(canonicalMarketId)}`)
	}
	for (const platform of rwaList.platforms) {
		const platformSlug = rwaSlug(platform)
		if (platformSlug) routes.push(`rwa/platform/${platformSlug}`)
	}
	for (const chain of rwaList.chains) {
		const chainSlug = rwaSlug(chain)
		if (chainSlug) routes.push(`rwa/chain/${chainSlug}`)
	}
	for (const category of rwaList.categories) {
		const categorySlug = rwaSlug(category)
		if (categorySlug && categorySlug !== 'rwa-perps') routes.push(`rwa/category/${categorySlug}`)
	}
	for (const assetGroup of rwaList.assetGroups) {
		const assetGroupSlug = rwaSlug(assetGroup)
		if (assetGroupSlug) routes.push(`rwa/asset-group/${assetGroupSlug}`)
	}

	for (const contract of rwaPerpsList.contracts) {
		const contractSlug = rwaSlug(contract)
		if (contractSlug) routes.push(`rwa/perps/contract/${contractSlug}`)
	}
	for (const venue of rwaPerpsList.venues) {
		const venueSlug = rwaSlug(venue)
		if (venueSlug) routes.push(`rwa/perps/venue/${venueSlug}`)
	}
	for (const category of rwaPerpsList.categories) {
		const categorySlug = rwaSlug(category)
		if (categorySlug) routes.push(`rwa/perps/category/${categorySlug}`)
	}
	for (const assetGroup of rwaPerpsList.assetGroups) {
		const assetGroupSlug = rwaSlug(assetGroup)
		if (assetGroupSlug) routes.push(`rwa/perps/asset-group/${assetGroupSlug}`)
	}

	return routes
}
