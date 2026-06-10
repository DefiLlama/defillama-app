import * as Ariakit from '@ariakit/react'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { FEATURES_SERVER } from '~/constants'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import type { ComparisonPreset } from '~/containers/ProDashboard/components/ComparisonWizard/types'
import { DashboardDiscovery } from '~/containers/ProDashboard/components/DashboardDiscovery'
import { DashboardList } from '~/containers/ProDashboard/components/DashboardList'
import { DashboardPaywallModal, type PaywallReason } from '~/containers/ProDashboard/components/DashboardPaywallModal'
import { FollowingShelves } from '~/containers/ProDashboard/components/FollowingShelves'
import { LikedDashboards } from '~/containers/ProDashboard/components/LikedDashboards'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { useFreeTierStatus, useMyDashboards } from '~/containers/ProDashboard/hooks'
import {
	DISCOVERY_CATEGORIES,
	type DiscoveryCategoryResponse,
	type DiscoveryCategoriesInitialData
} from '~/containers/ProDashboard/hooks/useDiscoveryCategories'
import {
	ProDashboardAPIProvider,
	useProDashboardDashboard,
	useProDashboardUI
} from '~/containers/ProDashboard/ProDashboardAPIContext'
import { getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'
import type { Dashboard } from '~/containers/ProDashboard/services/DashboardAPI'
import { useAuthContext } from '~/containers/Subscription/auth'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'
const CreateDashboardPicker = lazy(() =>
	import('~/containers/ProDashboard/components/CreateDashboardPicker').then((m) => ({
		default: m.CreateDashboardPicker
	}))
)
const GenerateDashboardModal = lazy(() =>
	import('~/containers/ProDashboard/components/GenerateDashboardModal').then((m) => ({
		default: m.GenerateDashboardModal
	}))
)

const PUBLIC_PRO_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'
const PRIVATE_PRO_CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate'
const DISCOVERY_FETCH_TIMEOUT_MS = 3_000

type ProPageProps = {
	initialDiscoveryCategories: DiscoveryCategoriesInitialData
}

function compactDiscoveryAuthor(author: Dashboard['author']): Dashboard['author'] {
	if (
		!author?.slug ||
		!author.displayName ||
		typeof author.createdAt !== 'string' ||
		typeof author.updatedAt !== 'string'
	) {
		return undefined
	}
	return {
		slug: author.slug,
		displayName: author.displayName,
		bio: author.bio ?? null,
		avatarUrl: author.avatarUrl ?? null,
		socials: author.socials || {},
		createdAt: author.createdAt,
		updatedAt: author.updatedAt
	}
}

function compactDiscoveryDashboard(dashboard: Dashboard): Dashboard {
	const author = compactDiscoveryAuthor(dashboard.author)
	return {
		id: dashboard.id,
		visibility: dashboard.visibility,
		tags: Array.isArray(dashboard.tags) ? dashboard.tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [],
		description: typeof dashboard.description === 'string' ? dashboard.description : '',
		viewCount: dashboard.viewCount,
		likeCount: dashboard.likeCount,
		liked: dashboard.liked,
		...(author ? { author } : {}),
		created: dashboard.created,
		updated: dashboard.updated,
		editedAt: dashboard.editedAt,
		data: {
			dashboardName: dashboard.data?.dashboardName || 'Untitled Dashboard',
			items: (dashboard.data?.items ?? []).map((item: any, index) => ({
				id: typeof item?.id === 'string' ? item.id : `item-${index}`,
				kind: typeof item?.kind === 'string' ? item.kind : 'text'
			})) as Dashboard['data']['items']
		}
	} as Dashboard
}

function compactDiscoveryResponse(response: DiscoveryCategoryResponse): DiscoveryCategoryResponse {
	return {
		...response,
		items: response.items.map(compactDiscoveryDashboard)
	}
}

function emptyDiscoveryResponse(category: (typeof DISCOVERY_CATEGORIES)[number]): DiscoveryCategoryResponse {
	return {
		items: [],
		page: 1,
		perPage: category.limit,
		totalItems: 0,
		totalPages: 0
	}
}

async function fetchDiscoveryCategory(
	category: (typeof DISCOVERY_CATEGORIES)[number]
): Promise<DiscoveryCategoryResponse> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), DISCOVERY_FETCH_TIMEOUT_MS)
	const params = new URLSearchParams({
		visibility: 'public',
		sortBy: category.sortBy,
		page: '1',
		limit: String(category.limit)
	})
	if (category.timeFrame) params.set('timeFrame', category.timeFrame)

	try {
		const response = await fetch(`${FEATURES_SERVER}/dashboards/search?${params.toString()}`, {
			signal: controller.signal
		})
		if (!response.ok) throw new Error(`features-server responded with ${response.status}`)
		return compactDiscoveryResponse((await response.json()) as DiscoveryCategoryResponse)
	} finally {
		clearTimeout(timeout)
	}
}

