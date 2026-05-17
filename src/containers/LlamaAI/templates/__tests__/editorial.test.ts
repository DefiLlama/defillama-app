import { describe, expect, it } from 'vitest'
import type { Message } from '~/containers/LlamaAI/types'
import { renderEditorialReport } from '../editorial'

function makeMessage(overrides: Partial<Message> = {}): Message {
	return {
		role: 'assistant',
		id: 'msg-test',
		content: '## Section One\n\nHello world.',
		...overrides
	}
}

const FIXED_DATE = new Date('2026-05-12T12:00:00Z')

async function renderReport(overrides: Partial<Parameters<typeof renderEditorialReport>[0]> = {}) {
	return renderEditorialReport({
		message: makeMessage(),
		chartImages: new Map(),
		generatedAt: FIXED_DATE,
		...overrides
	})
}

describe('renderEditorialReport', () => {
	it('produces a complete HTML document', async () => {
		const html = await renderReport()

		expect(html.startsWith('<!doctype html>')).toBe(true)
		expect(html).toContain('<html lang="en">')
		expect(html).toContain('</html>')
		expect(html).toContain('<head>')
		expect(html).toContain('<body>')
		expect(html).toContain('<style>')
	})

	it('uses the DefiLlama default title', async () => {
		const html = await renderReport()

		expect(html).toContain('DefiLlama Research Report')
		expect(html).toContain('Powered by DefiLlama')
	})

	it('always keeps the DefiLlama attribution footer', async () => {
		const html = await renderReport()

		expect(html).toContain('Data via')
		expect(html).toContain('defillama.com')
		expect(html).toContain('Powered by DefiLlama')
	})

	it('applies the DefiLlama brand primary color to the CSS variable', async () => {
		const html = await renderReport()

		expect(html).toContain('--brand-primary: #2172E5')
	})

	it('renders markdown headings, paragraphs, and bold/italic through the unified pipeline', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: '## Section One\n\nThis is **bold** and *italic* text.\n\n### Subsection\n\nNested content.'
			})
		})

		expect(html).toContain('<h2>Section One</h2>')
		expect(html).toContain('<strong>bold</strong>')
		expect(html).toContain('<em>italic</em>')
		expect(html).toContain('<h3>Subsection</h3>')
	})

	it('renders GFM tables', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: '| Protocol | TVL |\n|----------|-----|\n| Aave | $10B |\n| Lido | $20B |'
			})
		})

		expect(html).toContain('<table>')
		expect(html).toContain('<th>Protocol</th>')
		expect(html).toContain('<td>Aave</td>')
		expect(html).toContain('<td>$10B</td>')
	})

	it('substitutes chart placeholders with provided PNG data URLs', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: 'Volume chart:\n\n[CHART:chart-xyz]\n\nEnd of section.',
				charts: [{ charts: [{ id: 'chart-xyz', type: 'bar' } as any], chartData: {} }]
			}),
			chartImages: new Map([['chart-xyz', { dataUrl: 'data:image/png;base64,AAA=', title: 'Volume by chain' }]])
		})

		expect(html).toContain('<figure class="chart">')
		expect(html).toContain('src="data:image/png;base64,AAA="')
		expect(html).toContain('alt="Volume by chain"')
		expect(html).toContain('<figcaption>Volume by chain</figcaption>')
	})

	it('falls back to a generic alt when the chart has no title', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: '[CHART:chart-noname]',
				charts: [{ charts: [{ id: 'chart-noname', type: 'bar' } as any], chartData: {} }]
			}),
			chartImages: new Map([['chart-noname', { dataUrl: 'data:image/png;base64,BBB=' }]])
		})

		expect(html).toContain('alt="Chart"')
		expect(html).not.toContain('<figcaption>')
	})

	it('omits chart blocks when no image is available (chart not yet rendered)', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: 'Volume chart:\n\n[CHART:chart-missing]',
				charts: [{ charts: [{ id: 'chart-missing', type: 'bar' } as any], chartData: {} }]
			})
		})

		expect(html).not.toContain('[CHART:chart-missing]')
		expect(html).not.toContain('<figure class="chart">')
		expect(html.startsWith('<!doctype html>')).toBe(true)
	})

	it('renders citation markers as <citation-badge> elements', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: 'Hyperliquid dominates [1].',
				citations: ['https://example.test/source']
			})
		})

		expect(html).toContain('<citation-badge')
		expect(html).toContain('href="https://example.test/source"')
	})

	it('renders a numbered sources list when the render model emits one', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: 'Citing here [1] and there [2].',
				citations: ['https://first.test/article', 'https://second.test/article']
			})
		})

		expect(html).toContain('class="sources"')
		expect(html).toContain('https://first.test/article')
		expect(html).toContain('https://second.test/article')
	})

	it('strips the [REPORT_START] marker when present', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: '[REPORT_START]## Real Section\n\nReal content.'
			})
		})

		expect(html).not.toContain('[REPORT_START]')
		expect(html).toContain('<h2>Real Section</h2>')
	})

	it('embeds the DefiLlama wordmark data URL when provided', async () => {
		const wordmarkUrl = 'data:image/svg+xml;base64,WORDMARK='
		const html = await renderReport({
			defillamaWordmarkDataUrl: wordmarkUrl
		})

		// Wordmark appears both in the header logo slot and in the "Powered by" line
		const occurrences = html.split(wordmarkUrl).length - 1
		expect(occurrences).toBe(2)
	})

	it('sanitizes <script> tags from server-emitted markdown', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: 'Normal text.\n\n<script>window.evil=1</script>\n\nMore text after.'
			})
		})

		expect(html).not.toContain('<script>')
		expect(html).not.toContain('window.evil')
		expect(html).toContain('Normal text.')
		expect(html).toContain('More text after.')
	})

	it('strips javascript: hrefs from inline markdown links', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: 'Click [here](javascript:alert(1)) please.'
			})
		})

		expect(html).not.toContain('javascript:')
	})

	it('preserves <citation-badge> elements through sanitization', async () => {
		const html = await renderReport({
			message: makeMessage({
				content: 'Cite [1].',
				citations: ['https://example.test/source']
			})
		})

		expect(html).toContain('<citation-badge')
		expect(html).toContain('href="https://example.test/source"')
	})
})
