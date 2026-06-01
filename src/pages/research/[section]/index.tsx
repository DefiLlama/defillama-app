import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Link from 'next/link'
import { ArticleApiError, getSectionBanner, listArticles } from '~/containers/Articles/api'
import type { ArticleListResponse } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { GenericCard } from '~/containers/Articles/landing/GenericCard'
import { articleHref, formatDate, readingMinutes } from '~/containers/Articles/landing/utils'
import { ArticleBannerStrip } from '~/containers/Articles/renderer/ArticleBannerStrip'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument, ArticleSection, BannerLookupResult } from '~/containers/Articles/types'
import {
	ARTICLE_SECTION_FROM_SLUG,
	ARTICLE_SECTION_LABELS,
	ARTICLE_SECTION_SLUGS
} from '~/containers/Articles/types'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const SECTION_LANDING_CACHE_CONTROL = 'public, s-maxage=60'

type SectionRouteParams = {
	section: string
}

type SectionLandingPageProps = {
	section: ArticleSection
	initialArticles: ArticleListResponse
	sectionBanner: BannerLookupResult | null
}

async function loadSectionLandingData(section: ArticleSection): Promise<SectionLandingPageProps> {
	const [articlesResult, bannerResult] = await Promise.allSettled([
		listArticles({ section, sort: 'newest', limit: 60 }),
		getSectionBanner(section)
	])

	if (articlesResult.status === 'rejected') {
		throw articlesResult.reason
	}

	return {
		section,
		initialArticles: articlesResult.value,
		sectionBanner: bannerResult.status === 'fulfilled' ? bannerResult.value : null
	}
}

const getServerSidePropsHandler: GetServerSideProps<SectionLandingPageProps, SectionRouteParams> = async ({
	params,
	res
}) => {
	res.setHeader('Cache-Control', SECTION_LANDING_CACHE_CONTROL)

	const sectionSlug = params?.section
	if (!sectionSlug) {
		return { notFound: true }
	}

	const section = ARTICLE_SECTION_FROM_SLUG[sectionSlug]
	if (!section) {
		return { notFound: true }
	}

	return { props: await loadSectionLandingData(section) }
}

export const getServerSideProps = withServerSidePropsTelemetry('/research/[section]', getServerSidePropsHandler)

function intervieweeLabel(article: ArticleDocument): string | null {
	const list = (article.interviewees ?? []).filter((p) => p?.name?.trim()).map((p) => p.name)
	if (list.length === 0) return null
	if (list.length === 1) return list[0]
	if (list.length === 2) return `${list[0]} & ${list[1]}`
	return `${list[0]}, ${list[1]} +${list.length - 2}`
}

function InterviewCard({ article }: { article: ArticleDocument }) {
	const cover = article.coverImage?.url || null
	const interviewee = intervieweeLabel(article)
	const firstInterviewee = (article.interviewees ?? []).find((p) => p?.name?.trim())
	return (
		<Link
			href={articleHref(article)}
			className="group grid content-start gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)/40 p-4 transition-colors hover:border-(--link-text)/40"
		>
			<div className="flex items-center justify-between gap-3 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
				<span>Interview</span>
				<span className="tabular-nums">{readingMinutes(article)} min</span>
			</div>
			{cover ? (
				<div className="aspect-[16/9] w-full overflow-hidden">
					<img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
				</div>
			) : null}
			{interviewee ? (
				<div className="flex items-center gap-2">
					{firstInterviewee?.avatarUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={firstInterviewee.avatarUrl}
							alt=""
							className="h-9 w-9 shrink-0 rounded-full border border-(--cards-border) object-cover"
						/>
					) : null}
					<div className="grid">
						<span className="text-sm font-semibold text-(--text-primary)">{interviewee}</span>
						{firstInterviewee?.role ? (
							<span className="text-[11px] text-(--text-tertiary)">{firstInterviewee.role}</span>
						) : null}
					</div>
				</div>
			) : null}
			<h3 className="text-base leading-snug font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text)">
				{article.title}
			</h3>
			{article.excerpt || article.subtitle ? (
				<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
					{article.excerpt || article.subtitle}
				</p>
			) : null}
			<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
				{formatDate(article.displayDate ?? article.publishedAt)}
			</span>
		</Link>
	)
}

function SectionLandingContent({
	section,
	initialData
}: {
	section: ArticleSection
	initialData: Pick<SectionLandingPageProps, 'initialArticles' | 'sectionBanner'>
}) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['research', 'section-index', section],
		queryFn: () => listArticles({ section, sort: 'newest', limit: 60 }),
		initialData: initialData.initialArticles,
		retry: false,
		staleTime: 60_000
	})

	if (isLoading) return <ResearchLoader />

	if (error) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load research'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load this section</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
			</div>
		)
	}

	const items = data?.items ?? []
	const total = data?.totalItems ?? items.length
	const sectionLabel = ARTICLE_SECTION_LABELS[section]
	const isInterview = section === 'interview'

	return (
		<>
			<ArticleBannerStrip scope="section" section={section} initialData={{ section: initialData.sectionBanner }} />
			<div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 pt-8 pb-24 sm:px-6">
				<header className="grid gap-3 border-b border-(--cards-border) pb-6">
					<div className="flex items-center justify-between gap-3">
						<Link
							href="/research"
							className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase hover:text-(--link-text)"
						>
							← All research
						</Link>
						<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
							{total} {total === 1 ? 'story' : 'stories'}
						</span>
					</div>
					<h1 className="text-3xl leading-tight font-bold tracking-tight text-(--text-primary) sm:text-4xl">
						{sectionLabel}
					</h1>
					{isInterview ? (
						<p className="max-w-2xl text-sm text-(--text-secondary)">
							Conversations with the people building, funding, and using DeFi.
						</p>
					) : null}
				</header>

				{items.length === 0 ? (
					<div className="mx-auto grid max-w-xl gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg)/50 p-8 text-center">
						<p className="text-sm text-(--text-secondary)">Nothing here yet.</p>
						<Link href="/research" className="text-sm text-(--link-text) hover:underline">
							Browse all research →
						</Link>
					</div>
				) : (
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{items.map((article) =>
							isInterview ? (
								<InterviewCard key={article.id} article={article} />
							) : (
								<GenericCard key={article.id} article={article} />
							)
						)}
					</div>
				)}
			</div>
		</>
	)
}

export default function SectionLandingPage({
	section,
	initialArticles,
	sectionBanner
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const canonical = `/research/${ARTICLE_SECTION_SLUGS[section]}`

	return (
		<Layout
			title={`${ARTICLE_SECTION_LABELS[section]} — DefiLlama Research`}
			description={
				section === 'interview'
					? 'Interviews with the people building, funding, and using DeFi — by DefiLlama Research.'
					: 'DefiLlama research, grouped by section.'
			}
			canonicalUrl={canonical}
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<SectionLandingContent section={section} initialData={{ initialArticles, sectionBanner }} />
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
