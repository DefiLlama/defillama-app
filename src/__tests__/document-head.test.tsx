import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/document', () => ({
	Html: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		createElement('html', props, children),
	Head: ({ children }: { children?: React.ReactNode }) => createElement('head', null, children),
	Main: () => null,
	NextScript: () => null
}))

vi.mock('~/utils/cookies', () => ({
	getHeadBootstrapScript: () => '/* bootstrap */'
}))

import Document from '~/pages/_document'

describe('_document head hygiene', () => {
	const html = renderToStaticMarkup(<Document />)

	it('declares charSet utf-8', () => {
		expect(html).toContain('<meta charSet="utf-8"/>')
	})

	it('places charSet before any other head element so it lands in the first 1024 bytes', () => {
		const headOpen = html.indexOf('<head>')
		const charsetIdx = html.indexOf('<meta charSet="utf-8"/>', headOpen)
		const dnsPrefetchIdx = html.indexOf('<link rel="dns-prefetch"', headOpen)
		const linkIconIdx = html.indexOf('<link rel="icon"', headOpen)
		expect(charsetIdx).toBeGreaterThan(headOpen)
		expect(charsetIdx).toBeLessThan(dnsPrefetchIdx)
		expect(charsetIdx).toBeLessThan(linkIconIdx)
	})

	it('preloads the LCP-candidate image with fetchPriority="high"', () => {
		const preload = html.match(/<link[^>]*defillama\.webp[^>]*>/)
		expect(preload).not.toBeNull()
		expect(preload![0]).toContain('fetchPriority="high"')
		expect(preload![0]).toContain('rel="preload"')
		expect(preload![0]).toContain('as="image"')
	})
})
