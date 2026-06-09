import { describe, expect, it } from 'vitest'
import { buildResearchRssFeed } from '~/containers/Articles/researchFeed'
import type { ArticleAuthorProfile, ArticleDocument } from '~/containers/Articles/types'

const author: ArticleAuthorProfile = {
	id: 'u1',
	pbUserId: 'pb1',
	slug: 'jane-doe',
	displayName: 'Jane Doe',
	socials: {},
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
}

const coAuthor: ArticleAuthorProfile = {
	...author,
	id: 'u2',
	pbUserId: 'pb2',
	slug: 'john-doe',
	displayName: 'John Doe'
}

function makeArticle(overrides: Partial<ArticleDocument> = {}): ArticleDocument {
	return {
		id: 'a1',
		contentVersion: 1,
		rendererVersion: 1,
		editorSchemaVersion: 1,
		title: 'Sample Article',
		slug: 'sample-article',
		status: 'published',
		author: 'Jane Doe',
		authorProfile: author,
		contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body text.' }] }] },
		plainText: 'Body text.',
		entities: [],
		charts: [],
		citations: [],
		embeds: [],
		tags: ['defi', 'lending'],
		section: 'report',
		excerpt: 'A short summary.',
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
		publishedAt: '2026-03-25T11:30:03.333Z',
		firstPublishedAt: '2026-03-20T08:00:00.000Z',
		...overrides
	}
}

