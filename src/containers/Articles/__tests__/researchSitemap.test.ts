import { describe, expect, it } from 'vitest'
import type { ArticlePathItem } from '~/containers/Articles/api'
import { articlePathToSitemapPath, buildResearchSitemapEntries } from '~/containers/Articles/researchSitemap'
import { ARTICLE_SECTIONS, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import { buildSitemapXml, SITEMAP_BASE_URL } from '~/utils/sitemapXml'

describe('researchSitemap', () => {
	it('maps article paths to canonical research URLs', () => {
		expect(
			articlePathToSitemapPath({
				slug: 'example-slug',
				section: 'report',
				updatedAt: '2026-03-25T11:30:03.333Z'
			})
		).toBe('research/report/example-slug')
	})

	it('returns null for unknown sections', () => {
		expect(
			articlePathToSitemapPath({
				slug: 'example-slug',
				section: 'unknown' as ArticlePathItem['section'],
				updatedAt: '2026-03-25T11:30:03.333Z'
			})
		).toBeNull()
	})

	it('includes hub, section landings and article lastmod', () => {
		const entries = buildResearchSitemapEntries([
			{
				slug: 'example-slug',
				section: 'report',
				updatedAt: '2026-03-25T11:30:03.333Z'
			}
		])

		expect(entries[0]).toEqual({ path: 'research' })

		for (const section of ARTICLE_SECTIONS) {
			expect(entries).toContainEqual({
				path: `research/${ARTICLE_SECTION_SLUGS[section]}`
			})
		}

		expect(entries).toContainEqual({
			path: 'research/report/example-slug',
			lastmod: '2026-03-25T11:30:03.333Z'
		})
	})

	it('generates XML with loc and article lastmod only', () => {
		const xml = buildSitemapXml(
			SITEMAP_BASE_URL,
			buildResearchSitemapEntries([
				{
					slug: 'example-slug',
					section: 'interview',
					updatedAt: '2026-03-25T11:30:03.333Z'
				}
			])
		)

		expect(xml).toContain('<loc>https://defillama.com/research</loc>')
		expect(xml).not.toContain('<changefreq>')
		expect(xml).not.toContain('<priority>')
		expect(xml).toContain('<loc>https://defillama.com/research/interview/example-slug</loc>')
		expect(xml).toContain('<lastmod>2026-03-25T11:30:03.333Z</lastmod>')
	})
})
