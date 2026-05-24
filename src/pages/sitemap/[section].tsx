import type { GetServerSidePropsContext } from 'next'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { buildSitemapXml, SITEMAP_BASE_URL, SITEMAP_CACHE_CONTROL } from '~/utils/sitemapXml'

function SiteMapSection() {
	// getServerSideProps writes the XML response.
}

export async function getServerSideProps({ params, res }: GetServerSidePropsContext<{ section: string }>) {
	const sectionId = params?.section
	const { getSitemapSection } = await import('~/server/routeCache/sitemap')
	const section = sectionId ? await getSitemapSection(sectionId) : null

	if (!section) {
		return {
			notFound: true
		}
	}

	const sitemap = buildSitemapXml(SITEMAP_BASE_URL, section.entries)

	res.setHeader('Content-Type', 'text/xml')
	res.setHeader('Cache-Control', jitterCacheControlHeader(SITEMAP_CACHE_CONTROL, `sitemap/${section.id}.xml`))
	res.write(sitemap)
	res.end()

	return {
		props: {}
	}
}

export default SiteMapSection
