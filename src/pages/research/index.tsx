import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ArticleApiError, listArticles } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { ResearchBanner } from '~/containers/Articles/landing/ResearchBanner'
import { ResearchCollections } from '~/containers/Articles/landing/ResearchCollections'
import { ResearchGridWithScrollbar } from '~/containers/Articles/landing/ResearchGridWithScrollbar'
import { ResearchHero } from '~/containers/Articles/landing/ResearchHero'
import { ResearchInterviews } from '~/containers/Articles/landing/ResearchInterviews'
import { ResearchIntroducingWithHeight } from '~/containers/Articles/landing/ResearchIntroducing'
import { ResearchLatest } from '~/containers/Articles/landing/ResearchLatest'
import { ResearchReportHighlightWithHeight } from '~/containers/Articles/landing/ResearchReportHighlight'
import { ResearchSectionWithSharedHeightProvider } from '~/containers/Articles/landing/ResearchSectionWithSharedHeight'
import { ResearchSocialMediaMentions } from '~/containers/Articles/landing/ResearchSocialMediaMentions'
import { ResearchSpotlight } from '~/containers/Articles/landing/ResearchSpotlight'
import { ResearchTrustedByCarousel } from '~/containers/Articles/landing/ResearchTrustedByCarousel'
import { ResearchWidgetWithScrollbarWithHeight } from '~/containers/Articles/landing/ResearchWidgetWithScrollbar'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { RESEARCH_LANDING_LIMITS } from '~/containers/Articles/landing/utils'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

function ArticlesLandingInner() {
	const { authorizedFetch } = useAuthContext()

	const {
		data: response,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research-landing-articles'],
		queryFn: () => listArticles({ sort: 'newest', limit: 80 }, authorizedFetch),
		retry: false
	})

	const articles = response?.items ?? []

	// TODO: fetch correct sections
	const slices = useMemo(() => {
		const L = RESEARCH_LANDING_LIMITS
		return {
			heroReports: articles.slice(0, L.heroReports),
			latest: articles.slice(0, L.latest),
			spotlight: articles.slice(0, L.spotlight),
			interviews: articles.slice(0, L.interviews),
			highlight: articles[0] ?? null,
			insights: articles.slice(0, L.insights),
			introducingGrid: articles.slice(0, L.introducingGrid),
			introducingColumn: articles.slice(L.introducingGrid, L.introducingGrid + L.introducingColumn),
			moreReports: articles.slice(0, L.moreReports),
			collections: articles.slice(0, L.collections)
		}
	}, [articles])

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
		<>
			<ResearchHero
				introTitle="In-depth research reports, intelligence and custom content <br />to take your brand to the next level"
				reports={slices.heroReports}
			/>

			<div className="relative overflow-hidden">
				<div
					style={{
						background: 'radial-gradient(circle, rgb(35, 123, 255) 0%, transparent 75%)',
						width: '900px',
						height: '900px',
						position: 'absolute',
						right: '-690px',
						top: '1000px'
					}}
				></div>

				<div
					style={{
						background: 'radial-gradient(circle, rgb(35, 123, 255) 0%, transparent 75%)',
						width: '900px',
						height: '900px',
						position: 'absolute',
						left: '-690px',
						top: '2300px'
					}}
				></div>

				<div
					style={{
						background: 'radial-gradient(circle, rgb(35, 123, 255) 0%, transparent 75%)',
						width: '900px',
						height: '900px',
						position: 'absolute',
						right: '-590px',
						top: '2900px'
					}}
				></div>

				<div className="mx-auto w-full max-w-7xl space-y-[30px] px-4 sm:px-6 lg:space-y-[70px] lg:px-8">
					<ResearchLatest articles={slices.latest} />

					<ResearchSpotlight title="In the spotlight" articles={slices.spotlight} />

					<ResearchInterviews title="Interviews" articles={slices.interviews} />

					<div id="reports">
						{slices.highlight ? (
							<ResearchSectionWithSharedHeightProvider>
								<div className="grid grid-cols-1 gap-[36px] lg:grid-cols-[725fr_403fr]">
									<ResearchReportHighlightWithHeight highlight={slices.highlight} />
									<div className="flex flex-col gap-y-[64px]">
										<ResearchWidgetWithScrollbarWithHeight id="insights" title="Insights" articles={slices.insights} />
									</div>
								</div>
							</ResearchSectionWithSharedHeightProvider>
						) : null}
					</div>

					<ResearchBanner />

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
									articles={slices.moreReports}
									pageWidget="DL Research More Reports widget"
								/>
							</div>
							<div className="flex flex-col gap-y-[64px]">
								<ResearchIntroducingWithHeight title="Introducing" articles={slices.introducingColumn} />
							</div>
						</div>
					</ResearchSectionWithSharedHeightProvider>

					<ResearchCollections title="Collections" articles={slices.collections} />
				</div>
			</div>
		</>
	)
}

export default function ArticlesPage() {
	return (
		<Layout
			title="DefiLlama Research - DefiLlama"
			description="Data-driven crypto and digital asset research and market analysis. Read expert perspectives powered by DefiLlama metrics."
			canonicalUrl="/research"
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate loadingFallback={<ResearchLoader />}>
					<div className="col-span-full min-h-screen w-full bg-white text-blue-950 dark:bg-[#13141a] dark:text-white">
						<ArticlesLandingInner />
					</div>
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
