import { fetchCexs } from '~/containers/Cexs/api'
import { fetchProtocols } from '~/containers/Protocols/api'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import defillamaPages from '~/public/pages.json'
import { slug } from '~/utils'

const baseUrl = `https://defillama.com`

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
		${Array.from(new Set(navPages)).map(url).join('')}
    ${chains.map(prefixedUrl('chain')).join('')}
    ${protocols.map(prefixedUrl('protocol')).join('')}
		${parentProtocols.map(prefixedUrl('protocol')).join('')}
		${categories.map(prefixedUrl('protocols')).join('')}
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
		fetchProtocols(),
		fetchStablecoinAssetsApi().then(({ peggedAssets }) => peggedAssets),
		fetchCexs().then(({ cexs }) => cexs)
	])

	const sitemap = generateSiteMap(
		protocols.map(({ name }) => slug(name)),
		chains.map((c) => slug(c)),
		(protocolCategories ?? []).map((c) => slug(c)),
		parentProtocols.map(({ name }) => slug(name)),
		stablecoins.map(({ name }) => slug(name)),
		(() => {
			const slugs = []
			for (const c of cexs) {
				if (c.slug != null) slugs.push(slug(c.slug))
			}
			return slugs
		})()
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
