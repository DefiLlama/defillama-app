import { useEffect, useRef, useState } from 'react'
import { getEmbedAspectRatio, getEmbedProviderLabel } from '../embedProviders'
import type { ArticleEmbedConfig } from '../types'

const TWITTER_WIDGETS_SRC = 'https://platform.twitter.com/widgets.js'

let twitterWidgetsPromise: Promise<void> | null = null

function loadTwitterWidgets(): Promise<void> {
	if (typeof window === 'undefined') return Promise.resolve()
	if (twitterWidgetsPromise) return twitterWidgetsPromise
	const w = window as Window & { twttr?: { widgets?: { load?: (el?: HTMLElement) => void } } }
	if (w.twttr?.widgets?.load) return Promise.resolve()
	twitterWidgetsPromise = new Promise<void>((resolve) => {
		const existing = document.querySelector<HTMLScriptElement>(`script[src="${TWITTER_WIDGETS_SRC}"]`)
		if (existing) {
			existing.addEventListener('load', () => resolve(), { once: true })
			return
		}
		const script = document.createElement('script')
		script.src = TWITTER_WIDGETS_SRC
		script.async = true
		script.charset = 'utf-8'
		script.addEventListener('load', () => resolve(), { once: true })
		document.body.appendChild(script)
	})
	return twitterWidgetsPromise
}

function aspectClass(aspect: string) {
	if (aspect === 'auto') return ''
	if (aspect === '4/3') return 'aspect-[4/3]'
	if (aspect === '1/1') return 'aspect-square'
	return 'aspect-video'
}

function shortenUrl(sourceUrl: string) {
	try {
		const url = new URL(sourceUrl)
		const host = url.hostname.replace(/^www\./, '')
		const path = url.pathname.length > 1 ? url.pathname : ''
		const trimmed = path.length > 36 ? `${path.slice(0, 33)}…` : path
		return `${host}${trimmed}`
	} catch {
		return sourceUrl
	}
}

function EmbedFigure({
	config,
	children,
	index
}: {
	config: ArticleEmbedConfig
	children: React.ReactNode
	index?: number
}) {
	const figureLabel = typeof index === 'number' ? `Fig. ${String(index).padStart(2, '0')}` : null
	const providerLabel = getEmbedProviderLabel(config.provider)
	const captionText = config.caption || config.title

	return (
		<figure className="article-embed-figure not-prose my-8 grid gap-2">
			<div className="article-embed-body relative">{children}</div>

			<figcaption className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-t border-(--cards-border) pt-2 text-[12.5px] leading-snug text-(--text-secondary)">
				<div className="min-w-0 flex-1">
					{figureLabel ? (
						<span className="mr-2 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
							{figureLabel}
						</span>
					) : null}
					{captionText ? <span>{captionText}</span> : null}
				</div>
				{config.sourceUrl ? (
					<a
						href={config.sourceUrl}
						target="_blank"
						rel="noreferrer noopener"
						className="shrink-0 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase transition-colors hover:text-(--link-text)"
					>
						{providerLabel} ↗
					</a>
				) : null}
			</figcaption>
		</figure>
	)
}

function IframeEmbed({ config }: { config: ArticleEmbedConfig }) {
	const aspect = getEmbedAspectRatio(config)
	const cls = aspectClass(aspect)
	const heightStyle = aspect === 'auto' ? { height: 480 } : undefined
	return (
		<div
			className={`overflow-hidden rounded-md border border-(--cards-border) bg-(--app-bg) ${cls}`}
			style={heightStyle}
		>
			<iframe
				src={config.url}
				title={config.title || config.sourceUrl}
				loading="lazy"
				referrerPolicy="no-referrer-when-downgrade"
				allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
				sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation"
				className="h-full w-full border-0"
			/>
		</div>
	)
}

