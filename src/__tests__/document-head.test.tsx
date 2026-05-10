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
	// HTML attributes are case-insensitive per spec; the assertions below match
	// the rendered string with /i flags so they remain valid if React's choice
	// of casing for charSet / fetchPriority changes across versions.
	const CHARSET_META = /<meta charset="utf-8"\s*\/?>/i

	it('declares charset utf-8', () => {
		expect(html).toMatch(CHARSET_META)
	})

	it('places charset before any other head element so it lands in the first 1024 bytes', () => {
		const headOpen = html.indexOf('<head>')
		const charsetIdx = html.search(CHARSET_META)
		const dnsPrefetchIdx = html.indexOf('<link rel="dns-prefetch"', headOpen)
		const linkIconIdx = html.indexOf('<link rel="icon"', headOpen)
		expect(charsetIdx).toBeGreaterThan(headOpen)
		expect(charsetIdx).toBeLessThan(dnsPrefetchIdx)
		expect(charsetIdx).toBeLessThan(linkIconIdx)
	})

	it('preloads the LCP-candidate image with fetchpriority="high"', () => {
		const preload = html.match(/<link[^>]*defillama\.webp[^>]*>/i)
		expect(preload).not.toBeNull()
		expect(preload![0]).toMatch(/fetchpriority="high"/i)
		expect(preload![0]).toMatch(/rel="preload"/i)
		expect(preload![0]).toMatch(/as="image"/i)
	})
})
