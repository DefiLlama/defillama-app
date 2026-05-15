import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps } from 'next'
import { ArticleApiError } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
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
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import { getArticlesFetchFromRequest } from '~/containers/Articles/server/auth'
import type { ResearchLandingData } from '~/containers/Articles/server/queries'
import { fetchResearchLandingData } from '~/containers/Articles/server/queries'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

function ArticlesLandingInner({ landing }: { landing: ResearchLandingData }) {
	return (
		<div className="bg-top-center bg-[url(/assets/research/dotted-bg.webp)] bg-no-repeat">
			<ResearchHero
				title="Bespoke Digital Asset Research and Market Intelligence"
				subtitle="Independent and trusted in-depth analysis of digital asset markets for institutional strategy and decision-making."
				reports={landing.heroReports}
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
				/>
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
				/>
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
				/>

				<div className="relative z-1 mx-auto w-full max-w-7xl space-y-[30px] px-4 sm:px-6 lg:space-y-[70px] lg:px-8">
					<ResearchLatest articles={landing.latest} />

					<ResearchSpotlight title="In the spotlight" articles={landing.spotlight} />

					<ResearchInterviews title="Interviews" articles={landing.interviews} />

					<div id="reports">
						{landing.highlight.length > 0 ? (
							<ResearchSectionWithSharedHeightProvider>
								<div className="grid grid-cols-1 gap-[36px] lg:grid-cols-[725fr_403fr]">
									<ResearchReportHighlightWithHeight highlight={landing.highlight[0]} />
									<div className="flex flex-col gap-y-[64px]">
										<ResearchWidgetWithScrollbarWithHeight id="insights" title="Insights" articles={landing.insights} />
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
									articles={landing.moreReports}
									pageWidget="DL Research More Reports widget"
								/>
							</div>
							<div className="flex flex-col gap-y-[64px]">
								<ResearchSpotlightColumnWithHeight title="Explore Spotlights" articles={landing.spotlightColumn} />
							</div>
						</div>
					</ResearchSectionWithSharedHeightProvider>

					<ResearchCollections title="Collections" articles={landing.collections} />
				</div>
			</div>
		</div>
	)
}

function ArticlesLanding({ initialLanding }: { initialLanding: ResearchLandingData | null }) {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const needsClientFetch = initialLanding === null

	const landingQuery = useQuery({
		queryKey: ['research-landing'],
		queryFn: () => fetchResearchLandingData(authorizedFetch),
		enabled: needsClientFetch && isAuthenticated && !loaders.userLoading,
		retry: false,
		initialData: initialLanding ?? undefined
	})

	if (needsClientFetch && (loaders.userLoading || landingQuery.isLoading)) {
		return <ResearchLoader />
	}

	if (needsClientFetch && landingQuery.error) {
		const message =
			landingQuery.error instanceof ArticleApiError ? landingQuery.error.message : 'Failed to load articles'
		return (
			<div className="mx-auto grid w-full max-w-3xl gap-3 border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn&apos;t load research</h1>
				<p className="text-sm text-red-500">{message}</p>
			</div>
		)
	}

	const landing = landingQuery.data
	if (!landing) return <ResearchLoader />

	return <ArticlesLandingInner landing={landing} />
}

type ArticlesPageProps = {
	landing: ResearchLandingData | null
}

const getServerSidePropsHandler: GetServerSideProps<ArticlesPageProps> = async (context) => {
	context.res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')

	const fetchFn = getArticlesFetchFromRequest(context.req)
	if (!fetchFn) {
		return { props: { landing: null } }
	}

	try {
		const landing = await fetchResearchLandingData(fetchFn)
		return { props: { landing } }
	} catch {
		return { props: { landing: null } }
	}
}

export const getServerSideProps = withServerSidePropsTelemetry('/research', getServerSidePropsHandler)

export default function ArticlesPage({ landing }: ArticlesPageProps) {
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
				<ArticlesAccessGate loadingFallback={<ResearchLoader />}>
					<div className="col-span-full min-h-screen w-full text-blue-950 dark:text-white">
						{showSearch ? <ResearchSearch /> : <ArticlesLanding initialLanding={landing} />}
					</div>
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
