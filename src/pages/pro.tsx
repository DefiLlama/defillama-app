import { lazy, Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
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

function ProContent({
	activeTab,
	setActiveTab,
	hasActiveSubscription,
	isAuthenticated
}: {
	activeTab: 'my-dashboards' | 'discover' | 'favorites'
	setActiveTab: (tab: 'my-dashboards' | 'discover' | 'favorites') => void
	hasActiveSubscription: boolean
	isAuthenticated: boolean
}) {
	const router = useRouter()
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
		<div className="pro-dashboard my-2 flex flex-1 flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex gap-8">
					{isAuthenticated && hasActiveSubscription && (
						<button
							onClick={() => setActiveTab('my-dashboards')}
							className={`relative pb-3 text-base font-medium transition-colors ${
								activeTab === 'my-dashboards' ? 'pro-text1' : 'pro-text3 hover:pro-text1'
							}`}
						>
							My Dashboards
							{activeTab === 'my-dashboards' && (
								<div className="absolute right-0 bottom-0 left-0 h-0.5 bg-(--primary)" />
							)}
						</button>
					)}

					<button
						onClick={() => setActiveTab('discover')}
						className={`relative pb-3 text-base font-medium transition-colors ${
							activeTab === 'discover' ? 'pro-text1' : 'pro-text3 hover:pro-text1'
						}`}
					>
						Discover
						{activeTab === 'discover' && <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-(--primary)" />}
					</button>
					{isAuthenticated && (
						<button
							onClick={() => setActiveTab('favorites')}
							className={`relative pb-3 text-base font-medium transition-colors ${
								activeTab === 'favorites' ? 'pro-text1' : 'pro-text3 hover:pro-text1'
							}`}
						>
							Favorites
							{activeTab === 'favorites' && <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-(--primary)" />}
						</button>
					)}
				</div>
				<div className="flex gap-2">
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