describe('buildResearchRssFeed', () => {
	it('emits a valid RSS 2.0 channel envelope', () => {
		const xml = buildResearchRssFeed([makeArticle()])
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
		expect(xml).toContain('<rss version="2.0"')
		expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"')
		expect(xml).toContain('<title>DefiLlama Research</title>')
		expect(xml).toContain('<link>https://defillama.com/research</link>')
		expect(xml).toContain(
			'<atom:link href="https://defillama.com/research/feed.xml" rel="self" type="application/rss+xml" />'
		)
	})

	it('renders item link, guid and pubDate from firstPublishedAt', () => {
		const xml = buildResearchRssFeed([makeArticle()])
		expect(xml).toContain('<link>https://defillama.com/research/report/sample-article</link>')
		expect(xml).toContain('<guid isPermaLink="true">https://defillama.com/research/report/sample-article</guid>')
		expect(xml).toContain(`<pubDate>${new Date('2026-03-20T08:00:00.000Z').toUTCString()}</pubDate>`)
	})

	it('maps tags to categories and the byline to dc:creator', () => {
		const xml = buildResearchRssFeed([makeArticle()])
		expect(xml).toContain('<category>defi</category>')
		expect(xml).toContain('<category>lending</category>')
		expect(xml).toContain('<dc:creator>Jane Doe</dc:creator>')
	})

	it('lists co-authors in the dc:creator byline', () => {
		const xml = buildResearchRssFeed([makeArticle({ coAuthors: [coAuthor] })])
		expect(xml).toContain('<dc:creator>Jane Doe, John Doe</dc:creator>')
	})

	it('uses the brand byline when set', () => {
		const xml = buildResearchRssFeed([makeArticle({ brandByline: true })])
		expect(xml).toContain('<dc:creator>DefiLlama Research</dc:creator>')
	})

	it('lists visible co-authors with the brand byline', () => {
		const xml = buildResearchRssFeed([makeArticle({ brandByline: true, coAuthors: [coAuthor] })])
		expect(xml).toContain('<dc:creator>DefiLlama Research, John Doe</dc:creator>')
	})

	it('embeds full article HTML inside a CDATA content:encoded block', () => {
		const xml = buildResearchRssFeed([makeArticle()])
		expect(xml).toContain('<content:encoded><![CDATA[')
		expect(xml).toContain('<p>Body text.</p>')
	})

	it('falls back to the excerpt when the body has no renderable content', () => {
		const xml = buildResearchRssFeed([makeArticle({ contentJson: { type: 'doc', content: [] } })])
		expect(xml).toContain('<p>A short summary.</p>')
	})

	it('skips articles without a section', () => {
		const xml = buildResearchRssFeed([makeArticle({ section: null, slug: 'no-section' })])
		expect(xml).not.toContain('no-section')
		expect(xml).not.toContain('<item>')
	})

	it('produces a valid channel with no items for empty input', () => {
		const xml = buildResearchRssFeed([])
		expect(xml).toContain('<channel>')
		expect(xml).not.toContain('<item>')
		expect(xml).not.toContain('<lastBuildDate>')
	})

	it('declares the custom dl namespace and channel copyright, generator and ttl', () => {
		const xml = buildResearchRssFeed([makeArticle()])
		expect(xml).toContain('xmlns:dl="https://defillama.com/ns/research"')
		expect(xml).toContain('<copyright>© DefiLlama Research</copyright>')
		expect(xml).toContain('<generator>DefiLlama Research CMS</generator>')
		expect(xml).toContain('<ttl>30</ttl>')
	})

	it('emits the section label as dc:type', () => {
		const xml = buildResearchRssFeed([makeArticle({ section: 'interview' })])
		expect(xml).toContain('<dc:type>Interview</dc:type>')
	})

	it('emits the updated date as an ISO-8601 dc:date distinct from pubDate', () => {
		const xml = buildResearchRssFeed([makeArticle({ lastPublishedAt: '2026-04-02T15:10:00.000Z' })])
		expect(xml).toContain('<dc:date>2026-04-02T15:10:00.000Z</dc:date>')
		const dcDate = xml.match(/<dc:date>([^<]+)<\/dc:date>/)?.[1] ?? ''
		expect(dcDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
		const pubDate = xml.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? ''
		expect(dcDate).not.toBe(pubDate)
	})

	it('emits reading time in whole minutes', () => {
		const xml = buildResearchRssFeed([makeArticle()])
		const minutes = Number(xml.match(/<dl:readingTime>(\d+)<\/dl:readingTime>/)?.[1])
		expect(Number.isInteger(minutes)).toBe(true)
		expect(minutes).toBeGreaterThanOrEqual(1)
	})

	it('emits an explicit canonical atom:link and the excerpt as atom:summary', () => {
		const xml = buildResearchRssFeed([makeArticle()])
		expect(xml).toContain(
			'<atom:link rel="alternate" href="https://defillama.com/research/report/sample-article" type="text/html" />'
		)
		expect(xml).toContain('<atom:summary>A short summary.</atom:summary>')
	})

	it('emits a featured-image enclosure with an inferred MIME type', () => {
		const xml = buildResearchRssFeed([makeArticle({ coverImage: { url: 'https://cdn.defillama.com/cover.png' } })])
		expect(xml).toContain('<enclosure url="https://cdn.defillama.com/cover.png" type="image/png" length="0" />')
	})

	it('derives person and protocol entities, mapping cex to organization without duplicates', () => {
		const xml = buildResearchRssFeed([
			makeArticle({
				interviewees: [{ name: 'Felix Fan' }, { name: 'Felix Fan' }],
				entities: [
					{ entityType: 'protocol', slug: 'hyperliquid', label: 'Hyperliquid', route: '/protocol/hyperliquid' },
					{ entityType: 'cex', slug: 'trust-wallet', label: 'Trust Wallet', route: '/cex/trust-wallet' }
				]
			})
		])
		expect(xml).toContain('<dl:entity type="person">Felix Fan</dl:entity>')
		expect(xml).toContain('<dl:entity type="protocol">Hyperliquid</dl:entity>')
		expect(xml).toContain('<dl:entity type="organization">Trust Wallet</dl:entity>')
		expect(xml.match(/<dl:entity type="person">Felix Fan<\/dl:entity>/g)).toHaveLength(1)
	})
})
