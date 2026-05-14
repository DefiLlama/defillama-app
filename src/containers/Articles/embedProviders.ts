import type { ArticleEmbedAspectRatio, ArticleEmbedConfig, ArticleEmbedProvider } from './types'

export const EMBED_ALLOWLIST_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'youtu.be',
	'twitter.com',
	'www.twitter.com',
	'x.com',
	'www.x.com',
	'mobile.twitter.com',
	'medium.com',
	'www.medium.com',
	'mirror.xyz',
	'www.mirror.xyz',
	'substack.com',
	'www.substack.com',
	'gist.github.com',
	'github.com',
	'www.github.com',
	'defillama.com',
	'www.defillama.com',
	't.me',
	'www.t.me',
	'flourish.studio',
	'public.flourish.studio',
	'app.flourish.studio',
	'flo.uri.sh',
	'datawrapper.de',
	'www.datawrapper.de',
	'datawrapper.dwcdn.net'
])

export function isEmbedHostAllowed(host: string): boolean {
	const lower = host.toLowerCase()
	if (EMBED_ALLOWLIST_HOSTS.has(lower)) return true
	if (lower.endsWith('.medium.com')) return true
	if (lower.endsWith('.mirror.xyz')) return true
	if (lower.endsWith('.substack.com')) return true
	if (lower.endsWith('.flourish.studio')) return true
	if (lower.endsWith('.dwcdn.net')) return true
	return false
}

export const EMBED_PROVIDER_LABEL: Record<ArticleEmbedProvider, string> = {
	twitter: 'Tweet',
	youtube: 'YouTube',
	medium: 'Medium',
	mirror: 'Mirror',
	substack: 'Substack',
	github: 'GitHub',
	iframe: 'Iframe'
}

export const EMBED_PROVIDER_ASPECT: Record<ArticleEmbedProvider, ArticleEmbedAspectRatio> = {
	twitter: 'auto',
	youtube: '16/9',
	medium: 'auto',
	mirror: 'auto',
	substack: 'auto',
	github: 'auto',
	iframe: '16/9'
}

export type EmbedDetection = {
	provider: ArticleEmbedProvider
	url: string
	sourceUrl: string
	aspectRatio: ArticleEmbedAspectRatio
}

function safeUrl(value: string): URL | null {
	try {
		const trimmed = value.trim()
		if (!trimmed) return null
		const url = new URL(trimmed)
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
		return url
	} catch {
		return null
	}
}

function youTubeId(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (host === 'youtu.be') {
		const id = url.pathname.replace(/^\//, '').split('/')[0]
		return id || null
	}
	if (host.endsWith('youtube.com')) {
		if (url.pathname === '/watch') return url.searchParams.get('v')
		const shortsMatch = url.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/)
		if (shortsMatch) return shortsMatch[2]
	}
	return null
}

function tweetId(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (!host.endsWith('twitter.com') && !host.endsWith('x.com')) return null
	const match = url.pathname.match(/\/status(?:es)?\/(\d+)/)
	return match ? match[1] : null
}

function mediumUrl(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (host !== 'medium.com' && host !== 'www.medium.com' && !host.endsWith('.medium.com')) return null
	if (url.pathname.length <= 1) return null
	return url.toString()
}

function mirrorUrl(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (host !== 'mirror.xyz' && host !== 'www.mirror.xyz' && !host.endsWith('.mirror.xyz')) return null
	if (url.pathname.length <= 1) return null
	return url.toString()
}

function substackUrl(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	const isSubstack = host === 'substack.com' || host === 'www.substack.com' || host.endsWith('.substack.com')
	if (!isSubstack) return null
	if (url.pathname.length <= 1) return null
	return url.toString()
}

function telegramEmbedUrl(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (host !== 't.me' && host !== 'www.t.me') return null
	const match = url.pathname.match(/^\/([A-Za-z0-9_]+)\/(\d+)\/?$/)
	if (!match) return null
	return `https://t.me/${match[1]}/${match[2]}?embed=1&dark=auto`
}

function flourishEmbedUrl(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (host === 'flo.uri.sh') return url.toString()
	const isFlourish =
		host === 'public.flourish.studio' || host === 'app.flourish.studio' || host.endsWith('.flourish.studio')
	if (!isFlourish) return null
	if (url.pathname.includes('/embed')) return url.toString()
	const trimmed = url.pathname.replace(/\/+$/, '')
	return `${url.origin}${trimmed}/embed${url.search}`
}

function datawrapperEmbedUrl(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (host === 'datawrapper.dwcdn.net' || host.endsWith('.dwcdn.net')) {
		if (!/^\/[A-Za-z0-9]+\/?/.test(url.pathname)) return null
		return url.toString()
	}
	if (host === 'datawrapper.de' || host === 'www.datawrapper.de') {
		const match = url.pathname.match(/^\/(?:_\/)?([A-Za-z0-9]+)\/?/)
		if (!match) return null
		return `https://datawrapper.dwcdn.net/${match[1]}/`
	}
	return null
}

