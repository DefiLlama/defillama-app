import { fetchDATInstitutions } from '~/containers/DAT/api'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { fetchAllProtocolEmissions } from '~/containers/Unlocks/api'
import defillamaPages from '~/public/pages.json'
import { slug } from '~/utils'

const baseUrl = `https://defillama.com`
// const protocolTabRoutes = [
// 	{ prefix: 'protocol/tvl', hasMetric: (meta) => meta.tvl },
// 	{ prefix: 'protocol/borrowed', hasMetric: (meta) => meta.borrowed },
// 	{ prefix: 'protocol/stablecoins', hasMetric: (meta) => meta.stablecoins },
// 	{ prefix: 'protocol/bridges', hasMetric: (meta) => meta.bridge },
// 	{ prefix: 'protocol/treasury', hasMetric: (meta) => meta.treasury },
// 	{ prefix: 'protocol/yields', hasMetric: (meta) => meta.yields },
// 	{ prefix: 'protocol/fees', hasMetric: (meta) => meta.fees },
// 	{ prefix: 'protocol/dexs', hasMetric: (meta) => meta.dexs },
// 	{ prefix: 'protocol/perps', hasMetric: (meta) => meta.perps },
// 	{ prefix: 'protocol/dex-aggregators', hasMetric: (meta) => meta.dexAggregators },
// 	{ prefix: 'protocol/perps-aggregators', hasMetric: (meta) => meta.perpsAggregators },
// 	{ prefix: 'protocol/bridge-aggregators', hasMetric: (meta) => meta.bridgeAggregators },
// 	{ prefix: 'protocol/options', hasMetric: (meta) => meta.optionsPremiumVolume || meta.optionsNotionalVolume },
// 	{ prefix: 'protocol/token-rights', hasMetric: (meta) => meta.tokenRights }
// ]
// const standaloneProtocolRoutes = [
// 	{ prefix: 'unlocks', hasMetric: (meta) => meta.emissions },
// 	{ prefix: 'governance', hasMetric: (meta) => meta.governance },
// 	{ prefix: 'forks', hasMetric: (meta) => meta.forks }
// ]
// const chainFlaggedRoutes = [
// 	{ prefix: 'stablecoins', flag: 'stablecoins' },
// 	{ prefix: 'bridged', flag: 'chainAssets' },
// 	{ prefix: 'fees/chain', flag: 'fees' },
// 	{ prefix: 'revenue/chain', flag: 'fees' },
// 	{ prefix: 'earnings/chain', flag: 'fees' },
// 	{ prefix: 'holders-revenue/chain', flag: 'fees' },
// 	{ prefix: 'pf/chain', flag: 'fees' },
// 	{ prefix: 'ps/chain', flag: 'fees' },
// 	{ prefix: 'dexs/chain', flag: 'dexs' },
// 	{ prefix: 'perps/chain', flag: 'perps' },
// 	{ prefix: 'dex-aggregators/chain', flag: 'dexAggregators' },
// 	{ prefix: 'perps-aggregators/chain', flag: 'perpsAggregators' },
// 	{ prefix: 'bridge-aggregators/chain', flag: 'bridgeAggregators' },
// 	{ prefix: 'open-interest/chain', flag: 'openInterest' },
// 	{ prefix: 'normalized-volume/chain', flag: 'normalizedVolume' },
// 	{ prefix: 'options/notional-volume/chain', flag: 'optionsNotionalVolume' },
// 	// `/options/premium-volume/chain/[chain]` currently uses `optionsNotionalVolume` as route guard.
// 	{ prefix: 'options/premium-volume/chain', flag: 'optionsNotionalVolume' }
// ]

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

		// for (const routeDef of protocolTabRoutes) {
		// 	if (routeDef.hasMetric(meta)) {
		// 		routes.push(`${routeDef.prefix}/${protocolSlug}`)
		// 	}
		// }

		// for (const routeDef of standaloneProtocolRoutes) {
		// 	if (routeDef.hasMetric(meta)) {
		// 		routes.push(`${routeDef.prefix}/${protocolSlug}`)
		// 	}
		// }
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

		// for (const routeDef of chainFlaggedRoutes) {
		// 	if (metadata[routeDef.flag]) {
		// 		routes.push(`${routeDef.prefix}/${chainSlug}`)
		// 	}
		// }
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
		if (categorySlug && categorySlug !== 'rwa') routes.push(`protocols/${categorySlug}`)
	}

	for (const tag of tags) {
		if (!tagCategoryMap[tag]) continue
		const tagSlug = slug(tag)
		if (tagSlug && tagCategoryMap[tag] !== 'RWA') routes.push(`protocols/${tagSlug}`)
	}

	return routes
}

