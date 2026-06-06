import { rwaSlug } from '~/containers/RWA/rwaSlug'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

export function getRWARoutesFromMetadata(metadataCache: MetadataCache): string[] {
	const routes: string[] = ['rwa/perps/forex']
	const { rwaList, rwaPerpsList } = metadataCache

	for (const canonicalMarketId of rwaList.canonicalMarketIds) {
		routes.push(`rwa/asset/${encodeURIComponent(canonicalMarketId)}`)
	}
	for (const platform of rwaList.platforms) {
		routes.push(`rwa/platform/${rwaSlug(platform)}`)
	}
	for (const chain of rwaList.chains) {
		routes.push(`rwa/chain/${rwaSlug(chain)}`)
	}
	for (const category of rwaList.categories) {
		const categorySlug = rwaSlug(category)
		if (categorySlug !== 'rwa-perps') routes.push(`rwa/category/${categorySlug}`)
	}
	for (const assetGroup of rwaList.assetGroups) {
		routes.push(`rwa/asset-group/${rwaSlug(assetGroup)}`)
	}

	for (const contract of rwaPerpsList.contracts) {
		routes.push(`rwa/perps/contract/${rwaSlug(contract)}`)
	}
	for (const venue of rwaPerpsList.venues) {
		routes.push(`rwa/perps/venue/${rwaSlug(venue)}`)
	}
	for (const assetGroup of rwaPerpsList.assetGroups) {
		routes.push(`rwa/perps/asset-group/${rwaSlug(assetGroup)}`)
	}

	return routes
}
