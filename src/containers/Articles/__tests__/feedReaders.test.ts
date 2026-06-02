import { describe, expect, it } from 'vitest'
import {
	FEED_READERS,
	feedSchemeUrl,
	feedValidatorUrl,
	freshRssSubscribeUrl,
	minifluxSubscribeUrl,
	normalizeInstanceOrigin
} from '~/containers/Articles/feed/readers'

const FEED = 'https://defillama.com/research/feed.xml'
const ENCODED = encodeURIComponent(FEED)

describe('FEED_READERS subscribe URLs', () => {
	it('builds the documented one-click endpoints', () => {
		const byId = Object.fromEntries(FEED_READERS.map((reader) => [reader.id, reader.subscribeUrl(FEED)]))
		expect(byId.feedly).toBe(`https://feedly.com/i/subscription/feed/${ENCODED}`)
		expect(byId.inoreader).toBe(`https://www.inoreader.com/?add_feed=${ENCODED}`)
		expect(byId.newsblur).toBe(`https://www.newsblur.com/?url=${ENCODED}`)
		expect(byId.feedbin).toBe(`https://feedbin.com/?subscribe=${ENCODED}`)
	})

	it('exposes a hex brand color for every reader', () => {
		for (const reader of FEED_READERS) {
			expect(reader.brandColor).toMatch(/^#[0-9a-f]{6}$/i)
		}
	})
})

describe('feedSchemeUrl', () => {
	it('swaps the https scheme for feed://', () => {
		expect(feedSchemeUrl(FEED)).toBe('feed://defillama.com/research/feed.xml')
	})
})

describe('feedValidatorUrl', () => {
	it('points at the W3C validator with the encoded feed', () => {
		expect(feedValidatorUrl(FEED)).toBe(`https://validator.w3.org/feed/check.cgi?url=${ENCODED}`)
	})
})

describe('normalizeInstanceOrigin', () => {
	it('adds https when missing and strips path/query', () => {
		expect(normalizeInstanceOrigin('reader.example.com')).toBe('https://reader.example.com')
		expect(normalizeInstanceOrigin('https://reader.example.com/')).toBe('https://reader.example.com')
		expect(normalizeInstanceOrigin('http://localhost:8080/freshrss/')).toBe('http://localhost:8080')
	})

	it('returns null for blank input', () => {
		expect(normalizeInstanceOrigin('   ')).toBeNull()
	})
})

describe('self-hosted subscribe URLs', () => {
	it('interpolates the instance origin', () => {
		expect(freshRssSubscribeUrl('reader.example.com', FEED)).toBe(
			`https://reader.example.com/i/?c=feed&a=add&url_rss=${ENCODED}`
		)
		expect(minifluxSubscribeUrl('https://mf.example.com', FEED)).toBe(
			`https://mf.example.com/bookmarklet?uri=${ENCODED}`
		)
	})

	it('returns null without an instance', () => {
		expect(freshRssSubscribeUrl('', FEED)).toBeNull()
		expect(minifluxSubscribeUrl('', FEED)).toBeNull()
	})
})
