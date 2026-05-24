import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { getMetadataCache } from './common'

const EXCLUDED_OVERVIEW_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Staking Pool'])

export type ProtocolRoute = {
	id: string
	metadata: IProtocolMetadata
	canonicalSlug: string
}

type ProtocolMetric =
	| 'tvl'
	| 'stablecoins'
	| 'bridge'
	| 'treasury'
	| 'yields'
	| 'fees'
	| 'dexs'
	| 'perps'
	| 'dexAggregators'
	| 'perpsAggregators'
	| 'bridgeAggregators'
	| 'tokenRights'
	| 'emissions'
	| 'governance'
	| 'forks'
	| 'raises'

export function getProtocolSlug(metadata: IProtocolMetadata, protocolId: string): string {
	return slug(metadata.displayName || metadata.name || protocolId)
}

export function resolveProtocolParamFromMetadata(protocol: string, metadataCache: MetadataCache): ProtocolRoute | null {
	const normalizedProtocol = slug(protocol)
	if (!normalizedProtocol || normalizedProtocol === 'null' || normalizedProtocol === 'undefined') return null

	for (const protocolId in metadataCache.protocolMetadata) {
		const metadata = metadataCache.protocolMetadata[protocolId]
		if (
			slug(metadata.displayName) === normalizedProtocol ||
			slug(metadata.name) === normalizedProtocol ||
			slug(protocolId) === normalizedProtocol
		) {
			return {
				id: protocolId,
				metadata,
				canonicalSlug: getProtocolSlug(metadata, protocolId)
			}
		}
	}

	return null
}

export async function resolveProtocolParam(protocol: string): Promise<ProtocolRoute | null> {
	return resolveProtocolParamFromMetadata(protocol, await getMetadataCache())
}

export function getProtocolOverviewSlugsFromMetadata(metadataCache: MetadataCache, limit: number): string[] {
	const slugs = new Set<string>()

	for (const protocolId in metadataCache.protocolMetadata) {
		const metadata = metadataCache.protocolMetadata[protocolId]
		if (EXCLUDED_OVERVIEW_CATEGORIES.has(metadata.category ?? '')) continue

		const name = metadata.displayName || metadata.name
		if (!name) continue
		const protocolSlug = slug(name)

		if (String(name).startsWith('Uniswap')) slugs.add(protocolSlug)

		const canonicalSlug = metadata.parentProtocol ? slug(metadata.parentProtocol.replace('parent#', '')) : protocolSlug
		slugs.add(canonicalSlug)

		if (slugs.size >= limit) break
	}

	return [...slugs].slice(0, limit)
}

export async function getProtocolOverviewStaticPaths(limit = 35): Promise<string[]> {
	const metadataCache = await getMetadataCache()
	return getProtocolOverviewSlugsFromMetadata(metadataCache, limit).map((protocolSlug) => `/protocol/${protocolSlug}`)
}

export function getProtocolFeatureSlugsFromMetadata(
	metadataCache: MetadataCache,
	hasMetric: (metadata: IProtocolMetadata) => boolean
): string[] {
	const slugs = new Set<string>()

	for (const protocolId in metadataCache.protocolMetadata) {
		const metadata = metadataCache.protocolMetadata[protocolId]
		if (!hasMetric(metadata)) continue

		slugs.add(getProtocolSlug(metadata, protocolId))
	}

	return [...slugs]
}

export function getProtocolMetricSlugsFromMetadata(metadataCache: MetadataCache, metric: ProtocolMetric): string[] {
	return getProtocolFeatureSlugsFromMetadata(metadataCache, (metadata) => Boolean(metadata[metric]))
}

export async function getProtocolMetricSlugs(metric: ProtocolMetric): Promise<string[]> {
	return getProtocolMetricSlugsFromMetadata(await getMetadataCache(), metric)
}
