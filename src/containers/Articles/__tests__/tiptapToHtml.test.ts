import { describe, expect, it } from 'vitest'
import { FEATURES_SERVER } from '~/constants'
import { imageFigureHtml, tiptapJsonToHtml } from '~/containers/Articles/renderer/tiptapToHtml'
import type { TiptapJson } from '~/containers/Articles/types'

const MEDIA_ORIGIN = FEATURES_SERVER.replace(/\/$/, '')

function doc(content: TiptapJson[]): TiptapJson {
	return { type: 'doc', content }
}

describe('tiptapJsonToHtml', () => {
	it('renders headings, paragraphs and nested lists', () => {
		const html = tiptapJsonToHtml(
			doc([
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
				{
					type: 'bulletList',
					content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] }]
				}
			])
		)
		expect(html).toContain('<h2>Title</h2>')
		expect(html).toContain('<p>Hello</p>')
		expect(html).toContain('<ul><li><p>one</p></li></ul>')
	})

	it('clamps unsupported heading levels to h2', () => {
		expect(
			tiptapJsonToHtml(doc([{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] }]))
		).toContain('<h2>H1</h2>')
		expect(
			tiptapJsonToHtml(doc([{ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'H4' }] }]))
		).toContain('<h4>H4</h4>')
	})

	it('applies inline marks inner-to-outer', () => {
		const html = tiptapJsonToHtml(
			doc([
				{ type: 'paragraph', content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }, { type: 'italic' }] }] }
			])
		)
		expect(html).toContain('<em><strong>bold</strong></em>')
	})

	it('escapes HTML special characters in text', () => {
		const html = tiptapJsonToHtml(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'a < b & c > d' }] }]))
		expect(html).toContain('a &lt; b &amp; c &gt; d')
	})

	it('renders links and absolutizes root-relative hrefs', () => {
		const html = tiptapJsonToHtml(
			doc([
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'rel', marks: [{ type: 'link', attrs: { href: '/protocol/aave' } }] },
						{ type: 'text', text: 'abs', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }
					]
				}
			])
		)
		expect(html).toContain('<a href="https://defillama.com/protocol/aave">rel</a>')
		expect(html).toContain('<a href="https://example.com">abs</a>')
	})

	it('degrades entity links to absolute DefiLlama links', () => {
		const html = tiptapJsonToHtml(
			doc([
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Aave',
							marks: [{ type: 'entityLink', attrs: { entityType: 'protocol', slug: 'aave' } }]
						}
					]
				}
			])
		)
		expect(html).toContain('<a href="https://defillama.com/protocol/aave">Aave</a>')
	})

	it('degrades charts to a captioned DefiLlama link', () => {
		const html = tiptapJsonToHtml(
			doc([
				{
					type: 'defillamaChart',
					attrs: { config: { entities: [{ entityType: 'protocol', slug: 'aave', name: 'Aave' }], chartType: 'fees' } }
				}
			])
		)
		expect(html).toContain('[Chart: Aave]')
		expect(html).toContain('href="https://defillama.com/protocol/aave"')
		expect(html).toContain('View on DefiLlama')
	})

	it('degrades embeds to a source link', () => {
		const html = tiptapJsonToHtml(
			doc([
				{
					type: 'articleEmbed',
					attrs: {
						config: {
							provider: 'youtube',
							url: 'https://www.youtube.com/embed/abc',
							sourceUrl: 'https://www.youtube.com/watch?v=abc',
							title: 'Watch'
						}
					}
				}
			])
		)
		expect(html).toContain('href="https://www.youtube.com/watch?v=abc"')
		expect(html).toContain('Watch')
	})

	it('renders citations with and without urls', () => {
		expect(
			tiptapJsonToHtml(
				doc([
					{ type: 'paragraph', content: [{ type: 'citation', attrs: { id: '1', label: '1', url: 'https://src' } }] }
				])
			)
		).toContain('<a href="https://src">[1]</a>')
		expect(
			tiptapJsonToHtml(doc([{ type: 'paragraph', content: [{ type: 'citation', attrs: { id: '2', label: '2' } }] }]))
		).toContain('[2]')
	})

	it('renders tables with header and body rows', () => {
		const html = tiptapJsonToHtml(
			doc([
				{
					type: 'table',
					content: [
						{
							type: 'tableRow',
							content: [
								{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H' }] }] }
							]
						},
						{
							type: 'tableRow',
							content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }] }]
						}
					]
				}
			])
		)
		expect(html).toContain('<thead><tr><th><p>H</p></th></tr></thead>')
		expect(html).toContain('<tbody><tr><td><p>C</p></td></tr></tbody>')
	})

	it('renders pullquote callouts as blockquotes and others as asides', () => {
		expect(
			tiptapJsonToHtml(
				doc([
					{
						type: 'callout',
						attrs: { tone: 'pullquote' },
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }]
					}
				])
			)
		).toContain('<blockquote><p>q</p></blockquote>')
		expect(
			tiptapJsonToHtml(
				doc([
					{
						type: 'callout',
						attrs: { tone: 'warning' },
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'w' }] }]
					}
				])
			)
		).toContain('<aside><strong>Warning</strong><p>w</p></aside>')
	})

	it('renders Q&A blocks as definition lists', () => {
		const html = tiptapJsonToHtml(
			doc([
				{
					type: 'qa',
					content: [
						{ type: 'qaQuestion', content: [{ type: 'text', text: 'Q?' }] },
						{ type: 'qaAnswer', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }
					]
				}
			])
		)
		expect(html).toContain('<dl><dt>Q?</dt><dd><p>A</p></dd></dl>')
	})
})

describe('imageFigureHtml', () => {
	it('absolutizes relative image sources against the media origin', () => {
		const html = imageFigureHtml({ src: '/uploads/image/x.png', alt: 'Alt' })
		expect(html).toContain(`<img src="${MEDIA_ORIGIN}/uploads/image/x.png" alt="Alt" />`)
	})

	it('keeps absolute sources and renders captions', () => {
		const html = imageFigureHtml({ src: `${MEDIA_ORIGIN}/uploads/y.png`, headline: 'Head', credit: 'Bob' })
		expect(html).toContain(`src="${MEDIA_ORIGIN}/uploads/y.png"`)
		expect(html).toContain('Head')
		expect(html).toContain('Credit: Bob')
	})

	it('returns an empty string when there is no source', () => {
		expect(imageFigureHtml({ src: null })).toBe('')
	})
})