function buildStablecoinAssetRoutes(stablecoins) {
	const routes = []
	const stablecoinList = Array.isArray(stablecoins) ? stablecoins : []
	for (const stablecoin of stablecoinList) {
		if (!stablecoin?.name) continue
		const stablecoinSlug = slug(stablecoin.name)
		if (stablecoinSlug) routes.push(`stablecoin/${stablecoinSlug}`)
	}
	return routes
}

function buildUnlocksRoutes(protocolEmissions) {
	const routes = []
	const emissionsList = Array.isArray(protocolEmissions) ? protocolEmissions : []
	for (const emission of emissionsList) {
		if (!emission?.name) continue
		const protocolSlug = slug(emission.name)
		if (protocolSlug) routes.push(`unlocks/${protocolSlug}`)
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
		// routes.push(`cex/assets/${cexSlug}`)
		// routes.push(`cex/stablecoins/${cexSlug}`)
	}
	return routes
}

async function buildRWAAssetRoutes() {
	const routes = []
	const metadataModule = await import('~/utils/metadata')
	await metadataModule.refreshMetadataIfStale()
	const rwaList = metadataModule.default.rwaList
	if (rwaList?.tickers) {
		for (const ticker of rwaList.tickers) {
			const tickerSlug = rwaSlug(ticker)
			if (tickerSlug) routes.push(`rwa/asset/${tickerSlug}`)
		}
	}
	if (rwaList?.platforms) {
		for (const platform of rwaList.platforms) {
			const platformSlug = rwaSlug(platform)
			if (platformSlug) routes.push(`rwa/platform/${platformSlug}`)
		}
	}
	if (rwaList?.chains) {
		for (const chain of rwaList.chains) {
			const chainSlug = rwaSlug(chain)
			if (chainSlug) routes.push(`rwa/chain/${chainSlug}`)
		}
	}
	if (rwaList?.categories) {
		for (const category of rwaList.categories) {
			const categorySlug = rwaSlug(category)
			if (categorySlug) routes.push(`rwa/category/${categorySlug}`)
		}
	}
	if (rwaList?.assetGroups) {
		for (const assetGroup of rwaList.assetGroups) {
			const assetGroupSlug = rwaSlug(assetGroup)
			if (assetGroupSlug) routes.push(`rwa/asset-group/${assetGroupSlug}`)
		}
	}
	return routes
}

async function buildDATRoutes() {
	const data = await fetchDATInstitutions()
	const companyRoutes = []
	const assetRoutes = []

	if (data?.institutionMetadata) {
		for (const institutionId in data.institutionMetadata) {
			const ticker = data.institutionMetadata[institutionId]?.ticker
			if (ticker) {
				const companySlug = slug(ticker)
				if (companySlug) companyRoutes.push(`digital-asset-treasury/${companySlug}`)
			}
		}
	}

	if (data?.assetMetadata) {
		for (const asset in data.assetMetadata) {
			const assetSlug = slug(asset)
			if (assetSlug) assetRoutes.push(`digital-asset-treasuries/${assetSlug}`)
		}
	}

	return { companyRoutes, assetRoutes }
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

	// Build routes in parallel
	const [stablecoinResponse, protocolEmissions, rwaAssetRoutes, datRoutes] = await Promise.all([
		fetchStablecoinAssetsApi(),
		fetchAllProtocolEmissions(),
		buildRWAAssetRoutes(),
		buildDATRoutes()
	])
	const stablecoins = Array.isArray(stablecoinResponse?.peggedAssets) ? stablecoinResponse.peggedAssets : []

	if (!Array.isArray(stablecoinResponse?.peggedAssets)) {
		console.warn('[sitemap] stablecoin API payload missing peggedAssets array')
	}

	const sitemap = generateSiteMap([
		...getNavRoutes(),
		...buildChainRoutes(chainMetadata),
		...buildProtocolRoutes(protocolMetadata),
		...buildCategoryAndTagRoutes(categoriesAndTags),
		...buildStablecoinAssetRoutes(stablecoins),
		...buildUnlocksRoutes(protocolEmissions),
		...buildCexRoutes(cexs),
		...rwaAssetRoutes,
		...datRoutes.companyRoutes,
		...datRoutes.assetRoutes
	])

	res.setHeader('Content-Type', 'text/xml')
	res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600')
	// we send the XML to the browser
	res.write(sitemap)
	res.end()

	return {
		props: {}
	}
}

export default SiteMap
