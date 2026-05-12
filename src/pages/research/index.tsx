import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import {
	ArticleApiError,
	listArticleSections,
	listArticles,
	listSpotlightArticles,
	type ArticleListResponse,
	type ArticleSectionListResponse,
	type ArticleSpotlightResponse
} from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { ArticleBannerStrip } from '~/containers/Articles/renderer/ArticleBannerStrip'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument, ArticleSection } from '~/containers/Articles/types'
import { ARTICLE_SECTION_LABELS, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

function articleHref(article: { slug: string; section?: ArticleSection | null }): string {
	if (article.section) {
		return `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`
	}
	return '/research'
}

type LandingData = {
	articles: ArticleDocument[]
	hero: ArticleDocument | null
	picks: ArticleDocument[]
	latest: ArticleDocument[]
	totalItems: number
}

const EMPTY_LIST: ArticleListResponse = {
	items: [],
	page: 1,
	perPage: 20,
	totalItems: 0,
	totalPages: 1
}

const getQueryParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

function formatDate(value: string | null, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
	if (!value) return 'Draft'
	return new Intl.DateTimeFormat('en', options).format(new Date(value))
}

function timeAgo(value: string | null) {
	if (!value) return 'Draft'
	const ms = Date.now() - new Date(value).getTime()
	if (ms < 0) return formatDate(value, { month: 'short', day: 'numeric', year: 'numeric' })
	const minutes = Math.floor(ms / 60_000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days < 7) return `${days}d ago`
	return formatDate(value, { month: 'short', day: 'numeric', year: 'numeric' })
}

function readingMinutes(article: ArticleDocument) {
	const text = article.plainText?.trim() || article.excerpt?.trim() || ''
	const words = text ? text.split(/\s+/).length : 0
	return Math.max(1, Math.ceil(words / 220))
}

function humanizeTag(tag: string) {
	return tag.replace(/-/g, ' ')
}

function uniqueArticles(items: ArticleDocument[]) {
	const seen = new Set<string>()
	const out: ArticleDocument[] = []
	for (const item of items) {
		if (seen.has(item.id)) continue
		seen.add(item.id)
		out.push(item)
	}
	return out
}

function getTagStats(articles: ArticleDocument[], limit = 12) {
	const counts = new Map<string, number>()
	for (const article of articles) {
		for (const tag of article.tags ?? []) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1)
		}
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)
}

function resolveCover(article: ArticleDocument | null | undefined) {
	return article?.coverImage?.url || null
}

const dominantColorCache = new Map<string, string | null>()
const dominantColorPending = new Map<string, Promise<string | null>>()

function extractDominantColor(url: string): Promise<string | null> {
	if (dominantColorCache.has(url)) return Promise.resolve(dominantColorCache.get(url) ?? null)
	const existing = dominantColorPending.get(url)
	if (existing) return existing
	const promise = new Promise<string | null>((resolve) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		let done = false
		const finish = (color: string | null) => {
			if (done) return
			done = true
			dominantColorCache.set(url, color)
			dominantColorPending.delete(url)
			resolve(color)
		}
		img.onload = () => {
			try {
				const canvas = document.createElement('canvas')
				const w = (canvas.width = 28)
				const h = (canvas.height = 28)
				const ctx = canvas.getContext('2d')
				if (!ctx) return finish(null)
				ctx.drawImage(img, 0, 0, w, h)
				const data = ctx.getImageData(0, 0, w, h).data
				let r = 0
				let g = 0
				let b = 0
				let count = 0
				for (let i = 0; i < data.length; i += 4) {
					if (data[i + 3] < 200) continue
					const rv = data[i]
					const gv = data[i + 1]
					const bv = data[i + 2]
					const max = Math.max(rv, gv, bv)
					const min = Math.min(rv, gv, bv)
					if (max - min < 25) continue
					if (max + min < 90 || max + min > 460) continue
					r += rv
					g += gv
					b += bv
					count++
				}
				if (count < 4) return finish(null)
				const lift = (channel: number) => {
					const avg = Math.round(channel / count)
					return Math.min(255, Math.round(avg * 0.55 + 255 * 0.45))
				}
				finish(`rgb(${lift(r)}, ${lift(g)}, ${lift(b)})`)
			} catch {
				finish(null)
			}
		}
		img.onerror = () => finish(null)
		img.src = url
	})
	dominantColorPending.set(url, promise)
	return promise
}

