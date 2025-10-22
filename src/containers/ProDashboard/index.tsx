import { lazy, Suspense, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { AppMetadataProvider } from './AppMetadataContext'
import { ChartGrid } from './components/ChartGrid'
import { EmptyState } from './components/EmptyState'
import { useDashboardEngagement } from './hooks/useDashboardEngagement'
import { AIGeneratedData, TimePeriod, useProDashboard } from './ProDashboardAPIContext'
import { Dashboard } from './services/DashboardAPI'
import { DashboardItemConfig } from './types'

const DemoPreview = lazy(() => import('./components/DemoPreview').then((m) => ({ default: m.DemoPreview })))

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)
const AddChartModal = lazy(() => import('./components/AddChartModal').then((m) => ({ default: m.AddChartModal })))
const CreateDashboardModal = lazy(() =>
	import('./components/CreateDashboardModal').then((m) => ({ default: m.CreateDashboardModal }))
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
	const [isEditingName, setIsEditingName] = useState<boolean>(false)
	const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
	const [showSubscribeModal, setShowSubscribeModal] = useState<boolean>(false)
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const { isAuthenticated } = useAuthContext()
	const {
		items,
		protocolsLoading,
		timePeriod,
		setTimePeriod,
		dashboardName,
		setDashboardName,
		dashboardId,
		createNewDashboard,
		deleteDashboard,
		saveDashboard,
		saveDashboardName,
		isReadOnly,
		copyDashboard,
		dashboardVisibility,
		dashboardTags,
		dashboardDescription,
		currentDashboard,
		setDashboardVisibility,
		setDashboardTags,
		setDashboardDescription,
		createDashboardDialogStore,
		showGenerateDashboardModal,
		setShowGenerateDashboardModal,
		showIterateDashboardModal,
		setShowIterateDashboardModal,
		handleCreateDashboard,
		handleGenerateDashboard,
		handleIterateDashboard,
		getCurrentRatingSession,
		submitRating,
		skipRating,
		dismissRating,
		undoAIGeneration,
		canUndo
	} = useProDashboard()

	const timePeriods: { value: TimePeriod; label: string }[] = [
		{ value: '30d', label: '30d' },
		{ value: '90d', label: '90d' },
		{ value: '365d', label: '365d' },
		{ value: 'ytd', label: 'YTD' },
		{ value: '3y', label: '3Y' },
		{ value: 'all', label: 'All' }
	]

	const hasChartItems = items?.some(
		(item) => item?.kind === 'chart' || item?.kind === 'multi' || item?.kind === 'builder' || item?.kind === 'yields'
	)

	const currentRatingSession = getCurrentRatingSession()

	const handleNameSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		setIsEditingName(false)
		saveDashboardName()
	}

	const handleNameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			setIsEditingName(false)
			saveDashboardName()
		} else if (e.key === 'Escape') {
			setIsEditingName(false)
			saveDashboardName()
		}
	}

	if (!isAuthenticated && subscription?.status !== 'active' && dashboardVisibility !== 'public') {
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
		<div className="pro-dashboard flex flex-1 flex-col gap-2 p-2 lg:px-0">
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
								<p className="bg-pro-green-100 text-pro-green-400 dark:bg-pro-green-300/20 dark:text-pro-green-200 flex items-center gap-1 rounded-md px-2 py-1.25 text-xs">
									<Icon name="earth" height={12} width={12} />
									<span>Public </span>
								</p>
							) : (
								<p className="bg-pro-gold-100 text-pro-gold-400 dark:bg-pro-gold-300/20 dark:text-pro-gold-200 flex items-center gap-1 rounded-md px-2 py-1.25 text-xs">
									<Icon name="key" height={12} width={12} />
									<span>Private</span>
								</p>
							)}
							{currentDashboard?.aiGenerated && Object.keys(currentDashboard.aiGenerated).length > 0 ? (
								<p className="bg-pro-blue-100 text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200 flex items-center gap-1 rounded-md px-2 py-1.25 text-xs">
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
											if (subscription?.status === 'active') {
												copyDashboard()
											} else {
												setShowSubscribeModal(true)
											}
										}}
										className="pro-btn-blue-outline flex items-center gap-1 rounded-md px-4 py-1"
									>
										<Icon name="copy" height={16} width={16} />
										<span>Copy Dashboard</span>
									</button>
								) : null}
								<button
									onClick={() => {
										createNewDashboard()
									}}
									className="pro-btn-purple-outline flex items-center gap-1 rounded-md px-4 py-1"
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
									className={`-ml-px flex-1 rounded-none border px-3 py-1.5 text-sm font-medium transition-colors duration-200 first:ml-0 first:rounded-l-md last:rounded-r-md md:flex-initial md:px-4 md:py-2 ${
										timePeriod === period.value
											? 'pro-border pro-btn-blue'
											: 'pro-border pro-text2 hover:pro-text1 pro-hover-bg'
									} ${!hasChartItems ? 'cursor-not-allowed opacity-50' : ''}`}
									onClick={() => hasChartItems && setTimePeriod(period.value)}
									disabled={!hasChartItems}
								>
									{period.label}
								</button>
							))}
						</div>
					</Tooltip>
					<div className="order-3 flex items-center gap-2">
						{dashboardId && (
							<button
								onClick={() => setShowSettingsModal(true)}
								className="pro-glass pro-hover-bg hidden rounded-md p-2 transition-colors md:flex"
								title="Dashboard Settings"
							>
								<Icon name="settings" height={20} width={20} className="pro-text1" />
							</button>
						)}
						{items.length > 0 && (
							<button
								className="animate-ai-glow pro-btn-blue-outline hidden items-center gap-2 rounded-md px-4 py-2 text-base whitespace-nowrap md:flex"
								onClick={() => setShowIterateDashboardModal(true)}
								title="Edit with LlamaAI"
							>
								<Icon name="sparkles" height={16} width={16} />
								Edit with LlamaAI
							</button>
						)}
						{canUndo && (
							<button
								className="pro-border pro-text2 hover:pro-text1 pro-hover-bg hidden items-center gap-2 rounded-md border px-4 py-2 text-base whitespace-nowrap transition-colors md:flex"
								onClick={undoAIGeneration}
								title="Undo AI changes"
							>
								<Icon name="arrow-left" height={16} width={16} />
								Undo
							</button>
						)}

						<button
							className="pro-btn-blue hidden items-center gap-2 rounded-md px-4 py-2 text-base whitespace-nowrap md:flex"
							onClick={() => setShowAddModal(true)}
							disabled={isReadOnly}
						>
							<Icon name="plus" height={16} width={16} />
							Add Item
						</button>
					</div>
				</div>
			)}

			{items.length > 0 && (
				<ChartGrid
					onAddChartClick={() => setShowAddModal(true)}
					onEditItem={(item) => {
						setEditItem(item)
						setShowAddModal(true)
					}}
				/>
			)}

			<Suspense fallback={<></>}>
				<AddChartModal
					isOpen={showAddModal}
					onClose={() => {
						setShowAddModal(false)
						setEditItem(null)
					}}
					editItem={editItem}
				/>
			</Suspense>

			{!protocolsLoading && items.length === 0 && (
				<EmptyState
					onAddChart={() => setShowAddModal(true)}
					onGenerateWithAI={() => setShowIterateDashboardModal(true)}
					isReadOnly={isReadOnly}
				/>
			)}

			<Suspense fallback={<></>}>
				<DashboardSettingsModal
					isOpen={showSettingsModal}
					onClose={() => setShowSettingsModal(false)}
					visibility={dashboardVisibility}
					tags={dashboardTags}
					description={dashboardDescription}
					onVisibilityChange={setDashboardVisibility}
					onTagsChange={setDashboardTags}
					onDescriptionChange={setDashboardDescription}
					onSave={saveDashboard}
				/>
			</Suspense>

			<Suspense fallback={<></>}>
				<CreateDashboardModal dialogStore={createDashboardDialogStore} onCreate={handleCreateDashboard} />
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

			<Suspense fallback={<></>}>
				<SubscribeProModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)} />
			</Suspense>
		</div>
	)
}

