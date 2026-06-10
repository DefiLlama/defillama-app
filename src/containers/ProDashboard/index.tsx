import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscription/auth'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { AppMetadataProvider } from './AppMetadataContext'
import { ChartGrid } from './components/ChartGrid'
import { CopyDashboardLinkButton } from './components/CopyDashboardLinkButton'
import { CustomTimePeriodPicker } from './components/CustomTimePeriodPicker'
import { EmptyState } from './components/EmptyState'
import { LikeDashboardButton } from './components/LikeDashboardButton'
import type { UnifiedTableFocusSection } from './components/UnifiedTable/types'
import { useFreeTierStatus } from './hooks'
import {
	type AIGeneratedData,
	type TimePeriod,
	useDashboardMode,
	useProDashboardCatalog,
	useProDashboardDashboard,
	useProDashboardItemsState,
	useProDashboardPermissions,
	useProDashboardServerAppMetadata,
	useProDashboardTime,
	useProDashboardUI
} from './ProDashboardAPIContext'
import type { DashboardItemConfig } from './types'

const DemoPreview = lazy(() => import('./components/DemoPreview').then((m) => ({ default: m.DemoPreview })))

import { DashboardPaywallModal, type PaywallReason } from './components/DashboardPaywallModal'
const AddChartModal = lazy(() => import('./components/AddChartModal').then((m) => ({ default: m.AddChartModal })))
const CreateDashboardPicker = lazy(() =>
	import('./components/CreateDashboardPicker').then((m) => ({ default: m.CreateDashboardPicker }))
)
const DashboardSettingsModal = lazy(() =>
	import('./components/DashboardSettingsModal').then((m) => ({ default: m.DashboardSettingsModal }))
)
const GenerateDashboardModal = lazy(() =>
	import('./components/GenerateDashboardModal').then((m) => ({ default: m.GenerateDashboardModal }))
)
const AIGenerationHistory = lazy(() =>
	import('./components/AIGenerationHistory').then((m) => ({ default: m.AIGenerationHistory }))
)
const Rating = lazy(() => import('./components/Rating').then((m) => ({ default: m.Rating })))

const COUNT_FORMATTER = new Intl.NumberFormat('en-US')

function formatCount(value: number | undefined): string {
	return COUNT_FORMATTER.format(value ?? 0)
}

