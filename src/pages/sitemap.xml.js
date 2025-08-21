import { CEXS_API, PEGGEDS_API, PROTOCOLS_API } from '~/constants/index'
import defillamaPages from '~/public/pages.json'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'

const baseUrl = `https://defillama.com`

function encodeUrl(urlToAdd) {
	// Properly encode the URL, handling query parameters
	const [path, query] = urlToAdd.split('?')
	const encodedPath = encodeURIComponent(path)
	const encodedQuery = query ? '?' + encodeURIComponent(query) : ''
	return encodedPath + encodedQuery
}

function url(urlToAdd) {
	return `
    <url>
        <loc>${baseUrl}/${urlToAdd}</loc>
    </url>
    `
}

function prefixedUrl(prefix) {
	return (urlToAdd) => url(`${prefix}/${encodeUrl(urlToAdd)}`)
}

function generateSiteMap(protocols, chains, categories, parentProtocols, stablecoins, cexs) {
	const navPages = []
	for (const category in defillamaPages) {
		if (category === 'Hidden') continue
		for (const page of defillamaPages[category]) {
			if (page.route.includes('https://')) continue
			navPages.push(encodeUrl(page.route.slice(1)))
		}
	}
	return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${baseUrl}</loc>
    </url>
		${Array.from(new Set(navPages)).map(url).join('')}
    ${chains.map(prefixedUrl('chain')).join('')}
    ${protocols.map(prefixedUrl('protocol')).join('')}
		${parentProtocols.map(prefixedUrl('protocol')).join('')}
		${categories.map((category) => url(`protocols/${category.toLowerCase()}`)).join('')}
		${stablecoins.map(prefixedUrl('stablecoin')).join('')}
		${cexs.map(prefixedUrl('cex')).join('')}
   </urlset>
 `
}

function SiteMap() {
	// getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
	const [{ protocols, chains, protocolCategories, parentProtocols }, stablecoins, cexs] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		fetchJson(PEGGEDS_API).then(({ peggedAssets }) => peggedAssets),
		fetchJson(CEXS_API).then(({ cexs }) => cexs)
	])

	const sitemap = generateSiteMap(
		protocols.map(({ name }) => slug(name)),
		chains.map((c) => slug(c)),
		protocolCategories.map((c) => slug(c)),
		parentProtocols.map(({ name }) => slug(name)),
		stablecoins.map(({ name }) => slug(name)),
		cexs.map(({ slug: cexSlug }) => slug(cexSlug))
	)

	res.setHeader('Content-Type', 'text/xml')
	// we send the XML to the browser
	res.write(sitemap)
	res.end()

	return {
		props: {}
	}
}

export default SiteMap
