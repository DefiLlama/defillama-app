import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { ArticleApiError, getLandingBanner, listArticles, listArticlesByTag } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { EDITORIAL_TAGS } from '~/containers/Articles/editorialTags'
import { ResearchBanner } from '~/containers/Articles/landing/ResearchBanner'
import { ResearchCollections } from '~/containers/Articles/landing/ResearchCollections'
import { ResearchGridWithScrollbar } from '~/containers/Articles/landing/ResearchGridWithScrollbar'
import { ResearchHero } from '~/containers/Articles/landing/ResearchHero'
import { ResearchInterviews } from '~/containers/Articles/landing/ResearchInterviews'
import { ResearchLatest } from '~/containers/Articles/landing/ResearchLatest'
import { ResearchReportHighlightWithHeight } from '~/containers/Articles/landing/ResearchReportHighlight'
import ResearchSearch from '~/containers/Articles/landing/ResearchSearch'
import { ResearchSectionWithSharedHeightProvider } from '~/containers/Articles/landing/ResearchSectionWithSharedHeight'
import { ResearchSocialMediaMentions } from '~/containers/Articles/landing/ResearchSocialMediaMentions'
import { ResearchSpotlight } from '~/containers/Articles/landing/ResearchSpotlight'
import { ResearchSpotlightColumnWithHeight } from '~/containers/Articles/landing/ResearchSpotlightColumn'
import { ResearchTrustedByCarousel } from '~/containers/Articles/landing/ResearchTrustedByCarousel'
import { ResearchWidgetWithScrollbarWithHeight } from '~/containers/Articles/landing/ResearchWidgetWithScrollbar'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { useResearchSearchParams } from '~/containers/Articles/landing/useResearchSearchParams'
import {
	RESEARCH_LANDING_COLLECTIONS_FETCH_LIMIT,
	RESEARCH_LANDING_SECTION_LIMITS,
	takeUniqueArticles
} from '~/containers/Articles/landing/utils'
import { ArticleBannerStrip } from '~/containers/Articles/renderer/ArticleBannerStrip'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument, BannerLookupResult } from '~/containers/Articles/types'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const RESEARCH_LANDING_CACHE_CONTROL = 'public, s-maxage=60'

export type ResearchLandingArticles = {
	heroReports: ArticleDocument[]
	latest: ArticleDocument[]
	spotlight: ArticleDocument[]
	interviews: ArticleDocument[]
	highlight: ArticleDocument[]
	insights: ArticleDocument[]
	moreReports: ArticleDocument[]
	spotlightColumn: ArticleDocument[]
	collections: ArticleDocument[]
}

type ArticlesPageProps = {
	landingData: ResearchLandingArticles
	landingBanner: BannerLookupResult | null
}