function useArticleAccent(url: string | null | undefined): string | null {
	const [color, setColor] = useState<string | null>(() => (url ? (dominantColorCache.get(url) ?? null) : null))
	useEffect(() => {
		if (!url) {
			setColor(null)
			return
		}
		const cached = dominantColorCache.get(url)
		if (cached !== undefined) {
			setColor(cached)
			return
		}
		let cancelled = false
		const run = () => {
			extractDominantColor(url).then((c) => {
				if (!cancelled) setColor(c)
			})
		}
		const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
		if (typeof ric === 'function') {
			ric(run)
		} else {
			setTimeout(run, 60)
		}
		return () => {
			cancelled = true
		}
	}, [url])
	return color
}

function accentStyle(color: string | null): React.CSSProperties {
	return { ['--accent' as string]: color ?? 'var(--link-text)' }
}

function AccentDot({ className = '' }: { className?: string }) {
	return <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 bg-(--accent) align-middle ${className}`} />
}

function ByLine({
	article,
	className = '',
	includeTags = false
}: {
	article: ArticleDocument
	className?: string
	includeTags?: boolean
}) {
	const tags = includeTags ? (article.tags?.slice(0, 2) ?? []) : []
	return (
		<div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-tertiary) ${className}`}>
			{article.authorProfile ? (
				<span className="font-medium text-(--text-secondary)">{article.authorProfile.displayName}</span>
			) : null}
			{article.authorProfile ? <span aria-hidden>·</span> : null}
			<span className="font-jetbrains tabular-nums">{timeAgo(article.publishedAt)}</span>
			<span aria-hidden>·</span>
			<span>{readingMinutes(article)} min read</span>
			{tags.length ? (
				<>
					<span aria-hidden>·</span>
					<span className="font-jetbrains tracking-[0.18em] uppercase">
						{tags.map((tag) => humanizeTag(tag)).join(' · ')}
					</span>
				</>
			) : null}
		</div>
	)
}

function MineLink() {
	const { isAuthenticated } = useAuthContext()
	if (!isAuthenticated) return null
	return (
		<Link
			href="/research/mine"
			className="inline-flex min-h-9 items-center border border-(--cards-border) px-3 text-sm text-(--text-secondary) transition-colors hover:border-(--link-text) hover:text-(--text-primary)"
		>
			My research
		</Link>
	)
}

function WriteLink() {
	return (
		<Link
			href="/research/new"
			className="inline-flex min-h-9 items-center bg-(--link-text) px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
		>
			Write
		</Link>
	)
}

function AdminLink() {
	return (
		<Link
			href="/research/admin"
			className="inline-flex min-h-9 items-center border border-(--cards-border) px-3 text-sm text-(--text-secondary) transition-colors hover:border-(--link-text) hover:text-(--text-primary)"
		>
			Admin
		</Link>
	)
}

function SearchBar({ query, tag, routePath }: { query: string; tag: string; routePath: string }) {
	const router = useRouter()
	const queryInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (queryInputRef.current && document.activeElement !== queryInputRef.current) {
			queryInputRef.current.value = query
		}
	}, [query])

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const nextQuery = queryInputRef.current?.value.trim() ?? ''
		const params = new URLSearchParams()
		if (nextQuery) params.set('q', nextQuery)
		if (tag) params.set('tag', tag)
		const search = params.toString()
		const href = search ? `${routePath}?${search}` : routePath
		router.push(href, undefined, { shallow: false, scroll: false })
	}

	return (
		<form
			action={routePath}
			onSubmit={handleSubmit}
			className="flex min-h-11 items-stretch border border-(--cards-border) transition-colors focus-within:border-(--link-text)"
		>
			<label className="relative flex-1">
				<span className="sr-only">Search research</span>
				<Icon
					name="search"
					height={14}
					width={14}
					className="pointer-events-none absolute top-0 bottom-0 left-3 my-auto text-(--text-tertiary)"
				/>
				<input
					ref={queryInputRef}
					name="q"
					defaultValue={query}
					placeholder="Search research"
					className="h-full w-full bg-transparent py-2 pr-3 pl-9 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-none"
				/>
			</label>
			<button
				type="submit"
				className="inline-flex items-center justify-center border-l border-(--cards-border) px-4 font-jetbrains text-[11px] tracking-[0.18em] text-(--text-primary) uppercase transition-colors hover:bg-(--link-text)/10 hover:text-(--link-text)"
			>
				Search →
			</button>
		</form>
	)
}

function SectionHeader({ label, right }: { label: string; right?: string }) {
	return (
		<div className="flex items-end justify-between gap-3">
			<h2 className="font-jetbrains text-[11px] font-semibold tracking-[0.18em] text-(--text-tertiary) uppercase">
				{label}
			</h2>
			{right ? (
				<span className="font-jetbrains text-[11px] tracking-tight text-(--text-tertiary) tabular-nums">{right}</span>
			) : null}
		</div>
	)
}

function EmptyState() {
	return (
		<div className="border border-dashed border-(--cards-border) p-8 text-center">
			<p className="text-sm text-(--text-secondary)">No published research found.</p>
		</div>
	)
}

