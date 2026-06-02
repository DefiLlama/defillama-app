export type FeedReader = {
	id: string
	name: string
	brandColor: string
	subscribeUrl: (feedUrl: string) => string
}

function stripProtocol(url: string): string {
	return url.replace(/^[a-z]+:\/\//i, '')
}

export const FEED_READERS: FeedReader[] = [
	{
		id: 'feedly',
		name: 'Feedly',
		brandColor: '#2bb24c',
		subscribeUrl: (feedUrl) => `https://feedly.com/i/subscription/feed/${encodeURIComponent(feedUrl)}`
	},
	{
		id: 'inoreader',
		name: 'Inoreader',
		brandColor: '#1875f3',
		subscribeUrl: (feedUrl) => `https://www.inoreader.com/?add_feed=${encodeURIComponent(feedUrl)}`
	},
	{
		id: 'newsblur',
		name: 'NewsBlur',
		brandColor: '#d99e0b',
		subscribeUrl: (feedUrl) => `https://www.newsblur.com/?url=${encodeURIComponent(feedUrl)}`
	},
	{
		id: 'feedbin',
		name: 'Feedbin',
		brandColor: '#2f6df6',
		subscribeUrl: (feedUrl) => `https://feedbin.com/?subscribe=${encodeURIComponent(feedUrl)}`
	}
]

export function feedSchemeUrl(feedUrl: string): string {
	return `feed://${stripProtocol(feedUrl)}`
}

export function feedValidatorUrl(feedUrl: string): string {
	return `https://validator.w3.org/feed/check.cgi?url=${encodeURIComponent(feedUrl)}`
}

export function normalizeInstanceOrigin(input: string): string | null {
	const trimmed = input.trim()
	if (!trimmed) return null
	const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
	try {
		const url = new URL(withProtocol)
		return `${url.protocol}//${url.host}`
	} catch {
		return null
	}
}

export function freshRssSubscribeUrl(instance: string, feedUrl: string): string | null {
	const origin = normalizeInstanceOrigin(instance)
	if (!origin) return null
	return `${origin}/i/?c=feed&a=add&url_rss=${encodeURIComponent(feedUrl)}`
}

export function minifluxSubscribeUrl(instance: string, feedUrl: string): string | null {
	const origin = normalizeInstanceOrigin(instance)
	if (!origin) return null
	return `${origin}/bookmarklet?uri=${encodeURIComponent(feedUrl)}`
}

export const ABOUT_FEEDS_URL = 'https://aboutfeeds.com'
