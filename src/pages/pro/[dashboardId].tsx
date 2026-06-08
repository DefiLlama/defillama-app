import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { DashboardSeoSummary } from '~/containers/ProDashboard/components/DashboardSeoSummary'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { useDashboardEngagement } from '~/containers/ProDashboard/hooks/useDashboardEngagement'
import { ProDashboardAPIProvider, useProDashboardDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { fetchDashboardConfigWithStatus } from '~/containers/ProDashboard/queries.server'
import { getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'
import {
	buildDashboardSeo,
	type DashboardSeo,
	type DashboardSeoPublicDashboard,
	toDashboardSeoPublicDashboard
} from '~/containers/ProDashboard/utils/seo'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const ProDashboard = lazy(() => import('~/containers/ProDashboard'))

const PUBLIC_DASHBOARD_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'
const PRIVATE_DASHBOARD_CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate'
const GENERIC_TITLE = 'DefiLlama Pro - Custom DeFi Dashboard'
const GENERIC_DESCRIPTION =
	'Custom DeFi analytics dashboard on DefiLlama Pro. No-code dashboards with TVL, fees, volume, and protocol metrics.'

type DashboardPageProps = {
	dashboardId: string
	initialDashboard: DashboardSeoPublicDashboard | null
	seo: DashboardSeo | null
	noIndex: boolean
	status: number
}

function noIndexProps(dashboardId: string, status: number): DashboardPageProps {
	return {
		dashboardId,
		initialDashboard: null,
		seo: null,
		noIndex: true,
		status
	}
}

const getServerSidePropsHandler: GetServerSideProps<DashboardPageProps> = async (context) => {
	const dashboardId = context.params?.dashboardId as string

	if (dashboardId === 'new') {
		context.res.setHeader('Cache-Control', 'private, no-store')
		return { props: noIndexProps(dashboardId, 200) }
	}

	const authToken = getAuthTokenFromRequest(context.req)

	if (authToken) {
		context.res.setHeader('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		context.res.setHeader('Vary', 'Cookie, Authorization')
		return { props: noIndexProps(dashboardId, 200) }
	}

	const { dashboard, status } = await fetchDashboardConfigWithStatus(dashboardId, null)
	context.res.setHeader('Vary', 'Cookie, Authorization')

	if (dashboard?.visibility === 'public') {
		context.res.setHeader('Cache-Control', PUBLIC_DASHBOARD_CACHE_CONTROL)
		const seo = buildDashboardSeo(dashboard)
		return {
			props: {
				dashboardId,
				initialDashboard: toDashboardSeoPublicDashboard(dashboard),
				seo,
				noIndex: false,
				status: 200
			}
		}
	}

	const responseStatus = status === 404 ? 404 : status === 401 || status === 403 ? status : 500
	context.res.statusCode = responseStatus
	context.res.setHeader('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
	return { props: noIndexProps(dashboardId, responseStatus) }
}

export default function DashboardPage({
	dashboardId,
	initialDashboard,
	seo,
	noIndex,
	status
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const initialId = dashboardId === 'new' ? undefined : dashboardId
	const title = seo?.title ?? GENERIC_TITLE
	const description = seo?.description ?? GENERIC_DESCRIPTION
	const canonicalUrl = noIndex ? null : (seo?.canonicalPath ?? `/pro/${dashboardId}`)

	return (
		<Layout
			title={title}
			description={description}
			canonicalUrl={canonicalUrl}
			noIndex={noIndex}
			jsonLd={!noIndex ? seo?.jsonLd : undefined}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-2">
				{initialDashboard && seo ? <DashboardSeoSummary dashboard={initialDashboard} seo={seo} /> : null}
				<ProDashboardAPIProvider
					initialDashboardId={initialId}
					mode={initialId ? 'view' : 'edit'}
					key={`dashboard-api-provider-${dashboardId}`}
				>
					<DashboardPageContent dashboardId={dashboardId} initialStatus={status} />
				</ProDashboardAPIProvider>
			</div>
		</Layout>
	)
}

function DashboardPageContent({ dashboardId, initialStatus }: { dashboardId: string; initialStatus: number }) {
	const router = useRouter()

	const { isAuthenticated, loaders, hasActiveSubscription } = useAuthContext()
	const { isLoadingDashboard, streamHasResolved, loadError, reloadDashboard, dashboardVisibility, currentDashboard } =
		useProDashboardDashboard()
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

		if (!isLoadingDashboard && (currentDashboard || streamHasResolved)) {
			queueMicrotask(() => {
				setIsValidating(false)
			})
		}
	}, [dashboardId, isLoadingDashboard, currentDashboard, streamHasResolved])

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

	if (dashboardId !== 'new' && !currentDashboard && initialStatus === 404) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Dashboard Not Found</h1>
				<p className="text-center text-base text-(--text-label)">This dashboard does not exist.</p>
				<BasicLink href="/pro" className="mt-7 rounded-md pro-btn-purple px-6 py-3 font-medium">
					Browse Dashboards
				</BasicLink>
			</div>
		)
	}

	if (dashboardId !== 'new' && !currentDashboard && loadError?.status === 401) {
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

	if (dashboardId !== 'new' && !currentDashboard && loadError && loadError.status >= 500) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Failed to load dashboard</h1>
				<p className="text-center text-base text-(--text-label)">
					Something went wrong while loading this dashboard. Please try again.
				</p>
				<button
					type="button"
					onClick={reloadDashboard}
					className="mt-2 rounded-md pro-btn-purple px-6 py-3 font-medium"
				>
					Retry
				</button>
			</div>
		)
	}

	if (dashboardId !== 'new' && !currentDashboard && isAuthenticated) {
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
			<Suspense
				fallback={
					<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1" />
				}
			>
				<ProDashboard />
			</Suspense>
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
		<Suspense
			fallback={
				<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1" />
			}
		>
			<ProDashboard />
		</Suspense>
	)
}

export const getServerSideProps = withServerSidePropsTelemetry('/pro/[dashboardId]', getServerSidePropsHandler)
