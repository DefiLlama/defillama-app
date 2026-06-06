import { describe, expect, it } from 'vitest'
import { feedSchemeUrl } from '~/containers/Articles/feed/readers'

const FEED = 'https://defillama.com/research/feed.xml'

describe('feedSchemeUrl', () => {
	it('swaps the https scheme for feed://', () => {
		expect(feedSchemeUrl(FEED)).toBe('feed://defillama.com/research/feed.xml')
	})

	it('strips any protocol, not just https', () => {
		expect(feedSchemeUrl('http://example.com/feed.xml')).toBe('feed://example.com/feed.xml')
	})
})
