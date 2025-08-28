import { lazy, Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LikedDashboards } from '~/containers/ProDashboard/components/LikedDashboards'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { ProDashboardAPIProvider, useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'
import { useSubscribe } from '~/hooks/useSubscribe'
import Layout from '~/layout'

const SubscribeModal = lazy(() =>
	import('~/components/Modal/SubscribeModal').then((m) => ({ default: m.SubscribeModal }))
)
const SubscribePlusCard = lazy(() =>
	import('~/components/SubscribeCards/SubscribePlusCard').then((m) => ({ default: m.SubscribePlusCard }))
)
const CreateDashboardModal = lazy(() =>
	import('~/containers/ProDashboard/components/CreateDashboardModal').then((m) => ({ default: m.CreateDashboardModal }))
)
const DashboardDiscovery = lazy(() =>
	import('~/containers/ProDashboard/components/DashboardDiscovery').then((m) => ({ default: m.DashboardDiscovery }))
)
const DashboardList = lazy(() =>
	import('~/containers/ProDashboard/components/DashboardList').then((m) => ({ default: m.DashboardList }))
)
const GenerateDashboardModal = lazy(() =>
	import('~/containers/ProDashboard/components/GenerateDashboardModal').then((m) => ({
		default: m.GenerateDashboardModal
	}))
)

function ProPageContent() {
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { isAuthenticated, loaders } = useAuthContext()

	const [activeTab, setActiveTab] = useState<'my-dashboards' | 'discover' | 'favorites'>(
		isAuthenticated && subscription?.status === 'active' ? 'my-dashboards' : 'discover'
	)

	const isAccountLoading = loaders.userLoading || (isAuthenticated && isSubscriptionLoading)

	if (isAccountLoading) {
		return (
			<Layout title="DefiLlama - Pro Dashboard">
				<ProDashboardLoader />
			</Layout>
		)
	}

	return (
		<Layout title="DefiLlama - Pro Dashboard">
			<ProContent
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				hasActiveSubscription={subscription?.status === 'active'}
				isAuthenticated={isAuthenticated}
			/>
		</Layout>
	)
}

const tabs = ['my-dashboards', 'discover', 'favorites'] as const

function ProContent({
	hasActiveSubscription,
	isAuthenticated
}: {
	activeTab: 'my-dashboards' | 'discover' | 'favorites'
	setActiveTab: (tab: 'my-dashboards' | 'discover' | 'favorites') => void
	hasActiveSubscription: boolean
	isAuthenticated: boolean
}) {
	const router = useRouter()
	const { tab } = router.query
	const activeTab =
		typeof tab === 'string' && tabs.includes(tab as any)
			? tab
			: isAuthenticated && hasActiveSubscription
				? 'my-dashboards'
				: 'discover'

	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const { hasFeature, loading: featureFlagsLoading } = useFeatureFlagsContext()
	const {
		dashboards,
		isLoadingDashboards,
		createNewDashboard,
		deleteDashboard,
		showCreateDashboardModal,
		setShowCreateDashboardModal,
		handleCreateDashboard,
		showGenerateDashboardModal,
		setShowGenerateDashboardModal,
		handleGenerateDashboard
	} = useProDashboard()

	const handleDeleteDashboard = async (dashboardId: string) => {
		await deleteDashboard(dashboardId)
	}

	return (
		<div className="pro-dashboard flex flex-1 flex-col gap-4 p-2 lg:px-0">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex overflow-x-auto">
					{isAuthenticated && hasActiveSubscription && (
						<BasicLink
							href={`/pro?tab=my-dashboards`}
							shallow
							data-active={activeTab === 'my-dashboards'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1.75 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--old-blue)"
						>
							My Dashboards
						</BasicLink>
					)}
					<BasicLink
						href={`/pro?tab=discover`}
						shallow
						data-active={activeTab === 'discover'}
						className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1.75 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--old-blue)"
					>
						Discover
					</BasicLink>
					{isAuthenticated && (
						<BasicLink
							href={`/pro?tab=favorites`}
							shallow
							data-active={activeTab === 'favorites'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1.75 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--old-blue)"
						>
							Favorites
						</BasicLink>
					)}
				</div>
				<div className="ml-auto flex flex-wrap gap-2">
					{!featureFlagsLoading && hasFeature('dashboard-gen') && (
						<button
							onClick={
								!isAuthenticated
									? () => router.push('/pro/preview')
									: hasActiveSubscription
										? () => setShowGenerateDashboardModal(true)
										: () => setShowSubscribeModal(true)
							}
							className="pro-btn-blue flex items-center gap-1 rounded-md px-4 py-2"
						>
							<Icon name="sparkles" height={16} width={16} />
							Generate with LlamaAI
						</button>
					)}
					<button
						onClick={
							!isAuthenticated
								? () => router.push('/pro/preview')
								: hasActiveSubscription
									? createNewDashboard
									: () => setShowSubscribeModal(true)
						}
						className="pro-btn-purple flex items-center gap-1 rounded-md px-4 py-2"
					>
						<Icon name="plus" height={16} width={16} />
						Create New Dashboard
					</button>
				</div>
			</div>

			{activeTab === 'my-dashboards' ? (
				<Suspense fallback={<></>}>
					<DashboardList
						dashboards={dashboards}
						isLoading={isLoadingDashboards}
						onCreateNew={createNewDashboard}
						onDeleteDashboard={isAuthenticated ? handleDeleteDashboard : undefined}
					/>
				</Suspense>
			) : activeTab === 'favorites' ? (
				<Suspense fallback={<></>}>
					<LikedDashboards />
				</Suspense>
			) : (
				<Suspense fallback={<></>}>
					<DashboardDiscovery />
				</Suspense>
			)}

			<Suspense fallback={<></>}>
				<CreateDashboardModal
					isOpen={showCreateDashboardModal}
					onClose={() => setShowCreateDashboardModal(false)}
					onCreate={handleCreateDashboard}
				/>
			</Suspense>

			<Suspense fallback={<></>}>
				<GenerateDashboardModal
					isOpen={showGenerateDashboardModal}
					onClose={() => setShowGenerateDashboardModal(false)}
					onGenerate={handleGenerateDashboard}
				/>
			</Suspense>

			<Suspense fallback={<></>}>
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<Suspense fallback={<></>}>
						<SubscribePlusCard context="modal" returnUrl={router.asPath} />
					</Suspense>
				</SubscribeModal>
			</Suspense>
		</div>
	)
}

export default function HomePage() {
	return (
		<ProDashboardAPIProvider>
			<ProPageContent />
		</ProDashboardAPIProvider>
	)
}
