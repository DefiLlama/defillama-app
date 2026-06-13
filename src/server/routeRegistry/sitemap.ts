import { getBridgeSitemapRoutes } from '~/containers/Bridges/server/routes'
import { getCexSitemapRoutes } from '~/containers/Cexs/server/routes'
import { getChainSitemapRoutes } from '~/containers/ChainOverview/server/routes'
import { getDATSitemapRoutes } from '~/containers/DAT/server/routes'
import { getLiquidationsSitemapRoutes } from '~/containers/LiquidationsV2/server/routes'
import { getNarrativeSitemapRoutes } from '~/containers/NarrativeTracker/server/routes'
import { getOracleSitemapRoutes } from '~/containers/Oracles/server/routes'
import { getProDashboardSitemapEntries } from '~/containers/ProDashboard/server/routes'
import {
	getProtocolSitemapRoutes,
	getStandaloneProtocolSitemapRoutes
} from '~/containers/ProtocolOverview/server/routes'
import { getProtocolListingSlugsFromMetadata } from '~/containers/ProtocolTaxonomy/server/routes'
import { getRaisesSitemapRoutes } from '~/containers/Raises/server/routes'
import { getRWASitemapRoutes } from '~/containers/RWA/server/routes'
import { getStablecoinSitemapRoutes } from '~/containers/Stablecoins/server/routes'
import defillamaPages from '~/public/pages.json'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import { normalizeSitemapRoute, type SitemapUrlEntry } from '~/utils/sitemapXml'
import { getMetadataCache } from './common'

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

type SitemapSectionCache = {
	expiresAt: number
	sections: SitemapSection[]
	sectionsById: Map<string, SitemapSection>
}

let sitemapSectionCache: SitemapSectionCache | null = null
let sitemapSectionRefreshPromise: Promise<void> | null = null

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
			return { id: sectionId, entries: toEntries(getChainSitemapRoutes(metadataCache)) }
		case 'protocols':
			return { id: sectionId, entries: toEntries(getProtocolSitemapRoutes(metadataCache)) }
		case 'protocols-by-category':
			return {
				id: sectionId,
				entries: toEntries(getProtocolListingSlugsFromMetadata(metadataCache).map((item) => `protocols/${item}`))
			}
		case 'stablecoins':
			return { id: sectionId, entries: toEntries(await getStablecoinSitemapRoutes(metadataCache)) }
		case 'cexs':
			return { id: sectionId, entries: toEntries(await getCexSitemapRoutes(metadataCache)) }
		case 'bridges':
			return { id: sectionId, entries: toEntries(getBridgeSitemapRoutes(metadataCache)) }
		case 'rwa':
			return { id: sectionId, entries: toEntries(getRWASitemapRoutes(metadataCache)) }
		case 'dat':
			return { id: sectionId, entries: toEntries(getDATSitemapRoutes(metadataCache)) }
		case 'oracles':
			return { id: sectionId, entries: toEntries(getOracleSitemapRoutes(metadataCache)) }
		case 'liquidations':
			return { id: sectionId, entries: toEntries(await getLiquidationsSitemapRoutes(metadataCache)) }
		case 'unlocks':
		case 'governance':
		case 'forks':
			return { id: sectionId, entries: toEntries(getStandaloneProtocolSitemapRoutes(metadataCache)[sectionId]) }
		case 'raises':
			return { id: sectionId, entries: toEntries(await getRaisesSitemapRoutes()) }
		case 'narratives':
			return { id: sectionId, entries: toEntries(getNarrativeSitemapRoutes(metadataCache)) }
		case 'pro-dashboards':
			return { id: sectionId, entries: await getProDashboardSitemapEntries() }
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
