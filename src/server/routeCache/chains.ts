import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import type { IChainMetadata } from '~/utils/metadata/types'
import { getMetadataCache, type StaticParamPath } from './common'

export type ChainRoute = {
	metadata: IChainMetadata
	canonicalSlug: string
	canonicalName: string
}

type ChainMetric =
	| 'stablecoins'
	| 'chainAssets'
	| 'fees'
	| 'dexs'
	| 'perps'
	| 'dexAggregators'
	| 'perpsAggregators'
	| 'bridgeAggregators'
	| 'openInterest'
	| 'normalizedVolume'
	| 'optionsNotionalVolume'

export function resolveChainParamFromMetadata(chain: string, metadataCache: MetadataCache): ChainRoute | null {
	const normalizedChain = slug(chain)
	if (!normalizedChain) return null

	for (const chainSlug in metadataCache.chainMetadata) {
		const metadata = metadataCache.chainMetadata[chainSlug]
		if (
			chainSlug === normalizedChain ||
			slug(metadata.name) === normalizedChain ||
			slug(metadata.id) === normalizedChain
		) {
			return {
				metadata,
				canonicalSlug: slug(metadata.name),
				canonicalName: metadata.name
			}
		}
	}

	return null
}

export async function resolveChainParam(chain: string): Promise<ChainRoute | null> {
	return resolveChainParamFromMetadata(chain, await getMetadataCache())
}

export function getChainSlugsFromMetadata(metadataCache: MetadataCache): string[] {
	const slugs = new Set<string>()

	for (const chainSlug in metadataCache.chainMetadata) {
		const metadata = metadataCache.chainMetadata[chainSlug]
		const canonicalSlug = slug(metadata.name)
		if (canonicalSlug === 'all') continue
		slugs.add(canonicalSlug)
	}

	return [...slugs]
}

export async function getChainStaticPaths(): Promise<Array<StaticParamPath<'chain'>>> {
	return getChainSlugsFromMetadata(await getMetadataCache()).map((chain) => ({ params: { chain } }))
}

export function getChainMetricSlugsFromMetadata(metadataCache: MetadataCache, metric: ChainMetric): string[] {
	const slugs = new Set<string>()

	for (const chainSlug in metadataCache.chainMetadata) {
		const metadata = metadataCache.chainMetadata[chainSlug]
		if (!metadata[metric]) continue

		const canonicalSlug = slug(metadata.name)
		if (canonicalSlug === 'all') continue

		slugs.add(canonicalSlug)
	}

	return [...slugs]
}

export async function getStablecoinChainStaticPaths(limit = 11): Promise<Array<StaticParamPath<'chain'>>> {
	const metadataCache = await getMetadataCache()
	return getChainMetricSlugsFromMetadata(metadataCache, 'stablecoins')
		.slice(0, limit)
		.map((chain) => ({ params: { chain } }))
}
