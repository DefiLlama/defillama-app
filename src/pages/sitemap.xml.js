import { chainsMetrics, protocolsMetrics } from '~/components/Metrics'
import { PROTOCOLS_API } from '~/constants/index'
import { slug } from '~/utils'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

const baseUrl = `https://defillama.com`
const singleUrls = ['about', 'press', 'yields', 'subscription', 'airdrops', 'recent']

function url(urlToAdd) {
	return `
    <url>
        <loc>${baseUrl}/${urlToAdd}</loc>
    </url>
    `
}

function prefixedUrl(prefix) {
	return (urlToAdd) => (urlToAdd.includes('&') ? '' : url(`${prefix}/${urlToAdd}`))
}

function generateSiteMap(protocols, chains, categories, parentProtocols) {
	return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${baseUrl}</loc>
    </url>
		${protocolsMetrics
			.slice(1)
			.map((p) => url(p.mainRoute.slice(1)))
			.join('')}
		${chainsMetrics.map((p) => url(p.route.slice(1))).join('')}
    ${chains.map(prefixedUrl('chain')).join('')}
    ${protocols.map(prefixedUrl('protocol')).join('')}
		${parentProtocols.map(prefixedUrl('parentProtocol')).join('')}
		${categories.map((category) => url(`protocols/${category.toLowerCase()}`)).join('')}
		${singleUrls.map(url).join('')}
   </urlset>
 `
}

function SiteMap() {
	// getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
	const { protocols, chains, protocolCategories, parentProtocols } = await fetch(PROTOCOLS_API).then((r) => r.json())

	const sitemap = generateSiteMap(
		protocols.map(({ name }) => slug(name)),
		chains.map((c) => slug(c)),
		protocolCategories.map((c) => slug(c)),
		parentProtocols.map(({ name }) => slug(name))
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
