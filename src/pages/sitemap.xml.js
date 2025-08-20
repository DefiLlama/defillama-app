import { CEXS_API, PEGGEDS_API, PROTOCOLS_API } from '~/constants/index'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import insightsAndTools from '~/public/insights-and-tools.json'

const baseUrl = `https://defillama.com`
const singleUrls = ['about', 'press', 'donations', 'subscription', 'terms', 'subscription/privacy-policy']

function url(urlToAdd) {
	return `
    <url>
        <loc>${baseUrl}/${encodeURI(urlToAdd)}</loc>
    </url>
    `
}

function prefixedUrl(prefix) {
	return (urlToAdd) => url(`${prefix}/${urlToAdd}`)
}

function generateSiteMap(protocols, chains, categories, parentProtocols, stablecoins, cexs) {
	return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${baseUrl}</loc>
    </url>
		${insightsAndTools.Insights.filter((p) => p.route.includes('https://'))
			.map((p) => url(p.route.slice(1)))
			.join('')}
		${insightsAndTools.Tools.filter((p) => p.route.includes('https://'))
			.map((p) => url(p.route.slice(1)))
			.join('')}
    ${chains.map(prefixedUrl('chain')).join('')}
    ${protocols.map(prefixedUrl('protocol')).join('')}
		${parentProtocols.map(prefixedUrl('protocol')).join('')}
		${categories.map((category) => url(`protocols/${category.toLowerCase()}`)).join('')}
		${stablecoins.map(prefixedUrl('stablecoin')).join('')}
		${cexs.map(prefixedUrl('cex')).join('')}
		${singleUrls.map(url).join('')}
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
		stablecoins.map(({ slug }) => slug),
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
