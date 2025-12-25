import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { useDashboardEngagement } from '~/containers/ProDashboard/hooks/useDashboardEngagement'
import { ProDashboardAPIProvider, useProDashboardDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'

const ProDashboard = lazy(() => import('~/containers/ProDashboard'))

export default function DashboardPage() {
	const router = useRouter()
	const dashboardId = router.query.dashboardId as string
	const initialId = dashboardId === 'new' ? undefined : dashboardId

	return (
		<Layout
			title="DefiLlama - Pro Dashboard"
			description={`Pro Dashboard on DefiLlama. Custom no-code dashboards with TVL, Fees, Volume, and other metrics. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords=""
			canonicalUrl={`/pro/${dashboardId}`}
		>
			{router.isReady ? (
				<ProDashboardAPIProvider initialDashboardId={initialId} key={`dashboard-api-provider-${dashboardId}`}>
					<DashboardPageContent dashboardId={dashboardId} />
				</ProDashboardAPIProvider>
			) : (
				<ProDashboardLoader />
			)}
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
			setIsValidating(false)
			return
		}

		if (!isLoadingDashboard && (currentDashboard || dashboardVisibility)) {
			setIsValidating(false)
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
				<BasicLink href="/pro" className="pro-btn-purple mt-7 rounded-md px-6 py-3 font-medium">
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
					className="pro-btn-purple mt-7 rounded-md px-6 py-3 font-medium"
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
					className="pro-btn-purple mt-7 rounded-md px-6 py-3 font-medium"
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

				<h2 className="pro-text1 text-3xl font-bold">
					$49<span className="pro-text2 text-lg font-normal">/month</span>
				</h2>

				<BasicLink
					href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}
					className="pro-btn-purple rounded-md px-6 py-3 font-medium"
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