async function getResearchLandingArticles(): Promise<ResearchLandingArticles> {
	const collectionsLimit = RESEARCH_LANDING_SECTION_LIMITS.collections
	const moreReportsLimit = RESEARCH_LANDING_SECTION_LIMITS.moreReports
	const spotlightColumnLimit = RESEARCH_LANDING_SECTION_LIMITS.spotlightColumn
	const reportHighlightLimit = RESEARCH_LANDING_SECTION_LIMITS.reportHighlight
	const reportsHeroLimit = RESEARCH_LANDING_SECTION_LIMITS.reportsHero
	const spotlightLimit = RESEARCH_LANDING_SECTION_LIMITS.spotlight

	const settled = await Promise.allSettled([
		listArticlesByTag(EDITORIAL_TAGS['reports-hero'].slug, reportsHeroLimit),
		listArticlesByTag(EDITORIAL_TAGS.latest.slug, RESEARCH_LANDING_SECTION_LIMITS.latest),
		listArticlesByTag(EDITORIAL_TAGS.spotlight.slug, spotlightLimit),
		listArticles({ section: 'interview', limit: RESEARCH_LANDING_SECTION_LIMITS.interviews }),
		listArticlesByTag(EDITORIAL_TAGS['report-highlight'].slug, reportHighlightLimit),
		listArticlesByTag(EDITORIAL_TAGS.insights.slug, RESEARCH_LANDING_SECTION_LIMITS.insights),
		listArticles({
			section: 'report',
			sort: 'newest',
			// Buffer: we dedupe by ID later, so we fetch enough candidates to avoid ending up with <limit items.
			limit: reportsHeroLimit + reportHighlightLimit + moreReportsLimit
		}),
		listArticles({
			section: 'spotlight',
			sort: 'newest',
			// Buffer: we dedupe by ID later, so we fetch enough candidates to avoid ending up with <limit items.
			limit: spotlightLimit + spotlightColumnLimit
		}),
		listArticles({
			sort: 'newest',
			limit: RESEARCH_LANDING_COLLECTIONS_FETCH_LIMIT
		})
	])

	const itemsOrEmpty = (index: number) => (settled[index]?.status === 'fulfilled' ? settled[index].value.items : [])

	if (settled.every((r) => r.status === 'rejected')) {
		const firstRejected = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected')
		throw firstRejected?.reason ?? new Error('Failed to load research')
	}

	const heroReports = itemsOrEmpty(0)
	const latest = itemsOrEmpty(1)
	const spotlight = itemsOrEmpty(2)
	const interviews = itemsOrEmpty(3)
	const highlight = itemsOrEmpty(4)
	const insights = itemsOrEmpty(5)
	const moreReportsCandidates = itemsOrEmpty(6)
	const spotlightColumnCandidates = itemsOrEmpty(7)

	const usedIds = new Set<string>(
		[...heroReports, ...latest, ...spotlight, ...interviews, ...highlight, ...insights].map((article) => article.id)
	)

	const moreReports = takeUniqueArticles(moreReportsCandidates, usedIds, moreReportsLimit)
	for (const article of moreReports) usedIds.add(article.id)

	const spotlightColumn = takeUniqueArticles(spotlightColumnCandidates, usedIds, spotlightColumnLimit)
	for (const article of spotlightColumn) usedIds.add(article.id)

	const collections = takeUniqueArticles(itemsOrEmpty(8), usedIds, collectionsLimit)

	return {
		heroReports,
		latest,
		spotlight,
		interviews,
		highlight,
		insights,
		moreReports,
		spotlightColumn,
		collections
	}
}

export async function loadResearchLandingData(): Promise<ArticlesPageProps> {
	const [articlesResult, bannerResult] = await Promise.allSettled([getResearchLandingArticles(), getLandingBanner()])

	if (articlesResult.status === 'rejected') {
		throw articlesResult.reason
	}

	return {
		landingData: articlesResult.value,
		landingBanner: bannerResult.status === 'fulfilled' ? bannerResult.value : null
	}
}

const getServerSidePropsHandler: GetServerSideProps<ArticlesPageProps> = async ({ res }) => {
	const { landingData, landingBanner } = await loadResearchLandingData()
	res.setHeader('Cache-Control', RESEARCH_LANDING_CACHE_CONTROL)
	return {
		props: {
			landingData,
			landingBanner
		}
	}
}

export const getServerSideProps = withServerSidePropsTelemetry('/research', getServerSidePropsHandler)

