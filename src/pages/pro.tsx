import { useRouter } from 'next/router'
import { useState } from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { DashboardList } from '~/containers/ProDashboard/components/DashboardList'
import { DemoPreview } from '~/containers/ProDashboard/components/DemoPreview'
import { DashboardDiscovery } from '~/containers/ProDashboard/components/DashboardDiscovery'
import { ProDashboardAPIProvider, useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { Icon } from '~/components/Icon'
import { CreateDashboardModal } from '~/containers/ProDashboard/components/CreateDashboardModal'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

function ProPageContent() {
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { isAuthenticated, loaders } = useAuthContext()
	const [activeTab, setActiveTab] = useState<'my-dashboards' | 'discover'>(
		subscription?.status === 'active' ? 'my-dashboards' : 'discover'
	)

	const isAccountLoading = loaders.userLoading || (isAuthenticated && isSubscriptionLoading)

	if (isAccountLoading) {
		return (
			<Layout title="DefiLlama - Pro Dashboard">
				<ProDashboardLoader />
			</Layout>
		)
	}

	if (!isAuthenticated) {
		return (
			<Layout title="DefiLlama - Pro Dashboard">
				<DemoPreview />
			</Layout>
		)
	}

	return (
		<Layout title="DefiLlama - Pro Dashboard">
			<AuthenticatedProContent 
				activeTab={activeTab} 
				setActiveTab={setActiveTab} 
				hasActiveSubscription={subscription?.status === 'active'}
			/>
		</Layout>
	)
}

function AuthenticatedProContent({
	activeTab,
	setActiveTab,
	hasActiveSubscription
}: {
	activeTab: 'my-dashboards' | 'discover'
	setActiveTab: (tab: 'my-dashboards' | 'discover') => void
	hasActiveSubscription: boolean
}) {
	const router = useRouter()
	const { isAuthenticated } = useAuthContext()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const {
		dashboards,
		isLoadingDashboards,
		createNewDashboard,
		deleteDashboard,
		showCreateDashboardModal,
		setShowCreateDashboardModal,
		handleCreateDashboard
	} = useProDashboard()

	const handleSelectDashboard = (dashboardId: string) => {
		router.push(`/pro/${dashboardId}`)
	}

	const handleDeleteDashboard = async (dashboardId: string) => {
		await deleteDashboard(dashboardId)
	}

	return (
		<div className="p-6 pro-dashboard">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-(--text1)">Pro Dashboard</h1>
			</div>

			<div className="mb-6">
				<div className="flex items-center justify-between">
					<div className="flex gap-8">
						{hasActiveSubscription && (
							<button
								onClick={() => setActiveTab('my-dashboards')}
								className={`pb-3 text-base font-medium transition-colors relative ${
									activeTab === 'my-dashboards' ? 'pro-text1' : 'pro-text3 hover:pro-text1'
								}`}
							>
								My Dashboards
								{activeTab === 'my-dashboards' && (
									<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--primary1)" />
								)}
							</button>
						)}
						<button
							onClick={() => setActiveTab('discover')}
							className={`pb-3 text-base font-medium transition-colors relative ${
								activeTab === 'discover' ? 'pro-text1' : 'pro-text3 hover:pro-text1'
							}`}
						>
							Discover
							{activeTab === 'discover' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--primary1)" />}
						</button>
					</div>
					<button
						onClick={hasActiveSubscription ? createNewDashboard : () => setShowSubscribeModal(true)}
						className="px-4 py-2 bg-(--primary1) text-white flex items-center gap-2 hover:bg-(--primary1-hover) text-sm"
					>
						<Icon name="plus" height={16} width={16} />
						Create New Dashboard
					</button>
				</div>
			</div>

			{activeTab === 'my-dashboards' ? (
				<DashboardList
					dashboards={dashboards}
					isLoading={isLoadingDashboards}
					onSelectDashboard={handleSelectDashboard}
					onCreateNew={createNewDashboard}
					onDeleteDashboard={isAuthenticated ? handleDeleteDashboard : undefined}
				/>
			) : (
				<DashboardDiscovery />
			)}

			<CreateDashboardModal
				isOpen={showCreateDashboardModal}
				onClose={() => setShowCreateDashboardModal(false)}
				onCreate={handleCreateDashboard}
			/>
			
			<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
				<SubscribePlusCard context="modal" returnUrl={router.asPath} />
			</SubscribeModal>
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
