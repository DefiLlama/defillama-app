export const SITEMAP_BASE_URL = 'https://defillama.com'

export type SitemapUrlEntry = {
	path: string
	lastmod?: string
}

export function escapeXml(value: string): string {
	return String(value)
		.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/gi, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
}

// Some sitemap routes pre-encode a segment (e.g. rwa/asset/ondo%2Fusdy when the market id
// contains "/"). encodeSitemapPath always encodes at render time, so decode-then-encode
// normalizes each segment once instead of double-encoding % while still encoding raw slugs.
function encodeSitemapSegment(segment: string): string {
	let decoded = segment
	try {
		decoded = decodeURIComponent(segment)
	} catch {
		// malformed percent-sequences: encode the raw segment
	}
	return encodeURIComponent(decoded)
}

export function encodeSitemapPath(path: string): string {
	const [pathPart, ...queryParts] = path.split('?')
	const encodedPath = pathPart
		.split('/')
		.map((segment) => encodeSitemapSegment(segment))
		.join('/')
	const query = queryParts.join('?')
	const encodedQuery = query ? `?${encodeURI(query)}` : ''

	return encodedPath + encodedQuery
}

export function normalizeSitemapRoute(route: string): string | null {
	if (typeof route !== 'string') return null
	if (route === '/') return ''
	return route.replace(/^\/+/, '').replace(/\/+$/, '')
}

function renderUrlEntry(baseUrl: string, entry: SitemapUrlEntry): string {
	const normalizedPath = normalizeSitemapRoute(entry.path)
	if (normalizedPath == null) return ''

	const loc = escapeXml(`${baseUrl}/${encodeSitemapPath(normalizedPath)}`)
	const lastmod =
		entry.lastmod && Number.isFinite(Date.parse(entry.lastmod))
			? `\n        <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
			: ''

	return `
    <url>
        <loc>${loc}</loc>${lastmod}
    </url>
    `
}

export function buildSitemapXml(baseUrl: string, entries: SitemapUrlEntry[]): string {
	const deduped = new Map<string, SitemapUrlEntry>()
	for (const entry of entries) {
		const normalizedPath = normalizeSitemapRoute(entry.path)
		if (normalizedPath == null) continue
		deduped.set(normalizedPath, { ...entry, path: normalizedPath })
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${Array.from(deduped.values())
			.map((entry) => renderUrlEntry(baseUrl, entry))
			.join('')}
   </urlset>
 `
}

export function buildSitemapXmlFromPaths(baseUrl: string, routes: string[]): string {
	const entries = routes
		.map((route) => normalizeSitemapRoute(route))
		.filter((route): route is string => route != null)
		.map((path) => ({ path }))

	return buildSitemapXml(baseUrl, entries)
}
