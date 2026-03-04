import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import defillamaPages from '~/public/pages.json'
import { slug } from '~/utils'

const baseUrl = `https://defillama.com`
const protocolTabRoutes = [
	{ prefix: 'protocol/tvl', hasMetric: (meta) => meta.tvl },
	{ prefix: 'protocol/borrowed', hasMetric: (meta) => meta.borrowed },
	{ prefix: 'protocol/stablecoins', hasMetric: (meta) => meta.stablecoins },
	{ prefix: 'protocol/bridges', hasMetric: (meta) => meta.bridge },
	{ prefix: 'protocol/treasury', hasMetric: (meta) => meta.treasury },
	{ prefix: 'protocol/yields', hasMetric: (meta) => meta.yields },
	{ prefix: 'protocol/fees', hasMetric: (meta) => meta.fees },
	{ prefix: 'protocol/dexs', hasMetric: (meta) => meta.dexs },
	{ prefix: 'protocol/perps', hasMetric: (meta) => meta.perps },
	{ prefix: 'protocol/dex-aggregators', hasMetric: (meta) => meta.dexAggregators },
	{ prefix: 'protocol/perps-aggregators', hasMetric: (meta) => meta.perpsAggregators },
	{ prefix: 'protocol/bridge-aggregators', hasMetric: (meta) => meta.bridgeAggregators },
	{ prefix: 'protocol/options', hasMetric: (meta) => meta.optionsPremiumVolume || meta.optionsNotionalVolume },
	{ prefix: 'protocol/token-rights', hasMetric: (meta) => meta.tokenRights }
]
const standaloneProtocolRoutes = [
	{ prefix: 'unlocks', hasMetric: (meta) => meta.emissions },
	{ prefix: 'governance', hasMetric: (meta) => meta.governance },
	{ prefix: 'forks', hasMetric: (meta) => meta.forks }
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
	// `/options/premium-volume/chain/[chain]` currently uses `optionsNotionalVolume` as route guard.
	{ prefix: 'options/premium-volume/chain', flag: 'optionsNotionalVolume' }
]

function encodeUrl(urlToAdd) {
	// Encode each path segment but keep "/" separators intact.
	const [path, ...queryParts] = urlToAdd.split('?')
	const encodedPath = path
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/')
	const query = queryParts.join('?')
	const encodedQuery = query ? `?${encodeURI(query)}` : ''

	return encodedPath + encodedQuery
}

function escapeXml(value) {
	return String(value)
		.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/gi, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
}

function url(urlToAdd) {
	return `
    <url>
        <loc>${escapeXml(`${baseUrl}/${urlToAdd}`)}</loc>
    </url>
    `
}

function normalizeRoute(route) {
	if (typeof route !== 'string') return null
	if (route === '/') return ''
	return route.replace(/^\/+/, '').replace(/\/+$/, '')
}

function stripQuery(route) {
	return String(route).split('?')[0]
}

function getNavRoutes() {
	const routes = []
	for (const category in defillamaPages) {
		if (category === 'Hidden') continue
		for (const page of defillamaPages[category]) {
			if (typeof page.route !== 'string') continue
			if (page.route.startsWith('https://') || page.route.startsWith('http://')) continue
			const normalizedRoute = normalizeRoute(stripQuery(page.route))
			if (normalizedRoute != null) routes.push(normalizedRoute)
		}
	}
	return routes
}

function buildProtocolRoutes(protocolMetadata) {
	const routes = []

	for (const key in protocolMetadata) {
		const meta = protocolMetadata[key]
		if (!meta?.displayName) continue
		const protocolSlug = slug(meta.displayName)
		if (!protocolSlug) continue

		routes.push(`protocol/${protocolSlug}`)

		for (const routeDef of protocolTabRoutes) {
			if (routeDef.hasMetric(meta)) {
				routes.push(`${routeDef.prefix}/${protocolSlug}`)
			}
		}

		for (const routeDef of standaloneProtocolRoutes) {
			if (routeDef.hasMetric(meta)) {
				routes.push(`${routeDef.prefix}/${protocolSlug}`)
			}
		}
	}

	return routes
}

function buildChainRoutes(chainMetadata) {
	const routes = []
	const seenChainSlugs = new Set()

	for (const key in chainMetadata) {
		const metadata = chainMetadata[key]
		if (!metadata?.name) continue

		const chainSlug = slug(metadata.name)
		if (!chainSlug || chainSlug === 'all' || seenChainSlugs.has(chainSlug)) continue

		seenChainSlugs.add(chainSlug)
		routes.push(`chain/${chainSlug}`)

		for (const routeDef of chainFlaggedRoutes) {
			if (metadata[routeDef.flag]) {
				routes.push(`${routeDef.prefix}/${chainSlug}`)
			}
		}
	}

	return routes
}

function buildCategoryAndTagRoutes(categoriesAndTags) {
	const routes = []
	const categories = Array.isArray(categoriesAndTags?.categories) ? categoriesAndTags.categories : []
	const tags = Array.isArray(categoriesAndTags?.tags) ? categoriesAndTags.tags : []
	const tagCategoryMap = categoriesAndTags?.tagCategoryMap ?? {}

	for (const category of categories) {
		const categorySlug = slug(category)
		if (categorySlug) routes.push(`protocols/${categorySlug}`)
	}

	for (const tag of tags) {
		if (!tagCategoryMap[tag]) continue
		const tagSlug = slug(tag)
		if (tagSlug) routes.push(`protocols/${tagSlug}`)
	}

	return routes
}

function buildStablecoinAssetRoutes(stablecoins) {
	const routes = []
	for (const stablecoin of stablecoins) {
		if (!stablecoin?.name) continue
		const stablecoinSlug = slug(stablecoin.name)
		if (stablecoinSlug) routes.push(`stablecoin/${stablecoinSlug}`)
	}
	return routes
}

function buildCexRoutes(cexs) {
	const routes = []
	for (const cex of cexs) {
		if (!cex?.slug) continue
		const cexSlug = slug(cex.slug)
		if (!cexSlug) continue
		routes.push(`cex/${cexSlug}`)
		routes.push(`cex/assets/${cexSlug}`)
		routes.push(`cex/stablecoins/${cexSlug}`)
	}
	return routes
}

function generateSiteMap(routes) {
	const dedupedRoutes = Array.from(
		new Set(routes.map((route) => normalizeRoute(route)).filter((route) => route != null))
	)

	return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${dedupedRoutes.map((route) => url(encodeUrl(route))).join('')}
   </urlset>
 `
}

function SiteMap() {
	// getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
	const metadataModule = await import('~/utils/metadata')
	await metadataModule.refreshMetadataIfStale()
	const { chainMetadata, protocolMetadata, categoriesAndTags, cexs } = metadataModule.default
	const stablecoins = await fetchStablecoinAssetsApi().then(({ peggedAssets }) => peggedAssets)

	const sitemap = generateSiteMap([
		...getNavRoutes(),
		...buildChainRoutes(chainMetadata),
		...buildProtocolRoutes(protocolMetadata),
		...buildCategoryAndTagRoutes(categoriesAndTags),
		...buildStablecoinAssetRoutes(stablecoins),
		...buildCexRoutes(cexs)
	])

	res.setHeader('Content-Type', 'text/xml')
	// we send the XML to the browser
	res.write(sitemap)
	res.end()

	return {
		props: {}
	}
}

export default SiteMap
