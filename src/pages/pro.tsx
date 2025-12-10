import { lazy, Suspense } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { LikedDashboards } from '~/containers/ProDashboard/components/LikedDashboards'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { useMyDashboards } from '~/containers/ProDashboard/hooks'
import { ProDashboardAPIProvider, useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)
const CreateDashboardPicker = lazy(() =>
	import('~/containers/ProDashboard/components/CreateDashboardPicker').then((m) => ({
		default: m.CreateDashboardPicker
	}))
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
	const { isAuthenticated, loaders, hasActiveSubscription } = useAuthContext()

	if (loaders.userLoading) {
		return (
			<Layout
				title="DefiLlama - Pro Dashboard"
				description={`Pro Dashboard on DefiLlama. Custom no-code dashboards with TVL, Fees, Volume, and other metrics. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
				keywords={`pro dashboard, defi pro dashboard, custom dashboard`}
				canonicalUrl={`/pro`}
			>
				<ProDashboardLoader />
			</Layout>
		)
	}

	return (
		<Layout
			title="DefiLlama - Pro Dashboard"
			description={`Pro Dashboard on DefiLlama. Custom no-code dashboards with TVL, Fees, Volume, and other metrics. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`pro dashboard, defi pro dashboard, custom dashboard`}
			canonicalUrl={`/pro`}
		>
			<ProContent hasActiveSubscription={hasActiveSubscription} isAuthenticated={isAuthenticated} />
		</Layout>
	)
}

const tabs = ['my-dashboards', 'discover', 'favorites'] as const

function ProContent({
	hasActiveSubscription,
	isAuthenticated
}: {
	hasActiveSubscription: boolean
	isAuthenticated: boolean
}) {
	const router = useRouter()
	const { tab } = router.query
	const activeTab = typeof tab === 'string' && tabs.includes(tab as any) ? tab : 'discover'

	const subscribeModalStore = Ariakit.useDialogStore()
	const {
		deleteDashboard,
		handleCreateDashboard,
		createDashboardDialogStore,
		showGenerateDashboardModal,
		setShowGenerateDashboardModal,
		handleGenerateDashboard
	} = useProDashboard()

	const selectedPage =
		typeof router.query.page === 'string' && !Number.isNaN(Number(router.query.page)) ? parseInt(router.query.page) : 1
	const {
		dashboards: myDashboards,
		isLoading: isLoadingMyDashboards,
		totalPages: myDashboardsTotalPages,
		totalItems: myDashboardsTotalItems,
		goToPage
	} = useMyDashboards({ page: selectedPage, limit: 20, enabled: activeTab === 'my-dashboards' })

	const handleDeleteDashboard = async (dashboardId: string) => {
		await deleteDashboard(dashboardId)
	}

	return (
		<div className="pro-dashboard flex flex-1 flex-col gap-4 p-2 lg:px-0">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex overflow-x-auto">
					<BasicLink
						href={`/pro?tab=discover`}
						shallow
						data-active={activeTab === 'discover'}
						className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1.75 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--old-blue)"
					>
						Discover
					</BasicLink>
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
				<div className="ml-auto flex flex-wrap justify-end gap-2">
					{
						<button
							onClick={
								!isAuthenticated
									? () => router.push('/pro/preview')
									: hasActiveSubscription
										? () => setShowGenerateDashboardModal(true)
										: () => subscribeModalStore.show()
							}
							className="pro-btn-blue flex items-center gap-1 rounded-md px-4 py-2"
						>
							<Icon name="sparkles" height={16} width={16} />
							Generate with LlamaAI
						</button>
					}
					<button
						onClick={
							!isAuthenticated
								? () => router.push('/pro/preview')
								: hasActiveSubscription
									? () => createDashboardDialogStore.show()
									: () => subscribeModalStore.show()
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
					<>
						{!isLoadingMyDashboards && (
							<p className="-mb-2 text-xs text-(--text-label)">
								Showing {myDashboards.length} of {myDashboardsTotalItems} dashboards
							</p>
						)}

						<DashboardList
							dashboards={myDashboards}
							isLoading={isLoadingMyDashboards}
							onCreateNew={() => createDashboardDialogStore.show()}
							onDeleteDashboard={isAuthenticated ? handleDeleteDashboard : undefined}
						/>

						{myDashboardsTotalPages > 1 && (
							<div className="mt-4 flex flex-nowrap items-center justify-center gap-2 overflow-x-auto">
								<button
									onClick={() => goToPage(1)}
									disabled={selectedPage < 3}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevrons-left" height={16} width={16} />
								</button>

								<button
									onClick={() => goToPage(Math.max(1, selectedPage - 1))}
									disabled={selectedPage === 1}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevron-left" height={16} width={16} />
								</button>

								{(() => {
									const totalPages = myDashboardsTotalPages
									const pagesToShow =
										selectedPage === 1
											? [1, 2, Math.min(3, totalPages)]
											: selectedPage === totalPages
												? [Math.max(1, totalPages - 2), Math.max(1, totalPages - 1), totalPages]
												: [selectedPage - 1, selectedPage, selectedPage + 1]

									return pagesToShow
										.filter((n, i, arr) => n >= 1 && n <= totalPages && arr.indexOf(n) === i)
										.map((pageNum) => {
											const isActive = selectedPage === pageNum
											return (
												<button
													key={`my-dashboard-page-${pageNum}`}
													onClick={() => goToPage(pageNum)}
													data-active={isActive}
													className="h-[32px] min-w-[32px] flex-shrink-0 rounded-md px-2 py-1.5 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
												>
													{pageNum}
												</button>
											)
										})
								})()}

								<button
									onClick={() => goToPage(Math.min(myDashboardsTotalPages, selectedPage + 1))}
									disabled={selectedPage === myDashboardsTotalPages}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevron-right" height={16} width={16} />
								</button>
								<button
									onClick={() => goToPage(myDashboardsTotalPages)}
									disabled={selectedPage > myDashboardsTotalPages - 2}
									className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
								>
									<Icon name="chevrons-right" height={16} width={16} />
								</button>
							</div>
						)}
					</>
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
				<CreateDashboardPicker dialogStore={createDashboardDialogStore} onCreate={handleCreateDashboard} />
			</Suspense>

			<Suspense fallback={<></>}>
				<GenerateDashboardModal
					isOpen={showGenerateDashboardModal}
					onClose={() => setShowGenerateDashboardModal(false)}
					onGenerate={handleGenerateDashboard}
				/>
			</Suspense>

			<Suspense fallback={<></>}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>
		</div>
	)
}

export default function HomePage() {
	return (
		<AppMetadataProvider>
			<ProDashboardAPIProvider>
				<ProPageContent />
			</ProDashboardAPIProvider>
		</AppMetadataProvider>
	)
}