function ArticlesLandingInner({ initialData }: { initialData: ArticlesPageProps }) {
	const landingQuery = useQuery({
		queryKey: ['research-landing'],
		retry: false,
		queryFn: loadResearchLandingData,
		initialData,
		staleTime: 60_000
	})

	const landingData = landingQuery.data?.landingData

	const isLoading = landingQuery.isLoading
	const error = landingQuery.error

	if (isLoading) {
		return <ResearchLoader />
	}

	if (error) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load articles'
		return (
			<div className="mx-auto grid w-full max-w-3xl gap-3 border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn&apos;t load research</h1>
				<p className="text-sm text-red-500">{message}</p>
			</div>
		)
	}

	return (
		<div className="bg-top-center bg-[url(/assets/research/dotted-bg.webp)] bg-no-repeat pb-5 lg:bg-contain">
			<ResearchHero
				title="Bespoke Digital Asset Research and Market Intelligence"
				subtitle="Independent and trusted in-depth analysis of digital asset markets for institutional strategy and decision-making."
				reports={landingData?.heroReports ?? []}
			/>

			<div className="relative overflow-hidden">
				<div
					style={{
						background: 'radial-gradient(circle, rgb(35, 123, 255) 0%, transparent 70%)',
						width: '900px',
						height: '900px',
						position: 'absolute',
						right: '-690px',
						top: '1000px',
						zIndex: 0
					}}
				></div>

				<div
					style={{
						background: 'radial-gradient(circle, rgb(35, 123, 255) 0%, transparent 70%)',
						width: '900px',
						height: '900px',
						position: 'absolute',
						left: '-690px',
						top: '2300px',
						zIndex: 0
					}}
				></div>

				<div
					style={{
						background: 'radial-gradient(circle, rgb(35, 123, 255) 0%, transparent 70%)',
						width: '900px',
						height: '900px',
						position: 'absolute',
						right: '-590px',
						top: '2900px',
						zIndex: 0
					}}
				></div>

				<div className="relative z-1 mx-auto w-full max-w-7xl space-y-[30px] px-4 sm:px-6 lg:space-y-[70px] lg:px-8">
					<ResearchLatest articles={landingData?.latest ?? []} />

					<ResearchSpotlight title="In the spotlight" articles={landingData?.spotlight ?? []} />

					<ResearchInterviews title="Interviews" articles={landingData?.interviews ?? []} />

					<div id="reports">
						{(landingData?.highlight ?? []).length > 0 ? (
							<ResearchSectionWithSharedHeightProvider>
								<div className="grid grid-cols-1 gap-[36px] lg:grid-cols-[725fr_403fr]">
									<ResearchReportHighlightWithHeight highlight={(landingData?.highlight ?? [])[0]} />
									<div className="flex flex-col gap-y-[64px]">
										<ResearchWidgetWithScrollbarWithHeight
											id="insights"
											title="Insights"
											articles={landingData?.insights ?? []}
										/>
									</div>
								</div>
							</ResearchSectionWithSharedHeightProvider>
						) : null}
					</div>

					<ResearchBanner initialData={landingQuery.data?.landingBanner} />

					<div id="clients">
						<TitleLine title="Trusted by" />

						<div className="mt-[24px] space-y-[48px]">
							<ResearchTrustedByCarousel />

							<ResearchSocialMediaMentions />
						</div>
					</div>

					<ResearchSectionWithSharedHeightProvider>
						<div className="grid grid-cols-1 gap-[36px] lg:grid-cols-[665fr_428fr]">
							<div>
								<ResearchGridWithScrollbar
									id="more-reports"
									title="More reports"
									articles={landingData?.moreReports ?? []}
									pageWidget="DL Research More Reports widget"
								/>
							</div>
							<div className="flex flex-col gap-y-[64px]">
								<ResearchSpotlightColumnWithHeight
									title="Explore Spotlights"
									articles={landingData?.spotlightColumn ?? []}
								/>
							</div>
						</div>
					</ResearchSectionWithSharedHeightProvider>

					<ResearchCollections title="Collections" articles={landingData?.collections ?? []} />
				</div>
			</div>
		</div>
	)
}

export default function ArticlesPage({ landingData, landingBanner }: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const { showSearch } = useResearchSearchParams()

	return (
		<Layout
			title="Crypto Research Reports & Market Intelligence | DefiLlama Research"
			description="Data-driven crypto and digital asset research and market analysis. Read expert perspectives powered by DefiLlama metrics."
			canonicalUrl="/research"
			hideDesktopSearch
		>
			<style>{`main{padding:0}#__next{gap:0;}`}</style>
			<ArticleProxyAuthProvider>
				<div className="col-span-full min-h-screen w-full text-blue-950 dark:text-white">
					{showSearch ? (
						<ResearchSearch />
					) : (
						<>
							<ArticleBannerStrip scope="landing" initialData={{ landing: landingBanner }} />
							<ArticlesLandingInner initialData={{ landingData, landingBanner }} />
						</>
					)}
				</div>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