function SkeletonBlock({ className = '' }: { className?: string }) {
	return <div className={`bg-(--cards-border) ${className}`} aria-hidden />
}

function LoadingPlaceholder() {
	return (
		<div className="mx-auto grid w-full max-w-7xl gap-8 px-1 pb-16" aria-busy="true" aria-label="Loading research">
			<header className="grid">
				<div className="grid gap-4 border-b-2 border-(--text-primary) pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<SkeletonBlock className="h-14 w-full max-w-2xl md:h-20" />
					<div className="flex flex-wrap items-center gap-2 lg:justify-end">
						<SkeletonBlock className="h-9 w-28" />
						<SkeletonBlock className="h-9 w-20" />
					</div>
				</div>
				<div className="grid gap-2 py-5">
					<SkeletonBlock className="h-6 w-full max-w-2xl md:h-7" />
					<SkeletonBlock className="h-6 w-2/3 max-w-xl md:h-7" />
				</div>
				<div className="grid gap-4 border-t border-(--cards-border) pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.52fr)] lg:items-center">
					<div className="flex flex-wrap gap-x-5 gap-y-2">
						{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
							<SkeletonBlock key={i} className="h-3 w-16" />
						))}
					</div>
					<SkeletonBlock className="h-11 w-full" />
				</div>
			</header>

			<section className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.55fr)_260px]">
				<div className="grid gap-5">
					<SkeletonBlock className="aspect-[1.35] w-full" />
					<div className="grid gap-3 border-t border-(--cards-border) pt-4">
						<SkeletonBlock className="h-3 w-32" />
						<SkeletonBlock className="h-12 w-full max-w-md md:h-16" />
						<SkeletonBlock className="h-12 w-3/4 md:h-16" />
						<SkeletonBlock className="h-4 w-2/3 max-w-xl" />
						<SkeletonBlock className="h-3 w-44" />
					</div>
				</div>
				<div className="grid content-start gap-6">
					{[0, 1, 2].map((i) => (
						<div key={i} className="grid gap-3 border-t border-(--cards-border) pt-4">
							<div className="flex items-baseline justify-between gap-3">
								<SkeletonBlock className="h-3 w-20" />
								<SkeletonBlock className="h-3 w-12" />
							</div>
							<SkeletonBlock className="h-6 w-full" />
							<SkeletonBlock className="h-6 w-3/4" />
							<SkeletonBlock className="h-3 w-full max-w-xs" />
							<SkeletonBlock className="h-3 w-2/3" />
						</div>
					))}
				</div>
				<aside className="border-l border-(--cards-border) pl-5">
					<div className="flex items-end justify-between gap-3 pb-4">
						<SkeletonBlock className="h-3 w-12" />
						<SkeletonBlock className="h-3 w-6" />
					</div>
					<ol className="grid">
						{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
							<li
								key={i}
								className="grid grid-cols-[20px_minmax(0,1fr)] items-baseline gap-3 border-b border-(--cards-border) py-3 first:pt-0 last:border-b-0"
							>
								<SkeletonBlock className="h-3" />
								<div className="grid gap-2">
									<SkeletonBlock className="h-3 w-full" />
									<SkeletonBlock className="h-2.5 w-1/2" />
								</div>
							</li>
						))}
					</ol>
				</aside>
			</section>

			<section className="grid gap-4">
				<div className="flex items-end justify-between gap-3">
					<SkeletonBlock className="h-3 w-20" />
				</div>
				<div className="grid gap-6 border-t border-b border-(--cards-border) py-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-(--cards-border)">
					{[0, 1, 2].map((i) => (
						<div key={i} className="grid gap-3 md:px-5 md:first:pl-0 md:last:pr-0">
							<div className="flex items-baseline justify-between gap-3">
								<SkeletonBlock className="h-3 w-16" />
								<SkeletonBlock className="h-3 w-12" />
							</div>
							<SkeletonBlock className="h-5 w-full" />
							<SkeletonBlock className="h-5 w-2/3" />
							<SkeletonBlock className="h-3 w-full max-w-xs" />
							<SkeletonBlock className="h-3 w-1/2" />
						</div>
					))}
				</div>
			</section>

			<section className="grid gap-4">
				<div className="flex items-end justify-between gap-3">
					<SkeletonBlock className="h-3 w-20" />
					<SkeletonBlock className="h-3 w-32" />
				</div>
				<ul className="grid border-t border-(--cards-border)">
					{[0, 1, 2, 3, 4].map((i) => (
						<li
							key={i}
							className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-b border-(--cards-border) py-5 sm:grid-cols-[92px_116px_minmax(0,1fr)] sm:gap-5"
						>
							<SkeletonBlock className="h-3 w-16 sm:hidden" />
							<SkeletonBlock className="hidden h-3 w-16 sm:block" />
							<SkeletonBlock className="hidden aspect-[4/3] sm:block" />
							<div className="grid content-start gap-2">
								<SkeletonBlock className="h-5 w-3/4" />
								<SkeletonBlock className="h-3 w-full max-w-md" />
								<SkeletonBlock className="h-3 w-2/3 max-w-sm" />
								<SkeletonBlock className="h-3 w-44" />
							</div>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}

function ResultRow({ article }: { article: ArticleDocument }) {
	const cover = resolveCover(article)
	const accent = useArticleAccent(cover)
	return (
		<li>
			<Link
				href={articleHref(article)}
				style={accentStyle(accent)}
				className="group grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-(--cards-border) py-5 transition-colors last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5"
			>
				{cover ? (
					<img src={cover} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
				) : (
					<div className="aspect-[4/3] w-full bg-(--cards-bg)" aria-hidden />
				)}
				<div className="grid content-start gap-1.5">
					<h3 className="text-base leading-tight font-semibold text-(--text-primary) transition-colors group-hover:text-(--accent)">
						{article.title}
					</h3>
					{article.excerpt || article.subtitle ? (
						<p className="line-clamp-2 text-sm leading-relaxed text-(--text-secondary)">
							{article.excerpt || article.subtitle}
						</p>
					) : null}
					<div className="flex items-center gap-2">
						<AccentDot />
						<ByLine article={article} includeTags />
					</div>
				</div>
			</Link>
		</li>
	)
}

function FilteredResults({
	query,
	tag,
	articles,
	totalItems
}: {
	query: string
	tag: string
	articles: ArticleDocument[]
	totalItems: number
}) {
	return (
		<div className="mx-auto grid w-full max-w-5xl gap-6 px-1 pb-16">
			<header className="grid gap-5 border-b-2 border-(--text-primary) pb-5">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div className="grid gap-2">
						<span className="font-jetbrains text-[11px] tracking-[0.18em] text-(--text-tertiary) uppercase">
							Research · Results
						</span>
						<h1 className="text-3xl leading-tight font-semibold tracking-tight text-(--text-primary) md:text-4xl">
							{query ? <>"{query}"</> : tag ? <>#{tag}</> : 'All research'}
						</h1>
						<p className="font-jetbrains text-[11px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
							{totalItems} {totalItems === 1 ? 'Result' : 'Results'}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<MineLink />
						<WriteLink />
					</div>
				</div>
				<SearchBar query={query} tag={tag} routePath="/research" />
			</header>
			{articles.length ? (
				<ul className="grid border-t border-(--cards-border)">
					{articles.map((article) => (
						<ResultRow key={article.id} article={article} />
					))}
				</ul>
			) : (
				<EmptyState />
			)}
		</div>
	)
}

function TopicLinks({ tagStats, limit = 8 }: { tagStats: [string, number][]; limit?: number }) {
	if (!tagStats.length) return null
	return (
		<div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 font-jetbrains text-[11px] tracking-[0.18em] uppercase">
			<span className="text-(--text-tertiary)">Topics</span>
			{tagStats.slice(0, limit).map(([tag, count]) => (
				<Link
					key={tag}
					href={`/research?tag=${encodeURIComponent(tag)}`}
					className="group inline-flex items-baseline gap-1.5 text-(--text-secondary) transition-colors hover:text-(--link-text)"
				>
					<span>{humanizeTag(tag)}</span>
					<span className="text-(--text-tertiary) tabular-nums">{count}</span>
				</Link>
			))}
		</div>
	)
}

function HeroCover({ cover, caption, minutes }: { cover: string | null; caption: string; minutes: number }) {
	const stageRef = useRef<HTMLDivElement>(null)
	const sceneRef = useRef<HTMLDivElement>(null)
	const captionRef = useRef<HTMLDivElement>(null)
	const rafRef = useRef<number | null>(null)

	const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const stage = stageRef.current
		const scene = sceneRef.current
		const cap = captionRef.current
		if (!stage || !scene) return
		const rect = stage.getBoundingClientRect()
		const x = (e.clientX - rect.left) / rect.width - 0.5
		const y = (e.clientY - rect.top) / rect.height - 0.5
		if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
		rafRef.current = requestAnimationFrame(() => {
			const rx = -y * 6
			const ry = x * 9
			scene.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translate3d(${(x * 6).toFixed(2)}px, ${(y * 6).toFixed(2)}px, 0) scale(1.025)`
			if (cap) {
				cap.style.transform = `translate3d(${(-x * 14).toFixed(2)}px, ${(-y * 10).toFixed(2)}px, 60px)`
			}
			stage.style.setProperty('--cover-x', `${((x + 0.5) * 100).toFixed(1)}%`)
			stage.style.setProperty('--cover-y', `${((y + 0.5) * 100).toFixed(1)}%`)
		})
	}

	const handleLeave = () => {
		if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
		const scene = sceneRef.current
		const cap = captionRef.current
		if (scene) scene.style.transform = ''
		if (cap) cap.style.transform = ''
	}

	return (
		<div
			ref={stageRef}
			onMouseMove={cover ? handleMove : undefined}
			onMouseLeave={cover ? handleLeave : undefined}
			className="group/cover relative overflow-hidden [perspective:1400px]"
		>
			<div
				ref={sceneRef}
				className="relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
			>
				{cover ? (
					<img
						src={cover}
						alt=""
						loading="eager"
						decoding="async"
						className="aspect-[1.35] w-full origin-center animate-ken-burns object-cover will-change-transform group-hover/cover:[animation-play-state:paused]"
					/>
				) : (
					<div className="grid aspect-[1.35] place-items-center bg-(--cards-bg)" aria-hidden />
				)}
				{cover ? (
					<div
						ref={captionRef}
						className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 mix-blend-difference transition-transform duration-500 ease-out sm:inset-x-5 sm:bottom-5"
					>
						<span className="font-jetbrains text-[11px] tracking-[0.22em] text-white uppercase">{caption}</span>
						<span className="font-jetbrains text-[11px] tracking-[0.22em] text-white uppercase tabular-nums">
							{minutes} min
						</span>
					</div>
				) : null}
			</div>
			{cover ? (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/cover:opacity-100"
					style={{
						background:
							'radial-gradient(circle at var(--cover-x, 50%) var(--cover-y, 50%), rgba(255,255,255,0.06), transparent 55%)'
					}}
				/>
			) : null}
		</div>
	)
}

function MagazineLead({ article }: { article: ArticleDocument }) {
	const cover = resolveCover(article)
	const accent = useArticleAccent(cover)
	const captionTag = article.tags?.[0]
	const caption = `${captionTag ? humanizeTag(captionTag).toUpperCase() : 'COVER'} · ${formatDate(article.publishedAt, { month: 'short', day: 'numeric' })}`
	return (
		<Link href={articleHref(article)} style={accentStyle(accent)} className="group grid gap-5">
			<HeroCover cover={cover} caption={caption} minutes={readingMinutes(article)} />
			<div className="grid gap-4 border-t border-(--cards-border) pt-4">
				<div className="flex items-center gap-2 font-jetbrains text-[11px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					<AccentDot />
					<span>Cover</span>
					<span aria-hidden>·</span>
					<span>{formatDate(article.publishedAt, { month: 'long', day: 'numeric' })}</span>
				</div>
				<h2 className="max-w-[12ch] text-5xl leading-[0.95] font-semibold tracking-tight text-(--text-primary) group-hover:text-(--accent) md:text-7xl">
					{article.title}
				</h2>
				{article.subtitle || article.excerpt ? (
					<p className="max-w-2xl text-lg leading-snug text-(--text-secondary)">
						{article.subtitle || article.excerpt}
					</p>
				) : null}
				<ByLine article={article} className="text-sm" />
			</div>
		</Link>
	)
}

function MagazineSideStory({ article, label }: { article: ArticleDocument; label: string }) {
	const cover = resolveCover(article)
	const accent = useArticleAccent(cover)
	const primaryTag = article.tags?.[0]
	return (
		<Link
			href={articleHref(article)}
			style={accentStyle(accent)}
			className="group relative grid gap-3 border-t border-(--cards-border) pt-4"
		>
			<div className="flex items-center justify-between gap-3 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
				<span className="flex items-center gap-2">
					<AccentDot />
					{primaryTag ? humanizeTag(primaryTag) : label}
				</span>
				<span className="tabular-nums">{readingMinutes(article)} min</span>
			</div>
			<h3 className="text-2xl leading-tight font-semibold tracking-tight text-(--text-primary) group-hover:text-(--accent)">
				{article.title}
			</h3>
			{article.excerpt || article.subtitle ? (
				<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
					{article.excerpt || article.subtitle}
				</p>
			) : null}
			<ArticleHoverPreview
				article={article}
				className="top-1/2 right-full mr-5 -translate-x-2 -translate-y-1/2 group-hover:translate-x-0"
			/>
		</Link>
	)
}

function SignalCard({ article }: { article: ArticleDocument }) {
	const cover = resolveCover(article)
	const accent = useArticleAccent(cover)
	const primaryTag = article.tags?.[0]
	return (
		<Link
			href={articleHref(article)}
			style={accentStyle(accent)}
			className="group grid content-start gap-3 transition-colors md:px-5 md:first:pl-0 md:last:pr-0"
		>
			<div className="flex items-center justify-between gap-3 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
				<span className="flex items-center gap-2">
					<AccentDot />
					{primaryTag ? humanizeTag(primaryTag) : 'Feature'}
				</span>
				<span className="tabular-nums">{readingMinutes(article)} min</span>
			</div>
			<h3 className="text-lg leading-tight font-semibold tracking-tight text-(--text-primary) group-hover:text-(--accent)">
				{article.title}
			</h3>
			{article.excerpt || article.subtitle ? (
				<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
					{article.excerpt || article.subtitle}
				</p>
			) : null}
			<ByLine article={article} className="pt-1" />
		</Link>
	)
}

function ArticleHoverPreview({ article, className = '' }: { article: ArticleDocument; className?: string }) {
	const cover = resolveCover(article)
	const excerpt = article.excerpt || article.subtitle
	return (
		<span
			aria-hidden
			className={`pointer-events-none absolute z-20 hidden w-72 border border-(--cards-border) bg-(--app-bg) p-3 opacity-0 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)] transition duration-200 ease-out group-hover:opacity-100 lg:block ${className}`}
		>
			{cover ? (
				<span className="block aspect-[4/3] w-full overflow-hidden">
					<img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
				</span>
			) : (
				<span className="block aspect-[4/3] w-full bg-(--cards-bg)" />
			)}
			<span className="mt-3 block text-sm leading-snug font-medium text-(--text-primary)">{article.title}</span>
			{excerpt ? (
				<span className="mt-1.5 line-clamp-3 block text-xs leading-relaxed text-(--text-secondary)">{excerpt}</span>
			) : null}
			<span className="mt-2 block font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
				{formatDate(article.publishedAt)} · {readingMinutes(article)} min
			</span>
		</span>
	)
}

function IndexItem({ article, index }: { article: ArticleDocument; index: number }) {
	const cover = resolveCover(article)
	const accent = useArticleAccent(cover)
	return (
		<li
			style={accentStyle(accent)}
			className="relative border-b border-(--cards-border) py-3 first:pt-0 last:border-b-0"
		>
			<Link href={articleHref(article)} className="group grid grid-cols-[20px_minmax(0,1fr)] items-baseline gap-3">
				<span className="font-jetbrains text-[10px] text-(--accent) tabular-nums">
					{String(index + 1).padStart(2, '0')}
				</span>
				<span className="grid gap-1">
					<span className="text-sm leading-snug font-medium text-(--text-primary) transition-colors group-hover:text-(--accent)">
						{article.title}
					</span>
					<span className="font-jetbrains text-[10px] text-(--text-tertiary) tabular-nums">
						{formatDate(article.publishedAt)} · {readingMinutes(article)} min
					</span>
				</span>
				<ArticleHoverPreview
					article={article}
					className="top-1/2 right-full mr-5 -translate-x-2 -translate-y-1/2 group-hover:translate-x-0"
				/>
			</Link>
		</li>
	)
}

function MagazineIndex({ articles }: { articles: ArticleDocument[] }) {
	if (!articles.length) return null
	const visible = articles.slice(0, 8)
	return (
		<aside className="border-l border-(--cards-border) pl-5">
			<SectionHeader label="Index" right={String(articles.length)} />
			<ol className="mt-4 grid">
				{visible.map((article, index) => (
					<IndexItem key={article.id} article={article} index={index} />
				))}
			</ol>
		</aside>
	)
}

function ArchiveRow({ article }: { article: ArticleDocument }) {
	const cover = resolveCover(article)
	const accent = useArticleAccent(cover)
	return (
		<li style={accentStyle(accent)} className="border-b border-(--cards-border) last:border-b-0">
			<Link
				href={articleHref(article)}
				className="group grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[92px_180px_minmax(0,1fr)] sm:gap-5"
			>
				<span className="pt-1 font-jetbrains text-[11px] text-(--text-tertiary) tabular-nums">
					{formatDate(article.publishedAt)}
				</span>
				{cover ? (
					<img
						src={cover}
						alt=""
						loading="lazy"
						decoding="async"
						className="hidden aspect-[4/3] object-cover sm:block"
					/>
				) : (
					<span className="hidden aspect-[4/3] bg-(--cards-bg) sm:block" aria-hidden />
				)}
				<span className="grid content-start gap-2">
					<h3 className="text-xl leading-tight font-semibold tracking-tight text-(--text-primary) transition-colors group-hover:text-(--accent)">
						{article.title}
					</h3>
					{article.excerpt || article.subtitle ? (
						<span className="line-clamp-2 text-sm leading-relaxed text-(--text-secondary)">
							{article.excerpt || article.subtitle}
						</span>
					) : null}
					<span className="flex flex-wrap items-center gap-2 text-xs text-(--text-tertiary)">
						<AccentDot />
						{article.authorProfile?.displayName ? (
							<>
								<span className="font-medium text-(--text-secondary)">{article.authorProfile.displayName}</span>
								<span aria-hidden>·</span>
							</>
						) : null}
						<span>{readingMinutes(article)} min read</span>
					</span>
				</span>
			</Link>
		</li>
	)
}

function ArchiveSection({ articles, totalItems }: { articles: ArticleDocument[]; totalItems: number }) {
	const ARCHIVE_INITIAL = 14
	const [expanded, setExpanded] = useState(false)
	const visible = expanded ? articles : articles.slice(0, ARCHIVE_INITIAL)
	const hasMore = articles.length > ARCHIVE_INITIAL
	return (
		<section className="grid gap-4">
			<SectionHeader label="Archive" right={`Showing ${visible.length} of ${totalItems}`} />
			{visible.length ? (
				<ul className="grid border-t border-(--cards-border)">
					{visible.map((article) => (
						<ArchiveRow key={article.id} article={article} />
					))}
				</ul>
			) : (
				<EmptyState />
			)}
			{hasMore ? (
				<div className="flex justify-center pt-2">
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						className="inline-flex min-h-9 items-center border border-(--cards-border) px-4 font-jetbrains text-[11px] tracking-[0.18em] text-(--text-secondary) uppercase transition-colors hover:border-(--link-text) hover:text-(--text-primary)"
					>
						{expanded ? 'Show less' : `Show all ${articles.length} →`}
					</button>
				</div>
			) : null}
		</section>
	)
}

function MagazineFront({
	data,
	query,
	tag,
	spotlight,
	sections
}: {
	data: LandingData
	query: string
	tag: string
	spotlight: ArticleDocument[]
	sections: { section: string; items: ArticleDocument[] }[]
}) {
	const tagStats = getTagStats(data.articles, 10)
	if (query || tag) {
		return <FilteredResults query={query} tag={tag} articles={data.latest} totalItems={data.totalItems} />
	}
	const sideStories = data.picks.slice(0, 3)
	const featureRow = data.picks.slice(3, 6)
	const indexArticles = uniqueArticles([...data.picks, ...data.latest])
	return (
		<div className="mx-auto grid w-full max-w-7xl gap-8 px-1 pb-16">
			<header className="grid">
				<div className="relative grid gap-4 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<h1 className="text-5xl leading-[0.95] tracking-tight text-(--text-primary) md:text-7xl">
						<span className="font-light">DefiLlama</span>{' '}
						<span className="font-semibold text-(--link-text)">Research</span>
					</h1>
					<div className="flex flex-wrap items-center gap-2 lg:justify-end">
						<AdminLink />
						<MineLink />
						<WriteLink />
					</div>
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-(--link-text)/70 via-(--cards-border) to-transparent"
					/>
				</div>
				<p className="max-w-3xl py-5 text-xl leading-snug text-(--text-secondary) md:text-2xl">
					<span className="font-semibold text-(--text-primary)">Crypto market insights and digital asset research</span>
					{' to drive brand impact — powered by '}
					<span className="font-semibold text-(--link-text)">DefiLlama data</span>.
				</p>
				<div className="grid gap-4 border-t border-(--cards-border) pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.52fr)] lg:items-center">
					<TopicLinks tagStats={tagStats} limit={7} />
					<SearchBar query={query} tag={tag} routePath="/research" />
				</div>
			</header>
			{data.hero ? (
				<>
					<section className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.55fr)_260px]">
						<MagazineLead article={data.hero} />
						<div className="grid content-start gap-6">
							{sideStories.map((article, index) => (
								<MagazineSideStory key={article.id} article={article} label={index === 0 ? 'Feature' : 'Analysis'} />
							))}
						</div>
						<MagazineIndex articles={indexArticles} />
					</section>
					<SpotlightStrip items={spotlight} />
					{featureRow.length ? (
						<section className="grid gap-4">
							<SectionHeader label="Features" />
							<div className="grid gap-6 border-t border-b border-(--cards-border) py-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-(--cards-border)">
								{featureRow.map((article) => (
									<SignalCard key={article.id} article={article} />
								))}
							</div>
						</section>
					) : null}
					<SectionWidgets sections={sections} />
					<ArchiveSection articles={data.latest} totalItems={data.totalItems} />
				</>
			) : (
				<EmptyState />
			)}
		</div>
	)
}

function ArticlesContent() {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()
	const query = getQueryParam(router.query.q).trim()
	const tag = getQueryParam(router.query.tag).trim()
	const isFiltered = !!(query || tag)

	const {
		data: response,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'articles', { query, tag, isFiltered }],
		queryFn: async () => {
			const [featured, newest] = await Promise.all([
				isFiltered ? Promise.resolve(EMPTY_LIST) : listArticles({ sort: 'featured', limit: 8 }, authorizedFetch),
				listArticles({ sort: 'newest', limit: 36, query, tags: tag ? [tag] : undefined }, authorizedFetch)
			])
			return { featured, newest }
		},
		retry: false
	})

	const { data: spotlight } = useQuery<ArticleSpotlightResponse>({
		queryKey: ['research', 'spotlight'],
		queryFn: () => listSpotlightArticles(6, authorizedFetch),
		enabled: !isFiltered,
		retry: false
	})

	const { data: sections } = useQuery<ArticleSectionListResponse>({
		queryKey: ['research', 'sections'],
		queryFn: () => listArticleSections(6, authorizedFetch),
		enabled: !isFiltered,
		retry: false
	})

	const featured = response?.featured ?? EMPTY_LIST
	const newest = response?.newest ?? EMPTY_LIST

	const data = useMemo<LandingData>(() => {
		const articles = uniqueArticles([...featured.items, ...newest.items])
		const hero = featured.items[0] ?? newest.items[0] ?? null
		const heroId = hero?.id
		const picks = uniqueArticles([...featured.items.slice(1), ...newest.items]).filter(
			(article) => article.id !== heroId
		)
		const latest = newest.items.filter((article) => article.id !== heroId)
		return {
			articles,
			hero,
			picks,
			latest,
			totalItems: newest.totalItems
		}
	}, [featured, newest])

	if (isLoading) return isFiltered ? <ResearchLoader /> : <LoadingPlaceholder />

	if (error) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load articles'
		return (
			<div className="mx-auto grid w-full max-w-3xl gap-3 border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load research</h1>
				<p className="text-sm text-red-500">{message}</p>
			</div>
		)
	}

	return (
		<>
			<ArticleBannerStrip scope="landing" />
			<MagazineFront
				data={data}
				query={query}
				tag={tag}
				spotlight={spotlight?.items ?? []}
				sections={sections?.sections ?? []}
			/>
		</>
	)
}

function SpotlightStrip({ items }: { items: ArticleDocument[] }) {
	if (!items.length) return null
	return (
		<section className="grid gap-4">
			<div className="flex items-end justify-between gap-3 border-t border-(--link-text)/40 pt-3">
				<h2 className="flex items-center gap-2.5 font-jetbrains text-[11px] font-semibold tracking-[0.24em] text-(--link-text) uppercase">
					<span aria-hidden className="inline-block h-1.5 w-1.5 rotate-45 bg-(--link-text)" />
					Spotlight
				</h2>
				<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
					Editor’s picks · {items.length}
				</span>
			</div>
			<div className="grid gap-6 border-b border-(--cards-border) pb-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-(--cards-border)">
				{items.slice(0, 3).map((article) => (
					<SignalCard key={article.id} article={article} />
				))}
			</div>
		</section>
	)
}

function SectionWidgets({ sections }: { sections: { section: string; items: ArticleDocument[] }[] }) {
	if (!sections.length) return null
	return (
		<div className="grid gap-12">
			{sections.map((bucket, index) => {
				const section = bucket.section as ArticleSection
				const label = ARTICLE_SECTION_LABELS[section] ?? bucket.section
				if (!bucket.items?.length) return null
				const number = String(index + 1).padStart(2, '0')
				return (
					<section key={bucket.section} className="grid gap-4">
						<div className="flex items-end justify-between gap-3 border-t border-(--cards-border) pt-3">
							<h2 className="flex items-baseline gap-3 font-jetbrains text-[11px] font-semibold tracking-[0.22em] text-(--text-primary) uppercase">
								<span className="text-(--text-tertiary) tabular-nums">{number}</span>
								<span aria-hidden className="h-px w-6 self-center bg-(--text-tertiary)/60" />
								{label}
							</h2>
							<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
								{bucket.items.length} {bucket.items.length === 1 ? 'story' : 'stories'}
							</span>
						</div>
						<div className="grid gap-6 md:grid-cols-3">
							{bucket.items.slice(0, 6).map((article) => (
								<SignalCard key={article.id} article={article} />
							))}
						</div>
					</section>
				)
			})}
		</div>
	)
}

export default function ArticlesPage() {
	return (
		<Layout
			title="DefiLlama Research - DefiLlama"
			description="Read DefiLlama research with live protocol, chain, and market data."
			canonicalUrl="/research"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate loadingFallback={<LoadingPlaceholder />}>
					<ArticlesContent />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
