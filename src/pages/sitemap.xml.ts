import type { GetServerSidePropsContext } from 'next'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { buildSitemapIndexXml, SITEMAP_BASE_URL } from '~/utils/sitemapXml'

function SiteMapIndex() {
	// getServerSideProps writes the XML response.
}

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
	const { buildAppSitemapSections, getSitemapSectionPath } = await import('~/server/routeCache/sitemap')
	const sections = await buildAppSitemapSections()

	const sitemap = buildSitemapIndexXml(
		SITEMAP_BASE_URL,
		sections.map((section) => ({ path: getSitemapSectionPath(section.id) }))
	)

	res.setHeader('Content-Type', 'text/xml')
	res.setHeader(
		'Cache-Control',
		jitterCacheControlHeader('public, max-age=300, s-maxage=1800, stale-while-revalidate=3600', 'sitemap.xml')
	)
	res.write(sitemap)
	res.end()

	return {
		props: {}
	}
}

export default SiteMapIndex
