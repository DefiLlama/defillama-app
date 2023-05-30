import { PROTOCOLS_API } from '~/constants/index'
import { standardizeProtocolName } from '~/utils'

const baseUrl = `https://defillama.com`
const singleUrls = ['protocols', 'comparison', 'about', 'airdrops', 'chains', 'recent', 'nfts', 'nfts/chains']

function url(urlToAdd) {
	return `
    <url>
        <loc>${baseUrl}/${urlToAdd}</loc>
    </url>
    `
}

function prefixedUrl(prefix) {
	return (urlToAdd) => url(`${prefix}/${urlToAdd}`)
}

function generateSiteMap(protocols, chains, categories) {
	return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${baseUrl}</loc>
    </url>
    ${singleUrls.map(url).join('')}
    ${chains.map(prefixedUrl('chain')).join('')}
    ${categories.map((category) => url(`protocols/${category.toLowerCase()}`)).join('')}
    ${protocols.map(prefixedUrl('protocol')).join('')}
   </urlset>
 `
}

function SiteMap() {
	// getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
	const { protocols, chains, protocolCategories } = await fetch(PROTOCOLS_API).then((r) => r.json())
	const sitemap = generateSiteMap(
		protocols.map(({ name }) => standardizeProtocolName(name)),
		chains,
		protocolCategories
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
