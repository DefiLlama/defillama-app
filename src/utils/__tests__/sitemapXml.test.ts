import { describe, expect, it } from 'vitest'
import { buildSitemapXml, escapeXml } from '../sitemapXml'

describe('sitemapXml', () => {
	it('escapes XML special characters', () => {
		expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
	})

	it('omits lastmod when metadata is absent', () => {
		const xml = buildSitemapXml('https://defillama.com', [{ path: 'research' }])

		expect(xml).toContain('<loc>https://defillama.com/research</loc>')
		expect(xml).not.toContain('<lastmod>')
	})

	it('renders lastmod when provided', () => {
		const xml = buildSitemapXml('https://defillama.com', [
			{
				path: 'research/report/example-slug',
				lastmod: '2026-03-25T11:30:03.333Z'
			}
		])

		expect(xml).toContain('<loc>https://defillama.com/research/report/example-slug</loc>')
		expect(xml).toContain('<lastmod>2026-03-25T11:30:03.333Z</lastmod>')
	})

	it('omits lastmod when the date is not parseable', () => {
		const xml = buildSitemapXml('https://defillama.com', [
			{
				path: 'research/report/example-slug',
				lastmod: 'not-a-date'
			}
		])

		expect(xml).not.toContain('<lastmod>')
	})
})