function ProDashboardContent() {
	const [showAddModal, setShowAddModal] = useState<boolean>(false)
	const [editModalState, setEditModalState] = useState<{
		item: DashboardItemConfig | null
		focusSection?: UnifiedTableFocusSection
	}>({ item: null, focusSection: undefined })
	const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
	const { isAuthenticated, hasActiveSubscription, user } = useAuthContext()
	const { canCreateDashboard } = useFreeTierStatus()
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
	const router = useRouter()
	const mode = useDashboardMode()
	const { items } = useProDashboardItemsState()
	const { protocolsLoading } = useProDashboardCatalog()
	const { timePeriod, customTimePeriod, setTimePeriod, setCustomTimePeriod } = useProDashboardTime()
	const { isReadOnly } = useProDashboardPermissions()
	const {
		dashboardName,
		setDashboardName,
		dashboardId,
		saveDashboard,
		copyDashboard,
		dashboardVisibility,
		dashboardTags,
		dashboardDescription,
		currentDashboard,
		setDashboardVisibility,
		setDashboardTags,
		setDashboardDescription,
		handleCreateDashboard,
		handleGenerateDashboard,
		handleIterateDashboard,
		getCurrentRatingSession,
		submitRating,
		skipRating,
		dismissRating,
		undoAIGeneration,
		canUndo,
		deleteDashboard
	} = useProDashboardDashboard()
	const {
		createDashboardDialogStore,
		showGenerateDashboardModal,
		setShowGenerateDashboardModal,
		showIterateDashboardModal,
		setShowIterateDashboardModal
	} = useProDashboardUI()

	const timePeriods: { value: TimePeriod; label: string }[] = [
		{ value: '30d', label: '30d' },
		{ value: '90d', label: '90d' },
		{ value: '365d', label: '365d' },
		{ value: 'ytd', label: 'YTD' },
		{ value: '3y', label: '3Y' },
		{ value: 'all', label: 'All' }
	]

	const hasChartItems = items?.some(
		(item) =>
			item?.kind === 'chart' ||
			item?.kind === 'multi' ||
			item?.kind === 'builder' ||
			item?.kind === 'yields' ||
			item?.kind === 'stablecoins' ||
			item?.kind === 'stablecoin-asset' ||
			item?.kind === 'advanced-tvl' ||
			item?.kind === 'advanced-borrowed' ||
			item?.kind === 'income-statement' ||
			item?.kind === 'unlocks-schedule' ||
			item?.kind === 'unlocks-pie' ||
			item?.kind === 'llamaai-chart'
	)

	const currentRatingSession = getCurrentRatingSession()

	const openAddModal = () => {
		setShowAddModal(true)
	}

	const handleEditItemModal = (item: DashboardItemConfig, focusSection?: UnifiedTableFocusSection) => {
		setEditModalState({ item, focusSection })
		setShowAddModal(true)
	}

	if (!isAuthenticated && !hasActiveSubscription && dashboardVisibility !== 'public') {
		return (
			<Suspense
				fallback={
					<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1" />
				}
			>
				<DemoPreview />
			</Suspense>
		)
	}

	return (
		<div className="flex flex-1 flex-col gap-2 pro-dashboard p-2 lg:px-0">
			<BasicLink
				href="/pro"
				className="mr-auto mb-2 flex items-center gap-2 text-(--text-label) hover:text-(--link-text)"
			>
				<Icon name="arrow-left" height={16} width={16} />
				Back to Dashboards
			</BasicLink>

			<div className="overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="grid gap-5 px-4 py-4 md:px-5 md:py-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,480px)] xl:items-start">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<h1 className="text-[clamp(1.375rem,1.1rem+0.7vw,2rem)] leading-tight font-semibold text-(--text-primary)">
								{dashboardName}
							</h1>
							{dashboardVisibility === 'public' ? (
								<p className="inline-flex items-center gap-1.5 rounded-md border border-pro-green-400/20 bg-pro-green-100 px-2 py-1 text-xs font-medium text-pro-green-400 dark:bg-pro-green-300/12 dark:text-pro-green-200">
									<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
									Public
								</p>
							) : (
								<p className="inline-flex items-center gap-1.5 rounded-md border border-pro-gold-400/20 bg-pro-gold-100 px-2 py-1 text-xs font-medium text-pro-gold-400 dark:bg-pro-gold-300/12 dark:text-pro-gold-200">
									<Icon name="key" height={12} width={12} />
									Private
								</p>
							)}
							{currentDashboard?.aiGenerated && Object.keys(currentDashboard.aiGenerated).length > 0 ? (
								<p className="inline-flex items-center gap-1.5 rounded-md border border-pro-blue-400/20 bg-pro-blue-100 px-2 py-1 text-xs font-medium text-pro-blue-400 dark:bg-pro-blue-300/12 dark:text-pro-blue-200">
									<Icon name="sparkles" height={13} width={13} />
									AI Generated
								</p>
							) : null}
						</div>
						{dashboardDescription ? (
							<p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-form)">{dashboardDescription}</p>
						) : null}
						{dashboardTags.length > 0 ? (
							<ul aria-label="Dashboard tags" className="mt-4 flex flex-wrap gap-1.5">
								{dashboardTags.map((tag) => (
									<li
										key={tag}
										className="rounded-md border border-(--cards-border) bg-(--bg-secondary)/50 px-2 py-1 text-xs text-(--text-label)"
									>
										{tag}
									</li>
								))}
							</ul>
						) : null}
					</div>
					<div className="flex min-w-0 flex-col gap-3 xl:items-end">
						<div className="flex flex-wrap items-center gap-2 xl:justify-end">
							{isAuthenticated ? (
								<>
									{mode === 'view' && dashboardId && currentDashboard?.user === user?.id ? (
										<button
											type="button"
											onClick={() => {
												void router.push(`/pro/${dashboardId}/edit`)
											}}
											className="flex items-center gap-1 rounded-md pro-btn-purple px-3 py-1.5 text-sm"
										>
											<Icon name="pencil" height={16} width={16} />
											<span>Edit</span>
										</button>
									) : null}
									{mode === 'edit' && dashboardId ? (
										<button
											type="button"
											onClick={() => {
												void router.push(`/pro/${dashboardId}`)
											}}
											className="flex items-center gap-1 rounded-md pro-btn-purple px-3 py-1.5 text-sm"
										>
											<Icon name="check" height={16} width={16} />
											<span>Done</span>
										</button>
									) : null}
									{isReadOnly ? (
										<button
											type="button"
											onClick={() => {
												if (canCreateDashboard) {
													void copyDashboard()
												} else {
													showPaywall('dashboard-limit')
												}
											}}
											className="flex items-center gap-1 rounded-md pro-btn-blue-outline px-3 py-1.5 text-sm"
										>
											<Icon name="copy" height={16} width={16} />
											<span>Copy Dashboard</span>
										</button>
									) : null}
									<button
										type="button"
										onClick={() => {
											if (canCreateDashboard) {
												createDashboardDialogStore.show()
											} else {
												showPaywall('dashboard-limit')
											}
										}}
										className="flex items-center gap-1 rounded-md pro-btn-purple-outline px-3 py-1.5 text-sm"
									>
										<Icon name="plus" height={16} width={16} />
										<span>New Dashboard</span>
									</button>
								</>
							) : null}
						</div>
						<div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
							<Tooltip
								content="Views"
								render={<p />}
								className="inline-flex items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--bg-secondary)/45 px-2.5 py-1.5 text-xs font-medium text-(--text-label)"
							>
								<Icon name="eye" height={14} width={14} />
								<span className="tabular-nums">{formatCount(currentDashboard?.viewCount)}</span>
								<span className="sr-only">Views</span>
							</Tooltip>
							<LikeDashboardButton
								currentDashboard={currentDashboard}
								dashboardVisibility={dashboardVisibility}
								dashboardId={dashboardId}
							/>
							<CopyDashboardLinkButton dashboardVisibility={dashboardVisibility} dashboardId={dashboardId} />
						</div>
					</div>
				</div>
			</div>

			{currentDashboard?.aiGenerated ? (
				<AIGenerationHistory aiGenerated={currentDashboard.aiGenerated as AIGeneratedData} />
			) : null}

			{currentRatingSession && !isReadOnly ? (
				<Suspense fallback={<></>}>
					<Rating
						sessionId={currentRatingSession.sessionId}
						mode={currentRatingSession.mode}
						variant="banner"
						prompt={currentRatingSession.prompt}
						onRate={submitRating}
						onSkip={skipRating}
						onDismiss={dismissRating}
					/>
				</Suspense>
			) : null}

			{hasChartItems || mode === 'edit' ? (
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<Tooltip
						content={!hasChartItems ? 'Add chart items to enable time period selection' : null}
						placement="bottom"
					>
						<div className="order-2 flex gap-0 overflow-x-auto md:order-1">
							{timePeriods.map((period) => (
								<button
									type="button"
									key={period.value}
									className={`-ml-px flex-1 rounded-none border px-3 py-1.5 text-sm font-medium transition-colors duration-200 first:ml-0 first:rounded-l-md md:flex-initial md:px-4 md:py-2 ${
										timePeriod === period.value
											? 'pro-border pro-btn-blue'
											: 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
									} ${!hasChartItems ? 'cursor-not-allowed opacity-50' : ''}`}
									onClick={() => hasChartItems && setTimePeriod(period.value)}
									disabled={!hasChartItems}
								>
									{period.label}
								</button>
							))}
							<CustomTimePeriodPicker
								isActive={timePeriod === 'custom'}
								customPeriod={customTimePeriod}
								onApply={(period) => setCustomTimePeriod(period)}
								onClear={() => setTimePeriod('365d')}
								disabled={!hasChartItems}
							/>
						</div>
					</Tooltip>
					<div className="order-3 flex items-center gap-2">
						{!isReadOnly && dashboardId ? (
							<button
								type="button"
								onClick={() => setShowSettingsModal(true)}
								className="hidden rounded-md pro-glass pro-hover-bg p-2 transition-colors md:flex"
								title="Dashboard Settings"
							>
								<Icon name="settings" height={20} width={20} className="pro-text1" />
							</button>
						) : null}
						{!isReadOnly && items.length > 0 ? (
							<button
								type="button"
								className="hidden animate-ai-glow items-center gap-2 rounded-md pro-btn-blue-outline px-4 py-2 text-base whitespace-nowrap md:flex"
								onClick={() => {
									if (hasActiveSubscription) {
										setShowIterateDashboardModal(true)
									} else {
										showPaywall('llamaai')
									}
								}}
								title="Edit with LlamaAI"
							>
								<Icon name="sparkles" height={16} width={16} />
								Edit with LlamaAI
							</button>
						) : null}
						{!isReadOnly && canUndo ? (
							<button
								type="button"
								className="hidden items-center gap-2 rounded-md border pro-border pro-hover-bg px-4 py-2 text-base whitespace-nowrap pro-text2 transition-colors hover:pro-text1 md:flex"
								onClick={() => {
									void undoAIGeneration()
								}}
								title="Undo AI changes"
							>
								<Icon name="arrow-left" height={16} width={16} />
								Undo
							</button>
						) : null}

						{!isReadOnly ? (
							<button
								type="button"
								className="hidden items-center gap-2 rounded-md pro-btn-blue px-4 py-2 text-base whitespace-nowrap md:flex"
								onClick={openAddModal}
								disabled={isReadOnly}
							>
								<Icon name="plus" height={16} width={16} />
								Add Item
							</button>
						) : null}
					</div>
				</div>
			) : null}

			{items.length > 0 ? <ChartGrid onAddChartClick={openAddModal} onEditItem={handleEditItemModal} /> : null}

			<Suspense fallback={<></>}>
				{showAddModal ? (
					<AddChartModal
						key={editModalState.item?.id ?? 'new-dashboard-item'}
						isOpen
						onClose={() => {
							setShowAddModal(false)
							setEditModalState({ item: null, focusSection: undefined })
						}}
						editItem={editModalState.item}
						initialUnifiedFocusSection={editModalState.focusSection}
					/>
				) : null}
			</Suspense>

			{!protocolsLoading && items.length === 0 ? (
				<EmptyState
					onAddChart={openAddModal}
					onGenerateWithAI={
						hasActiveSubscription ? () => setShowIterateDashboardModal(true) : () => showPaywall('llamaai')
					}
					isReadOnly={isReadOnly}
				/>
			) : null}

			<Suspense fallback={<></>}>
				<DashboardSettingsModal
					isOpen={showSettingsModal}
					onClose={() => setShowSettingsModal(false)}
					dashboardName={dashboardName}
					visibility={dashboardVisibility}
					tags={dashboardTags}
					description={dashboardDescription}
					dashboardId={dashboardId}
					onDashboardNameChange={setDashboardName}
					onVisibilityChange={setDashboardVisibility}
					onTagsChange={setDashboardTags}
					onDescriptionChange={setDashboardDescription}
					onSave={(overrides) => {
						void saveDashboard(overrides)
					}}
					onDelete={deleteDashboard}
				/>
			</Suspense>

			<Suspense fallback={<></>}>
				<CreateDashboardPicker
					dialogStore={createDashboardDialogStore}
					onCreate={(data) => {
						void handleCreateDashboard(data)
					}}
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

			<Suspense fallback={<></>}>
				<GenerateDashboardModal
					isOpen={showIterateDashboardModal}
					onClose={() => setShowIterateDashboardModal(false)}
					mode="iterate"
					existingDashboard={{
						dashboardName,
						visibility: dashboardVisibility,
						tags: dashboardTags,
						description: dashboardDescription,
						items,
						aiGenerated: currentDashboard?.aiGenerated
					}}
					onGenerate={(prompt) => {
						void handleIterateDashboard(prompt)
					}}
				/>
			</Suspense>

			{paywallState.open ? (
				<DashboardPaywallModal dialogStore={paywallDialogStore} reason={paywallState.reason} />
			) : null}
		</div>
	)
}

export default function ProDashboard() {
	const serverAppMetadata = useProDashboardServerAppMetadata()
	return (
		<AppMetadataProvider initialData={serverAppMetadata}>
			<ProDashboardContent />
		</AppMetadataProvider>
	)
}
