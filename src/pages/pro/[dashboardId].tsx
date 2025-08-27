import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import ProDashboard from '~/containers/ProDashboard'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { useDashboardEngagement } from '~/containers/ProDashboard/hooks/useDashboardEngagement'
import { ProDashboardAPIProvider, useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import Layout from '~/layout'

export default function DashboardPage() {
	const router = useRouter()
	const dashboardId = router.query.dashboardId as string
	const initialId = dashboardId === 'new' ? undefined : dashboardId

	return (
		<Layout title="DefiLlama - Pro Dashboard">
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
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { isAuthenticated, loaders } = useAuthContext()
	const { isLoadingDashboard, dashboardVisibility, currentDashboard } = useProDashboard()
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

	const isAccountLoading = loaders.userLoading || (isAuthenticated && isSubscriptionLoading)
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
				<BasicLink
					href="/pro"
					className="bg-pro-purple-100 text-pro-purple-400 hover:bg-pro-purple-300/20 dark:bg-pro-purple-300/20 dark:text-pro-purple-200 hover:dark:bg-pro-purple-300/30 mt-7 rounded-md px-6 py-3 font-medium"
				>
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
				<button
					onClick={() => router.push(`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`)}
					className="bg-pro-purple-100 text-pro-purple-400 hover:bg-pro-purple-300/20 dark:bg-pro-purple-300/20 dark:text-pro-purple-200 hover:dark:bg-pro-purple-300/30 mt-7 rounded-md px-6 py-3 font-medium"
				>
					Sign In
				</button>
			</div>
		)
	}

	if (dashboardVisibility === 'public' && currentDashboard) {
		return <ProDashboard />
	}

	if (!isAuthenticated && dashboardVisibility === 'private') {
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
				<div className="max-w-md space-y-6 text-center">
					<h1 className="pro-text1 text-3xl font-bold">Sign In Required</h1>
					<p className="pro-text2 text-lg">Please sign in to view this dashboard</p>
					<button
						onClick={() => router.push(`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`)}
						className="rounded-md bg-(--primary) px-6 py-3 font-medium text-white transition-colors hover:bg-(--primary-hover)"
					>
						Sign In
					</button>
				</div>
			</div>
		)
	}

	if (subscription?.status !== 'active' && dashboardVisibility !== 'public') {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
				<div className="bg-opacity-30 w-full max-w-2xl rounded-lg border border-white/20 bg-(--bg-glass) p-8 shadow-lg backdrop-blur-xl md:p-12">
					<div className="space-y-6 text-center">
						<h1 className="pro-text1 text-3xl font-bold">Pro Dashboard Access</h1>
						<p className="pro-text2 text-lg">Subscribe to Pro to access this dashboard and unlock advanced features</p>

						<div className="my-8 grid grid-cols-2 gap-4 py-4 md:grid-cols-4">
							<div className="pro-text2 flex items-center gap-2 text-sm">
								<Icon name="bar-chart-2" height={16} width={16} className="shrink-0 text-(--primary)" />
								<span>Customizable Charts</span>
							</div>
							<div className="pro-text2 flex items-center gap-2 text-sm">
								<Icon name="activity" height={16} width={16} className="shrink-0 text-(--primary)" />
								<span>Multiple Dashboards</span>
							</div>
							<div className="pro-text2 flex items-center gap-2 text-sm">
								<Icon name="percent" height={16} width={16} className="shrink-0 text-(--primary)" />
								<span>Advanced Analytics</span>
							</div>
							<div className="pro-text2 flex items-center gap-2 text-sm">
								<Icon name="layers" height={16} width={16} className="shrink-0 text-(--primary)" />
								<span>Multi-Charts</span>
							</div>
						</div>

						<div className="pro-text1 text-3xl font-bold">
							$49<span className="pro-text2 text-lg font-normal">/month</span>
							<div className="pro-text2 text-sm font-normal">Pro subscription</div>
						</div>

						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
							<button
								onClick={() => router.push(`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`)}
								className="inline-flex items-center gap-2 rounded-md bg-(--primary) px-8 py-3 font-medium text-white transition-colors hover:bg-(--primary-hover)"
							>
								<Icon name="arrow-right" height={16} width={16} />
								Subscribe Now
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return <ProDashboard />
}