function LinkCard({ config, action }: { config: ArticleEmbedConfig; action: string }) {
	const display = shortenUrl(config.sourceUrl)
	return (
		<a
			href={config.sourceUrl}
			target="_blank"
			rel="noreferrer noopener"
			className="group flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--app-bg) p-5 no-underline transition-colors hover:border-(--link-text)/50"
		>
			<div className="flex items-baseline justify-between gap-4">
				<div className="min-w-0 flex-1 text-base leading-snug font-semibold text-(--text-primary) group-hover:text-(--link-text)">
					{config.title || `Open ${display}`}
				</div>
				<span className="shrink-0 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase transition-colors group-hover:text-(--link-text)">
					{action} ↗
				</span>
			</div>
			<div className="truncate font-jetbrains text-[11px] text-(--text-tertiary)">{display}</div>
		</a>
	)
}

function TweetEmbed({ config, action }: { config: ArticleEmbedConfig; action: string }) {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const [visible, setVisible] = useState(false)
	const [resolved, setResolved] = useState(false)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		const el = containerRef.current
		if (!el || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
			setVisible(true)
			return
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setVisible(true)
						observer.disconnect()
						break
					}
				}
			},
			{ rootMargin: '200px' }
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		if (!visible) return
		let cancelled = false
		let timeoutId: ReturnType<typeof setTimeout> | null = null
		let pollId: ReturnType<typeof setInterval> | null = null
		loadTwitterWidgets().then(() => {
			if (cancelled) return
			const w = window as Window & { twttr?: { widgets?: { load?: (el?: HTMLElement) => void } } }
			w.twttr?.widgets?.load?.(containerRef.current ?? undefined)
			pollId = setInterval(() => {
				const node = containerRef.current
				if (!node) return
				const rendered = node.querySelector('.twitter-tweet-rendered, iframe.twitter-tweet')
				if (rendered) {
					setResolved(true)
					if (pollId) clearInterval(pollId)
					if (timeoutId) clearTimeout(timeoutId)
				}
			}, 400)
			timeoutId = setTimeout(() => {
				if (cancelled) return
				const node = containerRef.current
				const rendered = node?.querySelector('.twitter-tweet-rendered, iframe.twitter-tweet')
				if (!rendered) setFailed(true)
				if (pollId) clearInterval(pollId)
			}, 6000)
		})
		return () => {
			cancelled = true
			if (timeoutId) clearTimeout(timeoutId)
			if (pollId) clearInterval(pollId)
		}
	}, [visible])

	if (failed && !resolved) {
		return <LinkCard config={config} action={action} />
	}

	return (
		<div ref={containerRef} className="grid min-h-32 place-items-center">
			{visible ? (
				<blockquote className="twitter-tweet" data-dnt="true" cite={config.url}>
					<a href={config.url} target="_blank" rel="noreferrer noopener">
						{config.title || 'View tweet'}
					</a>
				</blockquote>
			) : (
				<div className="flex h-32 items-center justify-center font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					Loading…
				</div>
			)}
		</div>
	)
}

const LINK_CARD_ACTIONS: Partial<Record<ArticleEmbedConfig['provider'], string>> = {
	medium: 'Read',
	mirror: 'Read',
	substack: 'Read',
	github: 'View',
	twitter: 'Open'
}

export function ArticleEmbedBlock({ config, index }: { config: ArticleEmbedConfig; index?: number }) {
	const action = LINK_CARD_ACTIONS[config.provider] || 'Open'
	if (config.provider === 'twitter') {
		return (
			<EmbedFigure config={config} index={index}>
				<TweetEmbed config={config} action={action} />
			</EmbedFigure>
		)
	}
	if (config.provider in LINK_CARD_ACTIONS) {
		return (
			<EmbedFigure config={config} index={index}>
				<LinkCard config={config} action={action} />
			</EmbedFigure>
		)
	}
	return (
		<EmbedFigure config={config} index={index}>
			<IframeEmbed config={config} />
		</EmbedFigure>
	)
}