function githubUrl(url: URL): string | null {
	const host = url.hostname.toLowerCase()
	if (host === 'gist.github.com') {
		if (url.pathname.match(/^\/[^/]+\/[a-f0-9]+/i)) return url.toString()
		return null
	}
	if (host === 'github.com' || host === 'www.github.com') {
		if (url.pathname.length <= 1) return null
		return url.toString()
	}
	return null
}

export function detectEmbed(rawUrl: string): EmbedDetection | null {
	const url = safeUrl(rawUrl)
	if (!url) return null

	const tid = tweetId(url)
	if (tid) {
		return {
			provider: 'twitter',
			url: `https://twitter.com/i/status/${tid}`,
			sourceUrl: url.toString(),
			aspectRatio: 'auto'
		}
	}

	const yid = youTubeId(url)
	if (yid) {
		return {
			provider: 'youtube',
			url: `https://www.youtube.com/embed/${yid}`,
			sourceUrl: url.toString(),
			aspectRatio: '16/9'
		}
	}

	const medium = mediumUrl(url)
	if (medium) {
		return {
			provider: 'medium',
			url: medium,
			sourceUrl: url.toString(),
			aspectRatio: 'auto'
		}
	}

	const mirror = mirrorUrl(url)
	if (mirror) {
		return {
			provider: 'mirror',
			url: mirror,
			sourceUrl: url.toString(),
			aspectRatio: 'auto'
		}
	}

	const substack = substackUrl(url)
	if (substack) {
		return {
			provider: 'substack',
			url: substack,
			sourceUrl: url.toString(),
			aspectRatio: 'auto'
		}
	}

	const github = githubUrl(url)
	if (github) {
		return {
			provider: 'github',
			url: github,
			sourceUrl: url.toString(),
			aspectRatio: 'auto'
		}
	}

	const telegram = telegramEmbedUrl(url)
	if (telegram) {
		return {
			provider: 'iframe',
			url: telegram,
			sourceUrl: url.toString(),
			aspectRatio: 'auto'
		}
	}

	const flourish = flourishEmbedUrl(url)
	if (flourish) {
		return {
			provider: 'iframe',
			url: flourish,
			sourceUrl: url.toString(),
			aspectRatio: '16/9'
		}
	}

	const datawrapper = datawrapperEmbedUrl(url)
	if (datawrapper) {
		return {
			provider: 'iframe',
			url: datawrapper,
			sourceUrl: url.toString(),
			aspectRatio: '16/9'
		}
	}

	return null
}

const VALID_PROVIDERS = new Set<ArticleEmbedProvider>([
	'twitter',
	'youtube',
	'medium',
	'mirror',
	'substack',
	'github',
	'iframe'
])
const VALID_ASPECTS = new Set<ArticleEmbedAspectRatio>(['16/9', '4/3', '1/1', 'auto'])

function isValidProvider(value: unknown): value is ArticleEmbedProvider {
	return typeof value === 'string' && VALID_PROVIDERS.has(value as ArticleEmbedProvider)
}

function isValidAspect(value: unknown): value is ArticleEmbedAspectRatio {
	return typeof value === 'string' && VALID_ASPECTS.has(value as ArticleEmbedAspectRatio)
}

export function validateEmbedConfig(value: unknown): ArticleEmbedConfig | null {
	if (!value || typeof value !== 'object') return null
	const v = value as Record<string, unknown>
	const provider = v.provider
	const url = v.url
	const sourceUrl = v.sourceUrl
	if (!isValidProvider(provider)) return null
	if (typeof url !== 'string' || !safeUrl(url)) return null
	if (typeof sourceUrl !== 'string' || !safeUrl(sourceUrl)) return null

	const parsed = safeUrl(url)
	if (!parsed) return null
	if (!isEmbedHostAllowed(parsed.hostname)) return null

	const config: ArticleEmbedConfig = {
		provider,
		url,
		sourceUrl
	}
	if (typeof v.title === 'string' && v.title.trim().length) config.title = v.title.trim().slice(0, 240)
	if (typeof v.caption === 'string' && v.caption.trim().length) config.caption = v.caption.trim().slice(0, 600)
	if (isValidAspect(v.aspectRatio)) config.aspectRatio = v.aspectRatio
	return config
}

export function getEmbedAspectRatio(config: ArticleEmbedConfig): ArticleEmbedAspectRatio {
	return config.aspectRatio || EMBED_PROVIDER_ASPECT[config.provider] || 'auto'
}

export function getEmbedProviderLabel(provider: ArticleEmbedProvider): string {
	return EMBED_PROVIDER_LABEL[provider] || 'Embed'
}
