import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { normalizeLocalArticleDocument } from './document'
import { ArticleRenderer } from './renderer/ArticleRenderer'

describe('ArticleRenderer', () => {
	it('renders custom article primitives without the editor', () => {
		const normalized = normalizeLocalArticleDocument({
			title: 'Aave fees after the exploit',
			subtitle: 'A local research draft',
			status: 'draft',
			contentJson: {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 2 },
						content: [{ type: 'text', text: 'Fees moved' }]
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Aave',
								marks: [{ type: 'entityLink', attrs: { entityType: 'protocol', slug: 'aave' } }]
							},
							{ type: 'text', text: ' became more expensive ' },
							{ type: 'citation', attrs: { id: '1', label: '1', url: 'https://example.com' } }
						]
					},
					{
						type: 'callout',
						attrs: { tone: 'data' },
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Watch the revenue line.' }] }]
					},
					{
						type: 'defillamaChart',
						attrs: {
							config: {
								entities: [{ entityType: 'protocol', slug: 'aave', name: 'Aave' }],
								chartType: 'fees'
							}
						}
					}
				]
			}
		})

		expect(normalized.ok).toBe(true)
		if (!normalized.ok) return
		const client = new QueryClient()
		const html = renderToStaticMarkup(
			<QueryClientProvider client={client}>
				<ArticleRenderer article={normalized.value} />
			</QueryClientProvider>
		)
		expect(html).toContain('Aave fees after the exploit')
		expect(html).toContain('/protocol/aave')
		expect(html).toContain('Watch the revenue line.')
		expect(html).toContain('Fees · All time')
		expect(html).not.toContain('ProseMirror')
	})
})
