import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { AppMetadataProvider } from './AppMetadataContext'
import { ChartGrid } from './components/ChartGrid'
import { CopyDashboardLinkButton } from './components/CopyDashboardLinkButton'
import { CustomTimePeriodPicker } from './components/CustomTimePeriodPicker'
import { EmptyState } from './components/EmptyState'
import { LikeDashboardButton } from './components/LikeDashboardButton'
import type { UnifiedTableFocusSection } from './components/UnifiedTable/types'
import {
	type AIGeneratedData,
	type TimePeriod,
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

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)
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

function ProDashboardContent() {
	const [showAddModal, setShowAddModal] = useState<boolean>(false)
	const [editItem, setEditItem] = useState<DashboardItemConfig | null>(null)
	const [initialUnifiedFocusSection, setInitialUnifiedFocusSection] = useState<UnifiedTableFocusSection | undefined>()
	const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })
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
			item?.kind === 'unlocks-pie'
	)

	const currentRatingSession = getCurrentRatingSession()

	const openAddModal = () => {
		setShowAddModal(true)
	}

	const handleEditItemModal = (item: DashboardItemConfig, focusSection?: UnifiedTableFocusSection) => {
		setEditItem(item)
		setInitialUnifiedFocusSection(focusSection)
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

			<div className="grid grid-cols-12 gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 md:gap-4 md:p-4">
				<div className="col-span-full flex flex-col gap-2 md:col-span-8">
					<div className="flex flex-col gap-1">
						<span className="flex flex-wrap items-center gap-2">
							<h1 className="text-lg font-semibold">{dashboardName}</h1>
							{currentDashboard?.visibility === 'public' ? (
								<p className="flex items-center gap-1 rounded-md bg-pro-green-100 px-2 py-1.25 text-xs text-pro-green-400 dark:bg-pro-green-300/20 dark:text-pro-green-200">
									<Icon name="earth" height={12} width={12} />
									<span>Public </span>
								</p>
							) : (
								<p className="flex items-center gap-1 rounded-md bg-pro-gold-100 px-2 py-1.25 text-xs text-pro-gold-400 dark:bg-pro-gold-300/20 dark:text-pro-gold-200">
									<Icon name="key" height={12} width={12} />
									<span>Private</span>
								</p>
							)}
							{currentDashboard?.aiGenerated && Object.keys(currentDashboard.aiGenerated).length > 0 ? (
								<p className="flex items-center gap-1 rounded-md bg-pro-blue-100 px-2 py-1.25 text-xs text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200">
									<Icon name="sparkles" height={14} width={14} />
									<span className="text-xs font-medium">AI Generated</span>
								</p>
							) : null}
						</span>
						<p className="text-sm text-(--text-form)">{dashboardDescription}</p>
					</div>
					{dashboardTags.length > 0 && (
						<div className="flex flex-nowrap items-start gap-1 text-(--text-disabled)">
							<Tooltip content="Tags">
								<Icon name="tag" height={16} width={16} className="mt-1" />
							</Tooltip>
							<div className="flex flex-wrap items-center gap-1">
								{dashboardTags.map((tag) => (
									<p key={tag} className="rounded-md border border-(--cards-border) px-1 py-0.5 text-xs">
										{tag}
									</p>
								))}
							</div>
						</div>
					)}
				</div>
				<div className="col-span-full flex flex-col gap-2 md:col-span-4 md:gap-4">
					<div className="flex flex-wrap items-center justify-end gap-2">
						{isAuthenticated ? (
							<>
								{isReadOnly ? (
									<button
										onClick={() => {
											if (hasActiveSubscription) {
												copyDashboard()
											} else {
												subscribeModalStore.show()
											}
										}}
										className="flex items-center gap-1 rounded-md pro-btn-blue-outline px-4 py-1"
									>
										<Icon name="copy" height={16} width={16} />
										<span>Copy Dashboard</span>
									</button>
								) : null}
								<button
									onClick={() => {
										createDashboardDialogStore.show()
									}}
									className="flex items-center gap-1 rounded-md pro-btn-purple-outline px-4 py-1"
								>
									<Icon name="plus" height={16} width={16} />
									<span>New Dashboard</span>
								</button>
							</>
						) : null}
					</div>
					<div className="mt-auto ml-auto flex flex-wrap items-center gap-1">
						<Tooltip
							content="Views"
							render={<p />}
							className="flex items-center gap-1 rounded-md border border-(--cards-border) px-1.5 py-1 text-xs text-(--text-disabled)"
						>
							<Icon name="eye" height={14} width={14} />
							<span>{currentDashboard?.viewCount || 0}</span>
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

			{currentDashboard?.aiGenerated && (
				<AIGenerationHistory aiGenerated={currentDashboard.aiGenerated as AIGeneratedData} />
			)}

			{currentRatingSession && !isReadOnly && (
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
			)}

			{!isReadOnly && (
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<Tooltip
						content={!hasChartItems ? 'Add chart items to enable time period selection' : null}
						placement="bottom"
					>
						<div className="order-2 flex gap-0 overflow-x-auto md:order-1">
							{timePeriods.map((period) => (
								<button
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
						{dashboardId && (
							<button
								onClick={() => setShowSettingsModal(true)}
								className="hidden rounded-md pro-glass pro-hover-bg p-2 transition-colors md:flex"
								title="Dashboard Settings"
							>
								<Icon name="settings" height={20} width={20} className="pro-text1" />
							</button>
						)}
						{items.length > 0 && (
							<button
								className="hidden animate-ai-glow items-center gap-2 rounded-md pro-btn-blue-outline px-4 py-2 text-base whitespace-nowrap md:flex"
								onClick={() => setShowIterateDashboardModal(true)}
								title="Edit with LlamaAI"
							>
								<Icon name="sparkles" height={16} width={16} />
								Edit with LlamaAI
							</button>
						)}
						{canUndo && (
							<button
								className="hidden items-center gap-2 rounded-md border pro-border pro-hover-bg px-4 py-2 text-base whitespace-nowrap pro-text2 transition-colors hover:pro-text1 md:flex"
								onClick={undoAIGeneration}
								title="Undo AI changes"
							>
								<Icon name="arrow-left" height={16} width={16} />
								Undo
							</button>
						)}

						<button
							className="hidden items-center gap-2 rounded-md pro-btn-blue px-4 py-2 text-base whitespace-nowrap md:flex"
							onClick={openAddModal}
							disabled={isReadOnly}
						>
							<Icon name="plus" height={16} width={16} />
							Add Item
						</button>
					</div>
				</div>
			)}

			{items.length > 0 && <ChartGrid onAddChartClick={openAddModal} onEditItem={handleEditItemModal} />}

			<Suspense fallback={<></>}>
				<AddChartModal
					isOpen={showAddModal}
					onClose={() => {
						setShowAddModal(false)
						setEditItem(null)
						setInitialUnifiedFocusSection(undefined)
					}}
					editItem={editItem}
					initialUnifiedFocusSection={initialUnifiedFocusSection}
				/>
			</Suspense>

			{!protocolsLoading && items.length === 0 && (
				<EmptyState
					onAddChart={openAddModal}
					onGenerateWithAI={() => setShowIterateDashboardModal(true)}
					isReadOnly={isReadOnly}
				/>
			)}

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
					onSave={saveDashboard}
					onDelete={deleteDashboard}
				/>
			</Suspense>

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
					onGenerate={handleIterateDashboard}
				/>
			</Suspense>

			{shouldRenderModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
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
