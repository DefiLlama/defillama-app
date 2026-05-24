import defillamaPages from '~/public/pages.json'
import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import { normalizeSitemapRoute, type SitemapUrlEntry } from '~/utils/sitemapXml'
import { getCexSlugsFromMetadata, getProtocolListingSlugsFromMetadata } from './assets'
import { getBridgeRoutesFromMetadata } from './bridges'
import { getChainMetricSlugsFromMetadata, getChainSlugsFromMetadata } from './chains'
import { getMetadataCache } from './common'
import { getProtocolFeatureSlugsFromMetadata, getProtocolSlug } from './protocols'
import { getRaisesInvestorRoutes } from './raises'
import { getRWARoutesFromMetadata } from './rwa'

export const SITEMAP_SECTION_IDS = [
	'static',
	'chains',
	'protocols',
	'protocol-listings',
	'stablecoins',
	'cexs',
	'bridges',
	'rwa',
	'dat',
	'oracles',
	'liquidations',
	'unlocks',
	'governance',
	'forks',
	'raises',
	'tokens',
	'narratives'
] as const

export type SitemapSectionId =
	| (typeof SITEMAP_SECTION_IDS)[number]
	| `${(typeof SITEMAP_SECTION_IDS)[number]}-${number}`

export type SitemapSection = {
	id: SitemapSectionId
	entries: SitemapUrlEntry[]
}

const MAX_SITEMAP_URLS = 49_000

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

const chainFlaggedRoutes = [
	{ prefix: 'stablecoins', flag: 'stablecoins' },
	{ prefix: 'bridged', flag: 'chainAssets' },
	{ prefix: 'fees/chain', flag: 'fees' },
	{ prefix: 'revenue/chain', flag: 'fees' },
	{ prefix: 'earnings/chain', flag: 'fees' },
	{ prefix: 'holders-revenue/chain', flag: 'fees' },
	{ prefix: 'pf/chain', flag: 'fees' },
	{ prefix: 'ps/chain', flag: 'fees' },
	{ prefix: 'dexs/chain', flag: 'dexs' },
	{ prefix: 'perps/chain', flag: 'perps' },
	{ prefix: 'dex-aggregators/chain', flag: 'dexAggregators' },
	{ prefix: 'perps-aggregators/chain', flag: 'perpsAggregators' },
	{ prefix: 'bridge-aggregators/chain', flag: 'bridgeAggregators' },
	{ prefix: 'open-interest/chain', flag: 'openInterest' },
	{ prefix: 'normalized-volume/chain', flag: 'normalizedVolume' },
	{ prefix: 'options/notional-volume/chain', flag: 'optionsNotionalVolume' },
	{ prefix: 'options/premium-volume/chain', flag: 'optionsNotionalVolume' }
] as const

function stripQuery(route: string): string {
	return route.split('?')[0]
}

function toEntries(routes: string[]): SitemapUrlEntry[] {
	const paths = new Set<string>()

	for (const route of routes) {
		paths.add(normalizeSitemapRoute(route)!)
	}

	return [...paths].map((path) => ({ path }))
}

function getNavRoutes(): string[] {
	const routes: string[] = []

	for (const category in defillamaPages) {
		if (category === 'Hidden') continue
		for (const page of defillamaPages[category as keyof typeof defillamaPages]) {
			if (typeof page.route !== 'string') continue
			if (page.route.startsWith('https://') || page.route.startsWith('http://')) continue
			const route = normalizeSitemapRoute(stripQuery(page.route))
			if (route != null) routes.push(route)
		}
	}

	return routes
}

function buildProtocolRoutes(metadataCache: MetadataCache): string[] {
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

function buildStandaloneProtocolRoutes(
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

function buildChainRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const chainSlug of getChainSlugsFromMetadata(metadataCache)) {
		routes.push(`chain/${chainSlug}`)
	}

	for (const routeDef of chainFlaggedRoutes) {
		for (const chainSlug of getChainMetricSlugsFromMetadata(metadataCache, routeDef.flag)) {
			routes.push(`${routeDef.prefix}/${chainSlug}`)
		}
	}

	return routes
}

function buildStablecoinRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const stablecoinSlug of metadataCache.stablecoinPeggedAssetSlugs) {
		routes.push(`stablecoin/${stablecoinSlug}`)
	}
	for (const chainSlug of getChainMetricSlugsFromMetadata(metadataCache, 'stablecoins')) {
		routes.push(`stablecoins/${chainSlug}`)
	}

	return routes
}

function buildDATRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const companySlug of metadataCache.digitalAssetTreasuryRoutes.companySlugs) {
		routes.push(`digital-asset-treasury/${companySlug}`)
	}
	for (const assetSlug of metadataCache.digitalAssetTreasuryRoutes.assetSlugs) {
		routes.push(`digital-asset-treasuries/${assetSlug}`)
	}

	return routes
}

function buildOracleRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []
	const { oracleNameBySlug, chainSlugsByOracleSlug, chainNameBySlug } = metadataCache.oracleRoutes

	for (const oracleSlug in oracleNameBySlug) {
		routes.push(`oracles/${oracleSlug}`)
		for (const chainSlug of chainSlugsByOracleSlug[oracleSlug] ?? []) {
			routes.push(`oracles/${oracleSlug}/${chainSlug}`)
		}
	}
	for (const chainSlug in chainNameBySlug) {
		routes.push(`oracles/chain/${chainSlug}`)
	}

	return routes
}

async function buildLiquidationsRoutes(metadataCache: MetadataCache): Promise<string[]> {
	const routes: string[] = ['liquidations']
	const { getLiquidationsProtocolsResponseFromCache, getLiquidationsProtocolChainIdsFromCache } =
		await import('~/server/datasetCache/liquidations')
	const protocolsResponse = await getLiquidationsProtocolsResponseFromCache()

	for (const protocolId of protocolsResponse.protocols) {
		routes.push(`liquidations/${protocolId}`)
		for (const chainId of await getLiquidationsProtocolChainIdsFromCache(protocolId)) {
			const chainMetadata = metadataCache.chainMetadata[slug(chainId)]
			const chainSlug = slug(chainMetadata?.name ?? chainId)
			routes.push(`liquidations/${protocolId}/${chainSlug}`)
		}
	}

	return routes
}

function buildTokenRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const key in metadataCache.tokenDirectory) {
		const route = metadataCache.tokenDirectory[key].route
		if (route) routes.push(route)
	}

	return routes
}

function buildNarrativeRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const categoryId of metadataCache.narrativeCategories.ids) {
		routes.push(`narrative-tracker/${categoryId}`)
	}

	return routes
}

function splitLargeSection(section: SitemapSection): SitemapSection[] {
	if (section.entries.length <= MAX_SITEMAP_URLS) return [section]

	const sections: SitemapSection[] = []
	for (let i = 0; i < section.entries.length; i += MAX_SITEMAP_URLS) {
		sections.push({
			id: `${section.id}-${sections.length + 1}` as SitemapSectionId,
			entries: section.entries.slice(i, i + MAX_SITEMAP_URLS)
		})
	}
	return sections
}

export async function buildAppSitemapSections(): Promise<SitemapSection[]> {
	const metadataCache = await getMetadataCache()
	const standaloneRoutes = buildStandaloneProtocolRoutes(metadataCache)

	const [liquidationsRoutes, raisesRoutes] = await Promise.all([
		buildLiquidationsRoutes(metadataCache),
		getRaisesInvestorRoutes()
	])

	const sections: SitemapSection[] = [
		{ id: 'static', entries: toEntries(getNavRoutes()) },
		{ id: 'chains', entries: toEntries(buildChainRoutes(metadataCache)) },
		{ id: 'protocols', entries: toEntries(buildProtocolRoutes(metadataCache)) },
		{
			id: 'protocol-listings',
			entries: toEntries(getProtocolListingSlugsFromMetadata(metadataCache).map((item) => `protocols/${item}`))
		},
		{ id: 'stablecoins', entries: toEntries(buildStablecoinRoutes(metadataCache)) },
		{ id: 'cexs', entries: toEntries(getCexSlugsFromMetadata(metadataCache).map((cexSlug) => `cex/${cexSlug}`)) },
		{ id: 'bridges', entries: toEntries(getBridgeRoutesFromMetadata(metadataCache)) },
		{ id: 'rwa', entries: toEntries(getRWARoutesFromMetadata(metadataCache)) },
		{ id: 'dat', entries: toEntries(buildDATRoutes(metadataCache)) },
		{ id: 'oracles', entries: toEntries(buildOracleRoutes(metadataCache)) },
		{ id: 'liquidations', entries: toEntries(liquidationsRoutes) },
		{ id: 'unlocks', entries: toEntries(standaloneRoutes.unlocks) },
		{ id: 'governance', entries: toEntries(standaloneRoutes.governance) },
		{ id: 'forks', entries: toEntries(standaloneRoutes.forks) },
		{ id: 'raises', entries: toEntries(raisesRoutes) },
		{ id: 'tokens', entries: toEntries(buildTokenRoutes(metadataCache)) },
		{ id: 'narratives', entries: toEntries(buildNarrativeRoutes(metadataCache)) }
	]

	return sections.flatMap(splitLargeSection)
}

export function getSitemapSectionPath(sectionId: SitemapSectionId): string {
	return `sitemap/${sectionId}.xml`
}

export function normalizeSitemapSectionId(sectionId: string): string {
	return sectionId.endsWith('.xml') ? sectionId.slice(0, -4) : sectionId
}

export async function getSitemapSection(sectionId: string): Promise<SitemapSection | null> {
	const normalizedSectionId = normalizeSitemapSectionId(sectionId)
	for (const section of await buildAppSitemapSections()) {
		if (section.id === normalizedSectionId) return section
	}
	return null
}
