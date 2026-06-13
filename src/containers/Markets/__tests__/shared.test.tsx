import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { isKnownTokenSlug, TokenName, tokenHref } from '../shared'

describe('markets token links', () => {
	it('links known token slugs', () => {
		const knownTokenSlugs = new Set(['btc'])
		const html = renderToStaticMarkup(<TokenName base="BTC" knownTokenSlugs={knownTokenSlugs} />)

		expect(tokenHref('BTC')).toBe('/token/btc')
		expect(isKnownTokenSlug('BTC', knownTokenSlugs)).toBe(true)
		expect(html).toContain('href="/token/btc"')
	})

	it('renders unknown market symbols as plain text', () => {
		const html = renderToStaticMarkup(<TokenName base="1000PEPE" knownTokenSlugs={new Set(['btc'])} />)

		expect(isKnownTokenSlug('1000PEPE', new Set(['btc']))).toBe(false)
		expect(html).toContain('1000PEPE')
		expect(html).not.toContain('href=')
	})
})
