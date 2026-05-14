import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import {
	ArticleApiError,
	listArticles,
	listArticleSections,
	type ArticleSectionListResponse
} from '~/containers/Articles/api'
import {
	type ResearchSearchQuery,
	useResearchSearchParams
} from '~/containers/Articles/landing/useResearchSearchParams'
import { articleHref, getArticleBylineAuthorEntries } from '~/containers/Articles/landing/utils'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument, ArticleSection } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'

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

function ByLine({ article, className = '' }: { article: ArticleDocument; className?: string }) {
	const authorEntries =
		getArticleBylineAuthorEntries(article) ??
		(article.authorProfile
			? [{ name: article.authorProfile.displayName, href: `/research/authors/${article.authorProfile.slug}` }]
			: null)

	return (
		<div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-tertiary) ${className}`}>
			{authorEntries?.length ? (
				<span className="flex flex-wrap items-center gap-1 font-medium text-(--text-secondary)">
					{authorEntries.map((entry, index) => (
						<span key={`${entry.name}-${index}`} className="inline-flex items-center gap-1">
							{entry.href ? (
								<Link href={entry.href} className="text-(--text-secondary) transition-colors hover:text-(--link-text)">
									{entry.name}
								</Link>
							) : (
								<span>{entry.name}</span>
							)}
							{index < authorEntries.length - 2 ? <span>,</span> : null}
							{index === authorEntries.length - 2 ? <span className="font-normal">and</span> : null}
						</span>
					))}
				</span>
			) : null}
			{authorEntries?.length ? <span aria-hidden>·</span> : null}
			<span className="font-jetbrains tabular-nums">{timeAgo(article.publishedAt)}</span>
			<span aria-hidden>·</span>
			<span>{readingMinutes(article)} min read</span>
		</div>
	)
}

function SearchBar({ searchQuery, routePath }: { searchQuery: ResearchSearchQuery; routePath: string }) {
	const router = useRouter()
	const queryInputRef = useRef<HTMLInputElement>(null)
	const { query, tag, section } = searchQuery

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
		if (section) params.set('section', section)
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

function EmptyState() {
	return (
		<div className="border border-dashed border-(--cards-border) p-8 text-center">
			<p className="text-sm text-(--text-secondary)">No published research found.</p>
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
						<ByLine article={article} />
					</div>
				</div>
			</Link>
		</li>
	)
}

function SectionsLinks({ searchQuery, pathname }: { searchQuery: ResearchSearchQuery; pathname: string }) {
	const { query: q, tag, section: activeSection } = searchQuery
	const { authorizedFetch } = useAuthContext()
	const { data } = useQuery<ArticleSectionListResponse>({
		queryKey: ['research', 'sections'],
		queryFn: () => listArticleSections(6, authorizedFetch),
		retry: false
	})

	const hrefForSection = (sectionSlug: string) => {
		const params = new URLSearchParams()
		if (q) params.set('q', q)
		if (tag) params.set('tag', tag)
		if (sectionSlug !== activeSection) params.set('section', sectionSlug)
		const search = params.toString()
		return search ? `${pathname}?${search}` : pathname
	}

	return (
		<div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 font-jetbrains text-[11px] tracking-[0.18em] uppercase">
			<span className="text-(--text-tertiary)">Sections</span>
			{data?.sections?.map((section) => {
				const isActive = section.section === activeSection
				return (
					<Link
						key={section.section}
						href={hrefForSection(section.section)}
						className={`group inline-flex items-baseline gap-1.5 transition-colors hover:text-(--link-text) ${isActive ? 'text-(--link-text)' : 'text-(--text-secondary)'}`}
					>
						<span>{humanizeTag(section.section)}</span>
					</Link>
				)
			})}
		</div>
	)
}

export default function ResearchSearch() {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()
	const { searchQuery, clearSearchParams } = useResearchSearchParams()
	const { query, tag, section } = searchQuery

	const {
		data: response,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'articles', searchQuery],
		queryFn: async () => {
			return listArticles(
				{ sort: 'newest', limit: 36, query, tags: tag ? [tag] : undefined, section: section as ArticleSection },
				authorizedFetch
			)
		},
		retry: false,
		enabled: router.isReady
	})

	const resultsLoading = !router.isReady || isLoading

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
		<div className="mx-auto grid w-full max-w-5xl gap-6 px-1 py-4 pb-16">
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
							{resultsLoading ? (
								<span className="text-(--text-tertiary)">Loading results…</span>
							) : (
								<>
									{response.totalItems} {response.totalItems === 1 ? 'Result' : 'Results'}
								</>
							)}
						</p>
					</div>
					<button
						type="button"
						onClick={clearSearchParams}
						className="shrink-0 font-jetbrains text-[11px] tracking-[0.18em] text-(--text-secondary) uppercase transition-colors hover:text-(--link-text)"
					>
						Close
					</button>
				</div>
				<SectionsLinks searchQuery={searchQuery} pathname={router.pathname} />
				<SearchBar searchQuery={searchQuery} routePath={router.pathname} />
			</header>
			{resultsLoading ? (
				<div className="grid min-h-[240px] place-items-center border-t border-(--cards-border) py-12">
					<ResearchLoader />
				</div>
			) : response.items.length ? (
				<ul className="grid border-t border-(--cards-border)">
					{response.items.map((article) => (
						<ResultRow key={article.id} article={article} />
					))}
				</ul>
			) : (
				<EmptyState />
			)}
		</div>
	)
}
