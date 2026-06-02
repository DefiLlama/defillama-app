import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Head from 'next/head'
import { ArticleApiError, getLandingBanner, getResearchLanding } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
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

	const buckets = await getResearchLanding({
		hero: reportsHeroLimit,
		latest: RESEARCH_LANDING_SECTION_LIMITS.latest,
		spotlight: spotlightLimit,
		interviews: RESEARCH_LANDING_SECTION_LIMITS.interviews,
		highlight: reportHighlightLimit,
		insights: RESEARCH_LANDING_SECTION_LIMITS.insights,
		reportsCandidates: reportsHeroLimit + reportHighlightLimit + moreReportsLimit,
		spotlightCandidates: spotlightLimit + spotlightColumnLimit,
		collectionsCandidates: RESEARCH_LANDING_COLLECTIONS_FETCH_LIMIT
	})

	const { heroReports, latest, spotlight, interviews, highlight, insights } = buckets

	const usedIds = new Set<string>(
		[...heroReports, ...latest, ...spotlight, ...interviews, ...highlight, ...insights].map((article) => article.id)
	)

	const moreReports = takeUniqueArticles(buckets.moreReportsCandidates, usedIds, moreReportsLimit)
	for (const article of moreReports) usedIds.add(article.id)

	const spotlightColumn = takeUniqueArticles(buckets.spotlightColumnCandidates, usedIds, spotlightColumnLimit)
	for (const article of spotlightColumn) usedIds.add(article.id)

	const collections = takeUniqueArticles(buckets.collectionsCandidates, usedIds, collectionsLimit)

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
		staleTime: 0,
		refetchOnMount: 'always'
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

export default function ArticlesPage({
	landingData,
	landingBanner
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const { showSearch } = useResearchSearchParams()

	return (
		<Layout
			title="Crypto Research Reports & Market Intelligence | DefiLlama Research"
			description="Data-driven crypto and digital asset research and market analysis. Read expert perspectives powered by DefiLlama metrics."
			canonicalUrl="/research"
			hideDesktopSearch
		>
			<Head>
				<link
					rel="alternate"
					type="application/rss+xml"
					title="DefiLlama Research"
					href="https://defillama.com/research/feed.xml"
				/>
			</Head>
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
