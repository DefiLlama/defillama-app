import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import ProDashboard from '~/containers/ProDashboard'
import { ProDashboardAPIProvider, useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { Icon } from '~/components/Icon'

export const getStaticPaths = async () => {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging('pro/[dashboardId]', async ({ params }) => {
	const dashboardId = params?.dashboardId as string

	if (!dashboardId) {
		return {
			notFound: true
		}
	}

	return {
		props: {
			dashboardId
		},
		revalidate: maxAgeForNext([22])
	}
})

interface DashboardPageProps {
	dashboardId: string
}

export default function DashboardPage({ dashboardId }: DashboardPageProps) {
	const router = useRouter()
	const initialId = dashboardId === 'new' ? undefined : dashboardId

	return (
		<Layout title="DefiLlama - Pro Dashboard">
			<ProDashboardAPIProvider initialDashboardId={initialId}>
				<DashboardPageContent dashboardId={dashboardId} />
			</ProDashboardAPIProvider>
		</Layout>
	)
}

function DashboardPageContent({ dashboardId }: DashboardPageProps) {
	const router = useRouter()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { isAuthenticated, loaders } = useAuthContext()
	const { isLoadingDashboard } = useProDashboard()
	const [isValidating, setIsValidating] = useState(true)

	useEffect(() => {
		if (dashboardId === 'new') {
			setIsValidating(false)
			return
		}

		setIsValidating(false)
	}, [dashboardId])

	const isAccountLoading = loaders.userLoading || (isAuthenticated && isSubscriptionLoading)
	const isLoading = isAccountLoading || isValidating || isLoadingDashboard

	if (isLoading) {
		return <ProDashboardLoader />
	}

	if (!isAuthenticated) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
				<div className="max-w-md text-center space-y-6">
					<h1 className="text-3xl font-bold pro-text1">Sign In Required</h1>
					<p className="text-lg pro-text2">Please sign in to view this dashboard</p>
					<button
						onClick={() => router.push('/subscription')}
						className="px-6 py-3 bg-[var(--primary1)] hover:bg-[var(--primary1-hover)] text-white font-medium transition-colors rounded-md"
					>
						Sign In
					</button>
				</div>
			</div>
		)
	}

	if (subscription?.status !== 'active') {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
				<div className="max-w-2xl w-full bg-[var(--bg7)] bg-opacity-30 backdrop-blur-xl border border-white/20 rounded-lg p-8 md:p-12 shadow-lg">
					<div className="text-center space-y-6">
						<h1 className="text-3xl font-bold pro-text1">Pro Dashboard Access</h1>
						<p className="text-lg pro-text2">
							Subscribe to Llama+ to access this dashboard and unlock advanced features
						</p>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8 py-4">
							<div className="flex items-center gap-2 text-sm pro-text2">
								<Icon name="bar-chart-2" height={16} width={16} className="text-[var(--primary1)] flex-shrink-0" />
								<span>Customizable Charts</span>
							</div>
							<div className="flex items-center gap-2 text-sm pro-text2">
								<Icon name="activity" height={16} width={16} className="text-[var(--primary1)] flex-shrink-0" />
								<span>Multiple Dashboards</span>
							</div>
							<div className="flex items-center gap-2 text-sm pro-text2">
								<Icon name="percent" height={16} width={16} className="text-[var(--primary1)] flex-shrink-0" />
								<span>Advanced Analytics</span>
							</div>
							<div className="flex items-center gap-2 text-sm pro-text2">
								<Icon name="layers" height={16} width={16} className="text-[var(--primary1)] flex-shrink-0" />
								<span>Multi-Charts</span>
							</div>
						</div>

						<div className="text-3xl font-bold pro-text1">
							$49<span className="text-lg font-normal pro-text2">/month</span>
							<div className="text-sm pro-text2 font-normal">Llama+ subscription</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
							<button
								onClick={() => router.push('/subscription')}
								className="px-8 py-3 bg-[var(--primary1)] hover:bg-[var(--primary1-hover)] text-white font-medium transition-colors inline-flex items-center gap-2 rounded-md"
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