async function fetchInitialDiscoveryCategories(): Promise<DiscoveryCategoriesInitialData> {
	const results = await Promise.allSettled(
		DISCOVERY_CATEGORIES.map(async (category) => ({
			key: category.key,
			data: await fetchDiscoveryCategory(category).catch(() => emptyDiscoveryResponse(category))
		}))
	)
	const categories: DiscoveryCategoriesInitialData = {}

	for (const result of results) {
		if (result.status === 'fulfilled') {
			categories[result.value.key] = result.value.data
		}
	}

	return categories
}

const getServerSidePropsHandler: GetServerSideProps<ProPageProps> = async ({ req, res }) => {
	const authToken = getAuthTokenFromRequest(req)
	res.setHeader('Cache-Control', authToken ? PRIVATE_PRO_CACHE_CONTROL : PUBLIC_PRO_CACHE_CONTROL)
	res.setHeader('Vary', 'Cookie, Authorization')

	return {
		props: {
			initialDiscoveryCategories: await fetchInitialDiscoveryCategories()
		}
	}
}

function ProPageContent({ initialDiscoveryCategories }: ProPageProps) {
	const { isAuthenticated, loaders, hasActiveSubscription } = useAuthContext()

	if (loaders.userLoading) {
		return (
			<Layout
				title="DefiLlama Pro - Advanced DeFi Analytics Dashboard"
				description="Build custom no-code DeFi dashboards with DefiLlama Pro. Combine TVL, fees, volume, and protocol metrics into personalized analytics views."
				canonicalUrl={`/pro`}
			>
				<ProDashboardLoader heading="Custom Dashboards" />
			</Layout>
		)
	}

	return (
		<Layout
			title="DefiLlama Pro - Advanced DeFi Analytics Dashboard"
			description="Build custom no-code DeFi dashboards with DefiLlama Pro. Combine TVL, fees, volume, and protocol metrics into personalized analytics views."
			canonicalUrl={`/pro`}
		>
			<ProContent
				hasActiveSubscription={hasActiveSubscription}
				isAuthenticated={isAuthenticated}
				initialDiscoveryCategories={initialDiscoveryCategories}
			/>
		</Layout>
	)
}

const tabs = ['my-dashboards', 'discover', 'favorites', 'following'] as const
type ProTab = (typeof tabs)[number]

const tabClassName =
	'shrink-0 border-b-2 border-(--form-control-border) px-4 py-1.75 whitespace-nowrap outline-hidden hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--old-blue)'

function getDashboardPagesToShow(selectedPage: number, totalPages: number): number[] {
	if (totalPages < 1) return []
	const clampedSelectedPage = Math.max(1, Math.min(selectedPage, totalPages))
	const pagesToShow =
		clampedSelectedPage === 1
			? [1, 2, Math.min(3, totalPages)]
			: clampedSelectedPage === totalPages
				? [Math.max(1, totalPages - 2), Math.max(1, totalPages - 1), totalPages]
				: [clampedSelectedPage - 1, clampedSelectedPage, clampedSelectedPage + 1]

	return pagesToShow.filter((n, i, arr) => n >= 1 && n <= totalPages && arr.indexOf(n) === i)
}

