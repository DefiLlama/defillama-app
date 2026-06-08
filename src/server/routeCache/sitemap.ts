import { FEATURES_SERVER } from '~/constants'
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
	'protocols-by-category',
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
	'narratives',
	'pro-dashboards'
] as const

export type SitemapSectionId =
	| (typeof SITEMAP_SECTION_IDS)[number]
	| `${(typeof SITEMAP_SECTION_IDS)[number]}-${number}`
type BaseSitemapSectionId = (typeof SITEMAP_SECTION_IDS)[number]

export type SitemapSection = {
	id: SitemapSectionId
	entries: SitemapUrlEntry[]
}

const MAX_SITEMAP_URLS = 49_000
const SITEMAP_SECTION_CACHE_TTL_MS = 60 * 60 * 1000
const PRO_DASHBOARD_SITEMAP_LIMIT = 1_000
const PRO_DASHBOARD_SITEMAP_PAGE_SIZE = 100
const PRO_DASHBOARD_SITEMAP_FETCH_TIMEOUT_MS = 10_000

type SitemapSectionCache = {
	expiresAt: number
	sections: SitemapSection[]
	sectionsById: Map<string, SitemapSection>
}

let sitemapSectionCache: SitemapSectionCache | null = null
let sitemapSectionRefreshPromise: Promise<void> | null = null

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
		const path = normalizeSitemapRoute(route)
		if (path != null) paths.add(path)
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

async function buildCexRoutes(metadataCache: MetadataCache): Promise<string[]> {
	const routes: string[] = []
	const cexSlugs = getCexSlugsFromMetadata(metadataCache)

	for (const cexSlug of cexSlugs) {
		routes.push(`cex/${cexSlug}`)
		routes.push(`cex/assets/${cexSlug}`)
		routes.push(`cex/stablecoins/${cexSlug}`)
	}

	const { fetchExchangeMarketsListFromCache } = await import('~/server/datasetCache/markets')
	const marketsList = await fetchExchangeMarketsListFromCache()
	const marketCexSlugs = new Set<string>()

	for (const entries of Object.values(marketsList.cex)) {
		for (const entry of entries) {
			const cexSlug = slug(entry.defillama_slug ?? '')
			if (cexSlug) marketCexSlugs.add(cexSlug)
		}
	}

	for (const cexSlug of marketCexSlugs) {
		routes.push(`cex/markets/${cexSlug}`)
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
	const routes: string[] = []
	const { getLiquidationsProtocolsResponseFromCache, getLiquidationsProtocolChainIdsFromCache } =
		await import('~/server/datasetCache/liquidations')
	const protocolsResponse = await getLiquidationsProtocolsResponseFromCache()
	const protocolChainIds = await Promise.all(
		protocolsResponse.protocols.map(async (protocolId) => ({
			protocolId,
			chainIds: await getLiquidationsProtocolChainIdsFromCache(protocolId)
		}))
	)

	for (const { protocolId, chainIds } of protocolChainIds) {
		routes.push(`liquidations/${protocolId}`)
		for (const chainId of chainIds) {
			const chainMetadata = metadataCache.chainMetadata[slug(chainId)]
			const chainSlug = slug(chainMetadata?.name ?? chainId)
			if (chainSlug) routes.push(`liquidations/${protocolId}/${chainSlug}`)
		}
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

type ProDashboardSearchItem = {
	id?: string
	editedAt?: string
	updated?: string
	created?: string
}

type ProDashboardSearchResponse = {
	items?: ProDashboardSearchItem[]
	totalPages?: number
}

async function fetchProDashboardSearchPage(params: URLSearchParams): Promise<ProDashboardSearchResponse> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), PRO_DASHBOARD_SITEMAP_FETCH_TIMEOUT_MS)

	try {
		const response = await fetch(`${FEATURES_SERVER}/dashboards/search?${params.toString()}`, {
			signal: controller.signal
		})

		if (!response.ok) {
			throw new Error(`features-server responded with ${response.status}`)
		}

		return (await response.json()) as ProDashboardSearchResponse
	} finally {
		clearTimeout(timeout)
	}
}

