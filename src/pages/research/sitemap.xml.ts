import type { GetServerSideProps } from 'next'
import { listArticlePaths, type ArticlePathsResponse } from '~/containers/Articles/api'
import { buildResearchSitemapEntries } from '~/containers/Articles/researchSitemap'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { buildSitemapXml, SITEMAP_BASE_URL } from '~/utils/sitemapXml'

function ResearchSiteMap() {
	// getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
	let articlePaths: ArticlePathsResponse['items'] = []

	try {
		const response = await listArticlePaths()
		articlePaths = response.items
	} catch (error) {
		console.warn('[research/sitemap] failed to load article paths', error)
	}

	const sitemap = buildSitemapXml(SITEMAP_BASE_URL, buildResearchSitemapEntries(articlePaths))

	res.setHeader('Content-Type', 'text/xml')
	res.setHeader(
		'Cache-Control',
		jitterCacheControlHeader('public, max-age=300, s-maxage=1800, stale-while-revalidate=3600', 'research/sitemap.xml')
	)
	res.write(sitemap)
	res.end()

	return {
		props: {}
	}
}

export default ResearchSiteMap