function ProContent({
	hasActiveSubscription,
	isAuthenticated,
	initialDiscoveryCategories
}: {
	hasActiveSubscription: boolean
	isAuthenticated: boolean
	initialDiscoveryCategories: DiscoveryCategoriesInitialData
}) {
	const router = useRouter()
	const { tab } = router.query
	const activeTab: ProTab = typeof tab === 'string' && tabs.includes(tab as ProTab) ? (tab as ProTab) : 'discover'

	const switchTab = (nextTab: ProTab) => {
		if (nextTab === activeTab) return
		void router.replace({ pathname: '/pro', query: { tab: nextTab } }, undefined, { shallow: true, scroll: false })
	}

	const [paywallState, setPaywallState] = useState<{ open: boolean; reason: PaywallReason }>({
		open: false,
		reason: 'pro-feature'
	})
	const paywallDialogStore = Ariakit.useDialogStore({
		open: paywallState.open,
		setOpen: (open) => setPaywallState((prev) => ({ ...prev, open }))
	})
	const showPaywall = (reason: PaywallReason) => {
		setSignupSource('pro-dashboard')
		setPaywallState({ open: true, reason })
	}
	const { deleteDashboard, handleCreateDashboard, handleGenerateDashboard } = useProDashboardDashboard()
	const { createDashboardDialogStore, showGenerateDashboardModal, setShowGenerateDashboardModal } = useProDashboardUI()
	const { canCreateDashboard } = useFreeTierStatus()
	const [comparisonPreset, setComparisonPreset] = useState<ComparisonPreset | null>(null)
	const createDialogOpen = Ariakit.useStoreState(createDashboardDialogStore, 'open')
	const dialogWasOpenRef = useRef(false)

	const selectedPage =
		typeof router.query.page === 'string' && !Number.isNaN(Number(router.query.page)) ? parseInt(router.query.page) : 1
	const {
		dashboards: myDashboards,
		isLoading: isLoadingMyDashboards,
		totalPages: myDashboardsTotalPages,
		totalItems: myDashboardsTotalItems,
		goToPage
	} = useMyDashboards({ page: selectedPage, limit: 20, enabled: isAuthenticated })

	useEffect(() => {
		if (createDialogOpen && !dialogWasOpenRef.current) {
			dialogWasOpenRef.current = true
			return
		}
		if (!createDialogOpen && dialogWasOpenRef.current) {
			let cancelled = false
			queueMicrotask(() => {
				if (cancelled) return
				setComparisonPreset(null)
			})
			dialogWasOpenRef.current = false

			return () => {
				cancelled = true
			}
		}
	}, [createDialogOpen])

	useEffect(() => {
		if (!router.isReady) return
		const comparison = router.query.comparison
		const items = router.query.items
		if (comparison !== 'protocols' || typeof items !== 'string') return
		if (comparisonPreset) return
		const parsedItems = items.split(',').flatMap((item) => {
			const trimmed = item.trim()
			return trimmed ? [trimmed] : []
		})
		const { comparison: _comparison, items: _items, step: _step, ...rest } = router.query
		let cancelled = false
		if (parsedItems.length > 0) {
			queueMicrotask(() => {
				if (cancelled) return
				setComparisonPreset({ comparisonType: 'protocols', items: parsedItems })
			})
		}
		createDashboardDialogStore.show()
		void router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })

		return () => {
			cancelled = true
		}
	}, [comparisonPreset, createDashboardDialogStore, router, router.isReady, router.query])

	const handleDeleteDashboard = async (dashboardId: string) => {
		await deleteDashboard(dashboardId)
	}

	return (
		<div className="flex flex-1 flex-col gap-4 pro-dashboard p-2 lg:px-0">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex overflow-x-auto" role="tablist" aria-label="Dashboard views">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'discover'}
						onClick={() => switchTab('discover')}
						data-active={activeTab === 'discover'}
						data-umami-event="dashboard-open-discover"
						className={tabClassName}
					>
						Discover
					</button>
					{isAuthenticated ? (
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'my-dashboards'}
							onClick={() => switchTab('my-dashboards')}
							data-active={activeTab === 'my-dashboards'}
							data-umami-event="dashboard-open-my-dashboards"
							className={tabClassName}
						>
							My Dashboards
						</button>
					) : null}
					{isAuthenticated ? (
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'favorites'}
							onClick={() => switchTab('favorites')}
							data-active={activeTab === 'favorites'}
							data-umami-event="dashboard-open-favorites"
							className={tabClassName}
						>
							Favorites
						</button>
					) : null}
					{isAuthenticated ? (
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'following'}
							onClick={() => switchTab('following')}
							data-active={activeTab === 'following'}
							data-umami-event="dashboard-open-following"
							className={tabClassName}
						>
							Following
						</button>
					) : null}
				</div>
				<div className="ml-auto flex flex-wrap justify-end gap-2">
					{
						<button
							type="button"
							onClick={
								!isAuthenticated
									? () => router.push('/pro/preview')
									: hasActiveSubscription
										? () => setShowGenerateDashboardModal(true)
										: () => showPaywall('llamaai')
							}
							data-umami-event="dashboard-llamaai-generate"
							className="flex items-center gap-1 rounded-md pro-btn-blue px-4 py-2"
						>
							<Icon name="sparkles" height={16} width={16} />
							Generate with LlamaAI
						</button>
					}
					<button
						type="button"
						onClick={
							!isAuthenticated
								? () => router.push('/pro/preview')
								: canCreateDashboard
									? () => createDashboardDialogStore.show()
									: () => showPaywall('dashboard-limit')
						}
						data-umami-event="dashboard-create"
						className="flex items-center gap-1 rounded-md pro-btn-purple px-4 py-2"
					>
						<Icon name="plus" height={16} width={16} />
						<span className="sm:hidden">Create</span>
						<span className="hidden sm:inline">Create New Dashboard</span>
					</button>
				</div>
			</div>

			<div
				role="tabpanel"
				aria-hidden={activeTab !== 'discover'}
				className={activeTab === 'discover' ? 'flex flex-col gap-4' : 'hidden'}
			>
				<DashboardDiscovery initialCategories={initialDiscoveryCategories} />
			</div>

			{isAuthenticated ? (
				<div
					role="tabpanel"
					aria-hidden={activeTab !== 'my-dashboards'}
					className={activeTab === 'my-dashboards' ? 'flex flex-col gap-4' : 'hidden'}
				>
					{!isLoadingMyDashboards ? (
						<p className="text-xs text-(--text-label)">
							Showing {myDashboards.length} of {myDashboardsTotalItems} dashboards
						</p>
					) : null}

					<DashboardList
						dashboards={myDashboards}
						isLoading={isLoadingMyDashboards}
						onCreateNew={() => createDashboardDialogStore.show()}
						onDeleteDashboard={(dashboardId) => {
							void handleDeleteDashboard(dashboardId)
						}}
					/>

					{myDashboardsTotalPages > 1 ? (
						<div className="flex flex-nowrap items-center justify-center gap-2 overflow-x-auto">
							<button
								type="button"
								onClick={() => goToPage(1)}
								disabled={selectedPage < 3}
								className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
							>
								<Icon name="chevrons-left" height={16} width={16} />
							</button>

							<button
								type="button"
								onClick={() => goToPage(Math.max(1, selectedPage - 1))}
								disabled={selectedPage === 1}
								className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
							>
								<Icon name="chevron-left" height={16} width={16} />
							</button>

							{getDashboardPagesToShow(selectedPage, myDashboardsTotalPages).map((pageNum) => {
								const isActive = selectedPage === pageNum
								return (
									<button
										type="button"
										key={`my-dashboard-page-${pageNum}`}
										onClick={() => goToPage(pageNum)}
										data-active={isActive}
										className="h-[32px] min-w-[32px] shrink-0 rounded-md px-2 py-1.5 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										{pageNum}
									</button>
								)
							})}

							<button
								type="button"
								onClick={() => goToPage(Math.min(myDashboardsTotalPages, selectedPage + 1))}
								disabled={selectedPage === myDashboardsTotalPages}
								className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
							>
								<Icon name="chevron-right" height={16} width={16} />
							</button>
							<button
								type="button"
								onClick={() => goToPage(myDashboardsTotalPages)}
								disabled={selectedPage > myDashboardsTotalPages - 2}
								className="h-[32px] min-w-[32px] rounded-md px-2 py-1.5 text-(--text-label) disabled:hidden"
							>
								<Icon name="chevrons-right" height={16} width={16} />
							</button>
						</div>
					) : null}
				</div>
			) : null}

			{isAuthenticated ? (
				<div
					role="tabpanel"
					aria-hidden={activeTab !== 'favorites'}
					className={activeTab === 'favorites' ? 'flex flex-col gap-4' : 'hidden'}
				>
					<LikedDashboards />
				</div>
			) : null}

			{isAuthenticated ? (
				<div
					role="tabpanel"
					aria-hidden={activeTab !== 'following'}
					className={activeTab === 'following' ? 'flex flex-col gap-4' : 'hidden'}
				>
					<FollowingShelves />
				</div>
			) : null}

			<Suspense fallback={<></>}>
				<CreateDashboardPicker
					dialogStore={createDashboardDialogStore}
					onCreate={(data) => {
						void handleCreateDashboard(data)
					}}
					comparisonPreset={comparisonPreset}
				/>
			</Suspense>

			<Suspense fallback={<></>}>
				<GenerateDashboardModal
					isOpen={showGenerateDashboardModal}
					onClose={() => setShowGenerateDashboardModal(false)}
					onGenerate={(prompt) => {
						void handleGenerateDashboard(prompt)
					}}
				/>
			</Suspense>

			{paywallState.open ? (
				<DashboardPaywallModal dialogStore={paywallDialogStore} reason={paywallState.reason} />
			) : null}
		</div>
	)
}

export default function HomePage({
	initialDiscoveryCategories
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	return (
		<AppMetadataProvider>
			<ProDashboardAPIProvider>
				<ProPageContent initialDiscoveryCategories={initialDiscoveryCategories} />
			</ProDashboardAPIProvider>
		</AppMetadataProvider>
	)
}

export const getServerSideProps = withServerSidePropsTelemetry('/pro', getServerSidePropsHandler)
