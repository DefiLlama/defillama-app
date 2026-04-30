import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { useDashboardEngagement } from '~/containers/ProDashboard/hooks/useDashboardEngagement'
import { ProDashboardAPIProvider, useProDashboardDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { fetchDashboardConfig } from '~/containers/ProDashboard/queries.server'
import { getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const ProDashboard = lazy(() => import('~/containers/ProDashboard'))

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	const dashboardId = context.params?.dashboardId as string

	if (dashboardId === 'new') {
		context.res.setHeader('Cache-Control', 'private, no-store')
		return { props: { dashboardId } }
	}

	const authToken = getAuthTokenFromRequest(context.req)
	context.res.setHeader(
		'Cache-Control',
		authToken ? 'private, no-cache, no-store, must-revalidate' : 'public, s-maxage=300, stale-while-revalidate=3600'
	)

	try {
		const dashboard = await fetchDashboardConfig(dashboardId, authToken)
		if (!dashboard) {
			return { notFound: true }
		}
	} catch {
		// On fetch error, let client-side handle it via the stream
	}

	return { props: { dashboardId } }
}

export default function DashboardPage({ dashboardId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const initialId = dashboardId === 'new' ? undefined : dashboardId

	return (
		<Layout
			title="DefiLlama Pro - Custom DeFi Dashboard"
			description="Custom DeFi analytics dashboard on DefiLlama Pro. No-code dashboards with TVL, fees, volume, and protocol metrics."
			canonicalUrl={`/pro/${dashboardId}`}
		>
			<ProDashboardAPIProvider initialDashboardId={initialId} key={`dashboard-api-provider-${dashboardId}`}>
				<DashboardPageContent dashboardId={dashboardId} />
			</ProDashboardAPIProvider>
		</Layout>
	)
}

function DashboardPageContent({ dashboardId }: { dashboardId: string }) {
	const router = useRouter()

	const { isAuthenticated, loaders, hasActiveSubscription } = useAuthContext()
	const { isLoadingDashboard, dashboardVisibility, currentDashboard, dashboardName } = useProDashboardDashboard()
	const [isValidating, setIsValidating] = useState(true)
	const { trackView } = useDashboardEngagement(dashboardId === 'new' ? null : dashboardId)
	const hasTrackedView = useRef(false)

	useEffect(() => {
		if (dashboardId === 'new') {
			queueMicrotask(() => {
				setIsValidating(false)
			})
			return
		}

		if (!isLoadingDashboard && (currentDashboard || dashboardVisibility)) {
			queueMicrotask(() => {
				setIsValidating(false)
			})
		}
	}, [dashboardId, isLoadingDashboard, currentDashboard, dashboardVisibility])

	useEffect(() => {
		if (
			dashboardId &&
			dashboardId !== 'new' &&
			dashboardVisibility === 'public' &&
			!isLoadingDashboard &&
			!hasTrackedView.current
		) {
			hasTrackedView.current = true
			trackView()
		}
	}, [dashboardId, dashboardVisibility, isLoadingDashboard, trackView])

	const isAccountLoading = loaders.userLoading
	const isLoading = isAccountLoading || isValidating || isLoadingDashboard

	if (isLoading) {
		return <ProDashboardLoader />
	}

	if (dashboardId !== 'new' && !currentDashboard && !isLoadingDashboard && !isValidating) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Dashboard Not Found</h1>
				<p className="text-center text-base text-(--text-label)">
					This dashboard does not exist or you don't have permission to view it
				</p>
				<BasicLink href="/pro" className="mt-7 rounded-md pro-btn-purple px-6 py-3 font-medium">
					Browse Dashboards
				</BasicLink>
			</div>
		)
	}

	if (dashboardId === 'new' && !isAuthenticated) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Sign In Required</h1>
				<p className="text-center text-base text-(--text-label)">Please sign in to create a new dashboard</p>
				<BasicLink
					href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}
					className="mt-7 rounded-md pro-btn-purple px-6 py-3 font-medium"
				>
					Sign In
				</BasicLink>
			</div>
		)
	}

	if (dashboardVisibility === 'public' && currentDashboard) {
		return (
			<>
				<Head>
					<title>{`${dashboardName} - DefiLlama`}</title>
				</Head>
				<Suspense
					fallback={
						<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1" />
					}
				>
					<ProDashboard />
				</Suspense>
			</>
		)
	}

	if (!isAuthenticated && dashboardVisibility === 'private') {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Sign In Required</h1>
				<p className="text-center text-base text-(--text-label)">Please sign in to view this dashboard</p>
				<BasicLink
					href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}
					className="mt-7 rounded-md pro-btn-purple px-6 py-3 font-medium"
				>
					Sign In
				</BasicLink>
			</div>
		)
	}

	if (!hasActiveSubscription && dashboardVisibility !== 'public') {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-8 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Pro Dashboard Access</h1>
				<p className="-mt-6 text-center text-base text-(--text-label)">
					Subscribe to Pro to access this dashboard and unlock advanced features
				</p>

				<div className="mx-auto flex flex-wrap items-center justify-center gap-4">
					<div className="flex items-center gap-2 text-sm">
						<Icon name="bar-chart-2" height={16} width={16} className="shrink-0 text-(--old-blue)" />
						<span>Customizable Charts</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Icon name="activity" height={16} width={16} className="shrink-0 text-(--old-blue)" />
						<span>Multiple Dashboards</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Icon name="percent" height={16} width={16} className="shrink-0 text-(--old-blue)" />
						<span>Advanced Analytics</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Icon name="layers" height={16} width={16} className="shrink-0 text-(--old-blue)" />
						<span>Multi-Charts</span>
					</div>
				</div>

				<h2 className="text-3xl font-bold pro-text1">
					$49<span className="text-lg font-normal pro-text2">/month</span>
				</h2>

				<BasicLink
					href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}
					className="rounded-md pro-btn-purple px-6 py-3 font-medium"
				>
					Subscribe Now
				</BasicLink>
			</div>
		)
	}

	return (
		<>
			<Head>
				<title>{`${dashboardName} - DefiLlama`}</title>
			</Head>
			<Suspense
				fallback={
					<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1" />
				}
			>
				<ProDashboard />
			</Suspense>
		</>
	)
}

export const getServerSideProps = withServerSidePropsTelemetry('/pro/[dashboardId]', getServerSidePropsHandler)
