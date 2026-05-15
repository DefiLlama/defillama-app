import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
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
import { articleHref, formatDate, getArticleBylineAuthorEntries } from '~/containers/Articles/landing/utils'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument, ArticleSection } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'

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

function buildSearchUrl(pathname: string, params: { q?: string; tag?: string; section?: string; page?: number }) {
	const search = new URLSearchParams()
	if (params.q) search.set('q', params.q)
	if (params.tag) search.set('tag', params.tag)
	if (params.section) search.set('section', params.section)
	if (params.page && params.page > 1) search.set('page', String(params.page))
	const qs = search.toString()
	return qs ? `${pathname}?${qs}` : pathname
}

function ResultBadge({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded-[4px] border border-white px-[8px] py-[3px] text-[10px] font-semibold tracking-[0.04em] text-white uppercase backdrop-blur-[2px]">
			{children}
		</span>
	)
}

function ByLine({ article }: { article: ArticleDocument }) {
	const authorEntries =
		getArticleBylineAuthorEntries(article) ??
		(article.authorProfile
			? [{ name: article.authorProfile.displayName, href: `/research/authors/${article.authorProfile.slug}` }]
			: null)

	return (
		<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#0c2956]/60 dark:text-white/55">
			{authorEntries?.length ? (
				<span className="flex flex-wrap items-center gap-1 font-medium text-[#0c2956]/80 dark:text-white/75">
					{authorEntries.map((entry, index) => (
						<span key={`${entry.name}-${index}`} className="inline-flex items-center gap-1">
							{entry.href ? (
								<Link href={entry.href} className="transition-colors hover:text-[#237BFF]">
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
			<span>{formatDate(article.publishedAt)}</span>
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
		const href = buildSearchUrl(routePath, { q: nextQuery, tag, section })
		router.push(href, undefined, { shallow: false, scroll: false })
	}

	return (
		<form
			action={routePath}
			onSubmit={handleSubmit}
			className="group relative flex items-center border-b border-[#0c2956]/20 transition-colors focus-within:border-[#237BFF] dark:border-white/20 dark:focus-within:border-white"
		>
			<Icon
				name="search"
				height={14}
				width={14}
				className="pointer-events-none mr-3 text-[#0c2956]/55 dark:text-white/55"
			/>
			<label className="flex-1">
				<span className="sr-only">Search research</span>
				<input
					ref={queryInputRef}
					name="q"
					defaultValue={query}
					placeholder="Search reports, interviews, authors…"
					className="w-full bg-transparent py-2.5 text-[14px] text-[#0c2956] placeholder:text-[#0c2956]/40 focus:outline-none dark:text-white dark:placeholder:text-white/40"
				/>
			</label>
			<button
				type="submit"
				className="ml-2 inline-flex items-center gap-1 px-1 py-1 font-jetbrains text-[11px] tracking-[0.18em] text-[#237BFF] uppercase transition-colors hover:text-[#0c2956] dark:hover:text-white"
			>
				<span>Search</span>
				<span aria-hidden>→</span>
			</button>
		</form>
	)
}

function SectionsPills({ searchQuery, pathname }: { searchQuery: ResearchSearchQuery; pathname: string }) {
	const { query: q, tag, section: activeSection } = searchQuery
	const { authorizedFetch } = useAuthContext()
	const { data } = useQuery<ArticleSectionListResponse>({
		queryKey: ['research', 'sections'],
		queryFn: () => listArticleSections(6, authorizedFetch),
		retry: false
	})

	const hrefForSection = (sectionSlug?: string) =>
		buildSearchUrl(pathname, {
			q,
			tag,
			section: sectionSlug && sectionSlug !== activeSection ? sectionSlug : undefined
		})

	const linkBase =
		'inline-flex items-center font-jetbrains text-[11px] tracking-[0.18em] uppercase transition-colors'
	const inactive = 'text-[#0c2956]/55 hover:text-[#237BFF] dark:text-white/55 dark:hover:text-white'
	const active = 'text-[#237BFF] dark:text-white'

	return (
		<div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
			<span className="font-jetbrains text-[10px] tracking-[0.24em] text-[#0c2956]/40 uppercase dark:text-white/40">
				Sections
			</span>
			<Link
				href={hrefForSection()}
				className={`${linkBase} ${!activeSection ? `${active} relative after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:bg-[#237BFF] dark:after:bg-white` : inactive}`}
			>
				All
			</Link>
			{data?.sections?.map((s) => {
				const isActive = s.section === activeSection
				return (
					<Link
						key={s.section}
						href={hrefForSection(s.section)}
						className={`${linkBase} ${isActive ? `${active} relative after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:bg-[#237BFF] dark:after:bg-white` : inactive}`}
					>
						{humanizeTag(s.section)}
					</Link>
				)
			})}
		</div>
	)
}

function ResultCard({ article }: { article: ArticleDocument }) {
	const cover = resolveCover(article)
	const sectionLabel = article.section ? humanizeTag(article.section) : null
	return (
		<li>
			<Link
				href={articleHref(article)}
				className="group relative top-0 grid grid-cols-1 gap-[14px] py-[22px] transition-all duration-200 ease-out hover:top-[-2px] sm:grid-cols-[clamp(180px,28vw,260px)_minmax(0,1fr)] sm:gap-[24px]"
			>
				<div className="relative aspect-[16/10] w-full overflow-hidden rounded-[7.2px] bg-[#0c2956]/5 dark:bg-white/5">
					{cover ? (
						<img
							src={cover}
							alt=""
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
						/>
					) : (
						<div className="grid h-full w-full place-items-center text-[#0c2956]/20 dark:text-white/20">
							<svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
								<path d="M4 10h24v18H4z" />
								<path d="M9 6h14v4" />
							</svg>
						</div>
					)}
					{sectionLabel ? <span className="absolute top-[10px] left-[10px] z-[1]"><ResultBadge>{sectionLabel}</ResultBadge></span> : null}
				</div>
				<div className="grid content-start gap-[10px]">
					<h3 className="text-[19px] leading-[130%] font-semibold tracking-tight text-[#0c2956] transition-colors group-hover:text-[#237BFF] sm:text-[22px] dark:text-white dark:group-hover:text-[#9ec5ff]">
						{article.title}
					</h3>
					{article.excerpt || article.subtitle ? (
						<p className="line-clamp-2 text-[14px] leading-[150%] text-[#0c2956]/70 dark:text-white/70">
							{article.excerpt || article.subtitle}
						</p>
					) : null}
					<ByLine article={article} />
				</div>
			</Link>
		</li>
	)
}

function Pagination({
	searchQuery,
	pathname,
	page,
	totalPages,
	rangeStart,
	rangeEnd,
	totalItems
}: {
	searchQuery: ResearchSearchQuery
	pathname: string
	page: number
	totalPages: number
	rangeStart: number
	rangeEnd: number
	totalItems: number
}) {
	const router = useRouter()
	const go = (next: number) => {
		const href = buildSearchUrl(pathname, {
			q: searchQuery.query,
			tag: searchQuery.tag,
			section: searchQuery.section,
			page: next
		})
		router.push(href, undefined, { shallow: false, scroll: false })
	}
	const prevPage = Math.max(1, page - 1)
	const nextPage = Math.min(totalPages, page + 1)

	const btnBase =
		'inline-flex items-center gap-2 rounded-[4px] px-[14px] py-[7px] text-[12px] font-semibold tracking-[0.08em] uppercase transition-colors'
	const enabledStyle =
		'bg-[#D7E7FE] text-[#3A8BFF] hover:bg-[#bcd6fb] dark:border dark:border-white/40 dark:bg-transparent dark:text-white dark:hover:bg-white/10'
	const disabledStyle =
		'cursor-not-allowed bg-[#0c2956]/5 text-[#0c2956]/30 dark:border dark:border-white/15 dark:bg-transparent dark:text-white/30'

	return (
		<nav
			aria-label="Search results pagination"
			className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0c2956]/10 pt-5 dark:border-white/10"
		>
			<span className="font-jetbrains text-[11px] tracking-[0.18em] text-[#0c2956]/55 uppercase tabular-nums dark:text-white/55">
				{rangeStart}–{rangeEnd} of {totalItems.toLocaleString()}
			</span>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => go(prevPage)}
					disabled={page <= 1}
					className={`${btnBase} ${page <= 1 ? disabledStyle : enabledStyle}`}
				>
					<span aria-hidden>←</span>
					<span>Prev</span>
				</button>
				<span className="px-2 font-jetbrains text-[12px] tracking-[0.12em] text-[#0c2956]/80 tabular-nums dark:text-white/80">
					{page} / {totalPages}
				</span>
				<button
					type="button"
					onClick={() => go(nextPage)}
					disabled={page >= totalPages}
					className={`${btnBase} ${page >= totalPages ? disabledStyle : enabledStyle}`}
				>
					<span>Next</span>
					<span aria-hidden>→</span>
				</button>
			</div>
		</nav>
	)
}

function EmptyState({ query, tag, section }: { query: string; tag: string; section: string }) {
	const hasFilters = Boolean(query || tag || section)
	return (
		<div className="grid place-items-center px-4 py-20 text-center">
			<div className="grid max-w-md gap-3">
				<svg viewBox="0 0 64 64" className="mx-auto h-12 w-12 text-[#0c2956]/25 dark:text-white/25" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<circle cx="28" cy="28" r="18" />
					<line x1="42" y1="42" x2="56" y2="56" strokeLinecap="round" />
					<line x1="18" y1="28" x2="38" y2="28" strokeLinecap="round" />
				</svg>
				<h2 className="text-[22px] leading-[130%] font-semibold tracking-tight text-[#0c2956] dark:text-white">
					{hasFilters ? 'Nothing matches that.' : 'No research yet.'}
				</h2>
				<p className="text-[14px] leading-[150%] text-[#0c2956]/65 dark:text-white/65">
					{hasFilters
						? 'Try a different keyword, drop a filter, or browse the sections below.'
						: 'Once research is published, you can search across reports, interviews, and more from here.'}
				</p>
			</div>
		</div>
	)
}

function ResultsTitle({ query, tag }: { query: string; tag: string }) {
	const cls =
		'text-[clamp(22px,2.6vw,30px)] leading-[120%] font-medium tracking-tight text-[#0c2956] dark:text-white'
	if (query) {
		return (
			<h1 className={cls}>
				<span className="text-[#0c2956]/45 dark:text-white/45">Results for </span>
				<span>"{query}"</span>
			</h1>
		)
	}
	if (tag) {
		return (
			<h1 className={cls}>
				<span className="text-[#0c2956]/45 dark:text-white/45">Tagged </span>
				<span>#{tag}</span>
			</h1>
		)
	}
	return <h1 className={cls}>All Research</h1>
}

export default function ResearchSearch() {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()
	const { searchQuery, clearSearchParams } = useResearchSearchParams()
	const { query, tag, section, page } = searchQuery
	const PAGE_SIZE = 24

	const {
		data: response,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'articles', searchQuery],
		queryFn: async () => {
			return listArticles(
				{
					sort: 'newest',
					limit: PAGE_SIZE,
					page,
					query,
					tags: tag ? [tag] : undefined,
					section: section as ArticleSection
				},
				authorizedFetch
			)
		},
		retry: false,
		enabled: router.isReady
	})

	const resultsLoading = !router.isReady || isLoading
	const totalItems = response?.totalItems ?? 0
	const totalPages = response ? Math.max(1, response.totalPages) : 1
	const safePage = Math.min(Math.max(1, page), totalPages)
	const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
	const rangeEnd = Math.min(safePage * PAGE_SIZE, totalItems)

	if (error) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load articles'
		return (
			<div className="mx-auto grid w-full max-w-3xl gap-3 border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-[#0c2956] dark:text-white">Couldn't load research</h1>
				<p className="text-sm text-red-500">{message}</p>
			</div>
		)
	}

	return (
		<div className="mx-auto grid w-full max-w-6xl gap-7 px-3 pt-4 pb-20 sm:px-6 lg:px-8">
			<header className="grid gap-4 pr-16 lg:pr-0">
				<div className="flex items-baseline justify-between gap-6">
					<span className="font-jetbrains text-[10px] tracking-[0.22em] text-[#237BFF] uppercase">
						Research / Archive
					</span>
					<button
						type="button"
						onClick={clearSearchParams}
						className="shrink-0 font-jetbrains text-[10px] tracking-[0.22em] text-[#0c2956]/50 uppercase transition-colors hover:text-[#237BFF] dark:text-white/50 dark:hover:text-white"
						aria-label="Close search"
					>
						<span className="hidden sm:inline">← Back</span>
						<span className="sm:hidden" aria-hidden>×</span>
					</button>
				</div>

				<ResultsTitle query={query} tag={tag} />

				<div className="flex items-center gap-x-[12px] text-[#0c2956]/55 dark:text-white/55">
					<span className="font-jetbrains text-[10px] tracking-[0.18em] tabular-nums uppercase">
						{resultsLoading ? 'Loading…' : `${totalItems.toLocaleString()} ${totalItems === 1 ? 'result' : 'results'}`}
					</span>
					<div className="grow border-t border-[#0c2956]/15 dark:border-white/15" />
				</div>

				<SearchBar searchQuery={searchQuery} routePath={router.pathname} />
				<SectionsPills searchQuery={searchQuery} pathname={router.pathname} />
			</header>

			{resultsLoading ? (
				<div className="grid min-h-[280px] place-items-center py-12">
					<ResearchLoader />
				</div>
			) : response.items.length ? (
				<>
					<ul className="grid divide-y divide-[#0c2956]/10 dark:divide-white/10">
						{response.items.map((article) => (
							<ResultCard key={article.id} article={article} />
						))}
					</ul>
					{totalPages > 1 ? (
						<Pagination
							searchQuery={searchQuery}
							pathname={router.pathname}
							page={safePage}
							totalPages={totalPages}
							rangeStart={rangeStart}
							rangeEnd={rangeEnd}
							totalItems={totalItems}
						/>
					) : null}
				</>
			) : (
				<EmptyState query={query} tag={tag} section={section} />
			)}
		</div>
	)
}
