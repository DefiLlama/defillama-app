import { useQuery } from '@tanstack/react-query'
import type { InferGetStaticPropsType } from 'next'
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
import { RESEARCH_LANDING_SECTION_LIMITS } from '~/containers/Articles/landing/utils'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import type { ArticleDocument, BannerLookupResult } from '~/containers/Articles/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export type ResearchLandingData = {
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
	landingData: ResearchLandingData
	landingBanner: BannerLookupResult | null
}

export async function loadResearchLandingData(): Promise<ResearchLandingData> {
	const settled = await Promise.allSettled([
		listArticlesByTag(EDITORIAL_TAGS['reports-hero'].slug, RESEARCH_LANDING_SECTION_LIMITS.reportsHero),
		listArticlesByTag(EDITORIAL_TAGS.latest.slug, RESEARCH_LANDING_SECTION_LIMITS.latest),
		listArticlesByTag(EDITORIAL_TAGS.spotlight.slug, RESEARCH_LANDING_SECTION_LIMITS.spotlight),
		listArticles({ section: 'interview', limit: RESEARCH_LANDING_SECTION_LIMITS.interviews }),
		listArticlesByTag(EDITORIAL_TAGS['report-highlight'].slug, RESEARCH_LANDING_SECTION_LIMITS.reportHighlight),
		listArticlesByTag(EDITORIAL_TAGS.insights.slug, RESEARCH_LANDING_SECTION_LIMITS.insights),
		listArticles({
			section: 'report',
			sort: 'newest',
			limit: RESEARCH_LANDING_SECTION_LIMITS.moreReports
		}),
		listArticles({
			section: 'spotlight',
			sort: 'newest',
			limit: RESEARCH_LANDING_SECTION_LIMITS.spotlightColumn
		}),
		listArticles({ sort: 'newest', limit: RESEARCH_LANDING_SECTION_LIMITS.collections })
	])

	const itemsOrEmpty = (index: number) => (settled[index]?.status === 'fulfilled' ? settled[index].value.items : [])

	if (settled.every((r) => r.status === 'rejected')) {
		const firstRejected = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected')
		throw firstRejected?.reason ?? new Error('Failed to load research')
	}

	return {
		heroReports: itemsOrEmpty(0),
		latest: itemsOrEmpty(1),
		spotlight: itemsOrEmpty(2),
		interviews: itemsOrEmpty(3),
		highlight: itemsOrEmpty(4),
		insights: itemsOrEmpty(5),
		moreReports: itemsOrEmpty(6),
		spotlightColumn: itemsOrEmpty(7),
		collections: itemsOrEmpty(8)
	}
}

export const getStaticProps = withPerformanceLogging<ArticlesPageProps>('research', async () => {
	const [landingData, landingBanner] = await Promise.all([
		loadResearchLandingData(),
		getLandingBanner().catch(() => null)
	])
	return {
		props: {
			landingData,
			landingBanner
		},
		revalidate: maxAgeForNext([22])
	}
})

function ArticlesLandingInner({
	initialData,
	initialBanner
}: {
	initialData: ResearchLandingData
	initialBanner: BannerLookupResult | null
}) {
	const landingQuery = useQuery({
		queryKey: ['research-landing'],
		retry: false,
		queryFn: loadResearchLandingData,
		initialData,
		staleTime: 60_000
	})

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
		<div className="bg-top bg-[url(/assets/research/dotted-bg.webp)] bg-no-repeat pb-5">
			<ResearchHero
				title="Bespoke Digital Asset Research and Market Intelligence"
				subtitle="Independent and trusted in-depth analysis of digital asset markets for institutional strategy and decision-making."
				reports={landingQuery.data?.heroReports ?? []}
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
					<ResearchLatest articles={landingQuery.data?.latest ?? []} />

					<ResearchSpotlight title="In the spotlight" articles={landingQuery.data?.spotlight ?? []} />

					<ResearchInterviews title="Interviews" articles={landingQuery.data?.interviews ?? []} />

					<div id="reports">
						{(landingQuery.data?.highlight ?? []).length > 0 ? (
							<ResearchSectionWithSharedHeightProvider>
								<div className="grid grid-cols-1 gap-[36px] lg:grid-cols-[725fr_403fr]">
									<ResearchReportHighlightWithHeight highlight={(landingQuery.data?.highlight ?? [])[0]} />
									<div className="flex flex-col gap-y-[64px]">
										<ResearchWidgetWithScrollbarWithHeight
											id="insights"
											title="Insights"
											articles={landingQuery.data?.insights ?? []}
										/>
									</div>
								</div>
							</ResearchSectionWithSharedHeightProvider>
						) : null}
					</div>

					<ResearchBanner initialData={initialBanner} />

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
									articles={landingQuery.data?.moreReports ?? []}
									pageWidget="DL Research More Reports widget"
								/>
							</div>
							<div className="flex flex-col gap-y-[64px]">
								<ResearchSpotlightColumnWithHeight
									title="Explore Spotlights"
									articles={landingQuery.data?.spotlightColumn ?? []}
								/>
							</div>
						</div>
					</ResearchSectionWithSharedHeightProvider>

					<ResearchCollections title="Collections" articles={landingQuery.data?.collections ?? []} />
				</div>
			</div>
		</div>
	)
}

export default function ArticlesPage({ landingData, landingBanner }: InferGetStaticPropsType<typeof getStaticProps>) {
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
						<ArticlesLandingInner initialData={landingData} initialBanner={landingBanner} />
					)}
				</div>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
