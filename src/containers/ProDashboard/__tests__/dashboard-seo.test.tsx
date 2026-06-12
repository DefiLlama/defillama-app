import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DashboardSeoSummary } from '../components/DashboardSeoSummary'
import { ProDashboardLoader } from '../components/ProDashboardLoader'
import type { Dashboard } from '../services/DashboardAPI'
import { buildDashboardSeo, markdownToPlainText, toDashboardSeoPublicDashboard } from '../utils/seo'

function hasNestedUndefined(value: unknown): boolean {
	if (value === undefined) return true
	if (Array.isArray(value)) return value.some(hasNestedUndefined)
	if (value && typeof value === 'object') {
		return Object.values(value).some(hasNestedUndefined)
	}
	return false
}

describe('pro dashboard SEO shell', () => {
	const dashboard = {
		id: 'dashboard-1',
		user: 'user-1',
		visibility: 'public',
		tags: ['fees', 'ethereum'],
		description: '# Revenue <strong>watchlist</strong> with [Aave](https://aave.com)',
		created: '2026-01-01T00:00:00.000Z',
		updated: '2026-01-02T00:00:00.000Z',
		editedAt: '2026-01-03T00:00:00.000Z',
		viewCount: 12,
		likeCount: 3,
		data: {
			dashboardName: 'Revenue Watchlist',
			items: [
				{
					id: 'chart-1',
					kind: 'chart',
					chain: 'Ethereum',
					protocol: 'aave',
					type: 'fees'
				},
				{
					id: 'table-1',
					kind: 'table',
					tableType: 'dataset',
					datasetType: 'revenue',
					chains: ['Ethereum']
				}
			]
		},
		author: {
			slug: 'jane-builder',
			displayName: 'Jane Builder',
			bio: 'Builds revenue dashboards.',
			avatarUrl: 'https://example.com/avatar.png',
			socials: {
				twitter: 'https://x.com/janebuilder',
				github: 'https://github.com/janebuilder',
				unsafe: 'javascript:alert(1)'
			},
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-02T00:00:00.000Z'
		}
	} satisfies Dashboard

	it('builds plain-text metadata and structured data for a public dashboard', () => {
		const seo = buildDashboardSeo(dashboard)

		expect(seo.title).toBe('Revenue Watchlist - DefiLlama Pro Dashboard')
		expect(seo.description).toBe('Revenue watchlist with Aave')
		expect(seo.canonicalPath).toBe('/pro/dashboard-1')
		expect(seo.updated).toBe('2026-01-03T00:00:00.000Z')
		expect(seo.itemCount).toBe(2)
		expect(seo.itemSummaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: 'Aave Fees chart', href: '/protocol/aave' }),
				expect.objectContaining({ label: 'Revenue table for Ethereum' })
			])
		)
		expect(seo.jsonLd).toMatchObject({
			'@context': 'https://schema.org',
			'@graph': expect.arrayContaining([
				expect.objectContaining({
					'@type': 'WebPage',
					url: 'https://defillama.com/pro/dashboard-1',
					author: { '@id': 'https://defillama.com/authors/jane-builder#person' }
				}),
				expect.objectContaining({
					'@type': 'Person',
					name: 'Jane Builder',
					url: 'https://defillama.com/authors/jane-builder',
					sameAs: ['https://x.com/janebuilder', 'https://github.com/janebuilder']
				}),
				expect.objectContaining({ '@type': 'BreadcrumbList' })
			])
		})
	})

	it('prefers the dashboard slug for canonical url and structured data', () => {
		const seo = buildDashboardSeo({ ...dashboard, slug: 'revenue-watchlist' })

		expect(seo.canonicalPath).toBe('/pro/revenue-watchlist')
		expect(seo.jsonLd).toMatchObject({
			'@graph': expect.arrayContaining([
				expect.objectContaining({
					'@type': 'WebPage',
					url: 'https://defillama.com/pro/revenue-watchlist'
				})
			])
		})
		expect(toDashboardSeoPublicDashboard({ ...dashboard, slug: 'revenue-watchlist' }).slug).toBe('revenue-watchlist')
	})

	it('renders a visible semantic summary for the initial HTML', () => {
		const seo = buildDashboardSeo(dashboard)
		const html = renderToStaticMarkup(<DashboardSeoSummary dashboard={dashboard} seo={seo} />)

		expect(html).toContain('<h1')
		expect(html).toContain('Revenue Watchlist')
		expect(html).toContain('Revenue watchlist with Aave')
		expect(html).toContain('Dashboard contents')
		expect(html).toContain('Aave Fees chart')
		expect(html).toContain('href="/protocol/aave"')
		expect(html).toContain('Revenue table for Ethereum')
		expect(html).toContain('By ')
		expect(html).toContain('Jane Builder')
		expect(html).toContain('href="/authors/jane-builder"')
		expect(html).toContain('2026-01-03')
		expect(html).toContain('fees')
		expect(html).toContain('ethereum')
	})

	it('compacts dashboard SEO props without raw owner ids', () => {
		const compact = toDashboardSeoPublicDashboard(dashboard)

		expect(compact.author).toEqual(
			expect.objectContaining({
				slug: 'jane-builder',
				displayName: 'Jane Builder'
			})
		)
		expect(compact).not.toHaveProperty('user')
		expect(compact).not.toHaveProperty('collectionId')
		expect(compact).not.toHaveProperty('collectionName')
	})

	it('keeps the loader heading opt-in for headingless SEO shell fallbacks', () => {
		expect(renderToStaticMarkup(<ProDashboardLoader />)).not.toContain('<h1')
		expect(renderToStaticMarkup(<ProDashboardLoader heading="Loading dashboard" />)).toMatch(
			/<h1(?:\s[^>]*)?>Loading dashboard<\/h1>/
		)
	})

	it('falls back honestly for empty public dashboards', () => {
		const emptyDashboard = {
			...dashboard,
			tags: [],
			description: '',
			data: { dashboardName: 'Empty Dashboard', items: [] }
		}
		const seo = buildDashboardSeo(emptyDashboard)
		const html = renderToStaticMarkup(<DashboardSeoSummary dashboard={emptyDashboard} seo={seo} />)

		expect(seo.description).toBe('Community-built DefiLlama Pro dashboard.')
		expect(seo.itemCount).toBe(0)
		expect(hasNestedUndefined(seo.jsonLd)).toBe(false)
		expect(html).toContain('This public dashboard does not have any items yet.')
	})

	it('converts markdown and raw html to plain text before SEO rendering', () => {
		expect(markdownToPlainText('## Hello <script>alert(1)</script> [world](/x) `code`')).toBe(
			'Hello alert(1) world code'
		)
	})
})