export default function ProDashboard() {
	return (
		<AppMetadataProvider>
			<ProDashboardContent />
		</AppMetadataProvider>
	)
}

const LikeDashboardButton = ({
	currentDashboard,
	dashboardVisibility,
	dashboardId
}: {
	currentDashboard: Dashboard
	dashboardVisibility: 'private' | 'public'
	dashboardId: string
}) => {
	const { isAuthenticated } = useAuthContext()
	const { toggleLike, isLiking, liked, likeCount } = useDashboardEngagement(dashboardId)
	if (dashboardVisibility === 'private') return null
	const isLiked = currentDashboard?.liked ? true : false
	return (
		<Tooltip
			content={currentDashboard?.liked ? 'Unlike dashboard' : 'Like dashboard'}
			render={<button onClick={() => toggleLike()} disabled={isLiking || !isAuthenticated} />}
			className={`hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent`}
		>
			{isLiking ? (
				<LoadingSpinner size={14} />
			) : (
				<Icon
					name="star"
					height={14}
					width={14}
					className={(liked ?? isLiked) ? 'fill-current text-yellow-400' : 'fill-none'}
				/>
			)}
			<span>{likeCount || currentDashboard?.likeCount || 0}</span>
			<span className="sr-only">Likes</span>
		</Tooltip>
	)
}

const CopyDashboardLinkButton = ({
	dashboardVisibility,
	dashboardId
}: {
	dashboardVisibility: 'private' | 'public'
	dashboardId: string
}) => {
	const [copied, setCopied] = useState(false)
	const copy = () => {
		const url = `${window.location.origin}/pro/${dashboardId}`
		navigator.clipboard.writeText(url)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}
	if (dashboardVisibility === 'private') {
		return (
			<Tooltip
				content="Make dashboard public to share"
				render={<button aria-disabled={true} />}
				className="flex cursor-not-allowed items-center gap-1 rounded-md border border-(--cards-border) px-1.5 py-1 text-xs text-(--text-disabled) hover:border-transparent focus-visible:border-transparent"
			>
				{copied ? <Icon name="check-circle" height={14} width={14} /> : <Icon name="link" height={14} width={14} />}
				<span>Share</span>
			</Tooltip>
		)
	}
	return (
		<Tooltip
			content="Copy dashboard link to clipboard"
			render={<button onClick={copy} />}
			className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)"
		>
			{copied ? <Icon name="check-circle" height={14} width={14} /> : <Icon name="link" height={14} width={14} />}
			<span>Share</span>
		</Tooltip>
	)
}