async function buildProDashboardEntries(): Promise<SitemapUrlEntry[]> {
	const entries: SitemapUrlEntry[] = []
	const seen = new Set<string>()
	const maxPages = Math.ceil(PRO_DASHBOARD_SITEMAP_LIMIT / PRO_DASHBOARD_SITEMAP_PAGE_SIZE)
	let page = 1

	try {
		while (page <= maxPages && entries.length < PRO_DASHBOARD_SITEMAP_LIMIT) {
			const params = new URLSearchParams({
				visibility: 'public',
				sortBy: 'popular',
				page: String(page),
				limit: String(PRO_DASHBOARD_SITEMAP_PAGE_SIZE)
			})
			const data = await fetchProDashboardSearchPage(params)
			const dashboards = Array.isArray(data.items) ? data.items : []

			for (const dashboard of dashboards) {
				if (!dashboard.id || seen.has(dashboard.id)) continue
				seen.add(dashboard.id)
				entries.push({
					path: `pro/${dashboard.id}`,
					lastmod: dashboard.editedAt || dashboard.updated || dashboard.created
				})
				if (entries.length >= PRO_DASHBOARD_SITEMAP_LIMIT) break
			}

			const totalPages = typeof data.totalPages === 'number' && data.totalPages > 0 ? data.totalPages : page
			if (page >= totalPages || dashboards.length === 0) break
			page += 1
		}
	} catch (error) {
		console.warn('[sitemap] failed to build pro dashboard entries', error)
	}

	return entries
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

async function buildBaseSitemapSection(
	sectionId: BaseSitemapSectionId,
	metadataCache: MetadataCache
): Promise<SitemapSection> {
	switch (sectionId) {
		case 'static':
			return { id: sectionId, entries: toEntries(getNavRoutes()) }
		case 'chains':
			return { id: sectionId, entries: toEntries(buildChainRoutes(metadataCache)) }
		case 'protocols':
			return { id: sectionId, entries: toEntries(buildProtocolRoutes(metadataCache)) }
		case 'protocols-by-category':
			return {
				id: sectionId,
				entries: toEntries(getProtocolListingSlugsFromMetadata(metadataCache).map((item) => `protocols/${item}`))
			}
		case 'stablecoins':
			return { id: sectionId, entries: toEntries(buildStablecoinRoutes(metadataCache)) }
		case 'cexs':
			return { id: sectionId, entries: toEntries(await buildCexRoutes(metadataCache)) }
		case 'bridges':
			return { id: sectionId, entries: toEntries(getBridgeRoutesFromMetadata(metadataCache)) }
		case 'rwa':
			return { id: sectionId, entries: toEntries(getRWARoutesFromMetadata(metadataCache)) }
		case 'dat':
			return { id: sectionId, entries: toEntries(buildDATRoutes(metadataCache)) }
		case 'oracles':
			return { id: sectionId, entries: toEntries(buildOracleRoutes(metadataCache)) }
		case 'liquidations':
			return { id: sectionId, entries: toEntries(await buildLiquidationsRoutes(metadataCache)) }
		case 'unlocks':
		case 'governance':
		case 'forks':
			return { id: sectionId, entries: toEntries(buildStandaloneProtocolRoutes(metadataCache)[sectionId]) }
		case 'raises':
			return { id: sectionId, entries: toEntries(await getRaisesInvestorRoutes()) }
		case 'narratives':
			return { id: sectionId, entries: toEntries(buildNarrativeRoutes(metadataCache)) }
		case 'pro-dashboards':
			return { id: sectionId, entries: await buildProDashboardEntries() }
	}
}

async function buildAppSitemapSectionsFromCacheArtifacts(): Promise<SitemapSection[]> {
	const metadataCache = await getMetadataCache()
	const sections = await Promise.all(
		SITEMAP_SECTION_IDS.map((sectionId) => buildBaseSitemapSection(sectionId, metadataCache))
	)

	return sections.flatMap(splitLargeSection)
}

async function rebuildSitemapSectionCache(): Promise<SitemapSectionCache> {
	const sections = await buildAppSitemapSectionsFromCacheArtifacts()
	const nextCache = {
		expiresAt: Date.now() + SITEMAP_SECTION_CACHE_TTL_MS,
		sections,
		sectionsById: new Map(sections.map((section) => [section.id, section]))
	}
	sitemapSectionCache = nextCache

	return nextCache
}

function refreshSitemapSectionCacheInBackground(): void {
	if (sitemapSectionRefreshPromise) {
		return
	}

	sitemapSectionRefreshPromise = rebuildSitemapSectionCache()
		.then(() => undefined)
		.catch((error) => {
			console.warn('[sitemap] failed to refresh sitemap cache; serving stale snapshot', error)
		})
		.finally(() => {
			sitemapSectionRefreshPromise = null
		})
}

async function getCachedSitemapSections(): Promise<SitemapSectionCache> {
	if (!sitemapSectionCache) {
		return rebuildSitemapSectionCache()
	}

	if (sitemapSectionCache.expiresAt <= Date.now()) {
		refreshSitemapSectionCacheInBackground()
	}

	return sitemapSectionCache
}

export async function buildAppSitemapSections(): Promise<SitemapSection[]> {
	return (await getCachedSitemapSections()).sections
}

export function getSitemapSectionPath(sectionId: SitemapSectionId): string {
	return `sitemap/${sectionId}.xml`
}

export function normalizeSitemapSectionId(sectionId: string): string {
	return sectionId.endsWith('.xml') ? sectionId.slice(0, -4) : sectionId
}

export async function getSitemapSection(sectionId: string): Promise<SitemapSection | null> {
	const normalizedSectionId = normalizeSitemapSectionId(sectionId)
	return (await getCachedSitemapSections()).sectionsById.get(normalizedSectionId) ?? null
}
