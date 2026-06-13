import { getMetadataCache } from '~/server/routeRegistry/common'
import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import type { IProtocolMetadata } from '~/utils/metadata/types'

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

const protocolTabRoutes = [
	{ prefix: 'protocol/tvl', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.tvl },
	{ prefix: 'protocol/stablecoins', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.stablecoins },
	{ prefix: 'protocol/bridges', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.bridge },
	{ prefix: 'protocol/treasury', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.treasury },
	{ prefix: 'protocol/yields', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.yields },
	{ prefix: 'protocol/fees', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.fees },
	{ prefix: 'protocol/dexs', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.dexs },
	{ prefix: 'protocol/perps', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.perps },
	{
		prefix: 'protocol/dex-aggregators',
		hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.dexAggregators
	},
	{
		prefix: 'protocol/perps-aggregators',
		hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.perpsAggregators
	},
	{
		prefix: 'protocol/bridge-aggregators',
		hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.bridgeAggregators
	},
	{
		prefix: 'protocol/options',
		hasMetric: (meta: MetadataCache['protocolMetadata'][string]) =>
			meta.optionsPremiumVolume || meta.optionsNotionalVolume
	},
	{ prefix: 'protocol/token-rights', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.tokenRights },
	{ prefix: 'protocol/unlocks', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.emissions },
	{ prefix: 'protocol/governance', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.governance },
	{ prefix: 'protocol/forks', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.forks }
]

const standaloneProtocolRoutes = [
	{ prefix: 'unlocks', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.emissions },
	{ prefix: 'governance', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.governance },
	{ prefix: 'forks', hasMetric: (meta: MetadataCache['protocolMetadata'][string]) => meta.forks }
]

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

		if (String(name).startsWith('Uniswap')) {
			slugs.add(protocolSlug)
			if (slugs.size >= limit) break
		}

		const canonicalSlug = metadata.parentProtocol
			? slug(metadata.parentProtocol.replace('parent#', '')) || protocolSlug
			: protocolSlug
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

export function getProtocolSitemapRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const protocolId in metadataCache.protocolMetadata) {
		const metadata = metadataCache.protocolMetadata[protocolId]
		if (!metadata.displayName && !metadata.name) continue
		const protocolSlug = getProtocolSlug(metadata, protocolId)

		routes.push(`protocol/${protocolSlug}`)
	}

	for (const routeDef of protocolTabRoutes) {
		for (const protocolSlug of getProtocolFeatureSlugsFromMetadata(metadataCache, routeDef.hasMetric)) {
			routes.push(`${routeDef.prefix}/${protocolSlug}`)
		}
	}

	return routes
}

export function getStandaloneProtocolSitemapRoutes(
	metadataCache: MetadataCache
): Record<'unlocks' | 'governance' | 'forks', string[]> {
	const routes = {
		unlocks: [] as string[],
		governance: [] as string[],
		forks: [] as string[]
	}

	for (const routeDef of standaloneProtocolRoutes) {
		for (const protocolSlug of getProtocolFeatureSlugsFromMetadata(metadataCache, routeDef.hasMetric)) {
			routes[routeDef.prefix as keyof typeof routes].push(`${routeDef.prefix}/${protocolSlug}`)
		}
	}

	for (const protocolSlug of metadataCache.emissionsProtocolsList) {
		routes.unlocks.push(`unlocks/${protocolSlug}`)
	}

	return routes
}
