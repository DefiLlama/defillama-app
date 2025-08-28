import { useState } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'
import { useSubscribe } from '~/hooks/useSubscribe'
import { AddChartModal } from './components/AddChartModal'
import { AIGenerationHistory } from './components/AIGenerationHistory'
import { ChartGrid } from './components/ChartGrid'
import { CreateDashboardModal } from './components/CreateDashboardModal'
import { DashboardSettingsModal } from './components/DashboardSettingsModal'
import { DemoPreview } from './components/DemoPreview'
import { EmptyState } from './components/EmptyState'
import { GenerateDashboardModal } from './components/GenerateDashboardModal'
import { Rating } from './components/Rating'
import { useDashboardEngagement } from './hooks/useDashboardEngagement'
import { AIGeneratedData, TimePeriod, useProDashboard } from './ProDashboardAPIContext'
import { DashboardItemConfig } from './types'

function ProDashboardContent() {
	const router = useRouter()
	const [showAddModal, setShowAddModal] = useState<boolean>(false)
	const [editItem, setEditItem] = useState<DashboardItemConfig | null>(null)
	const [isEditingName, setIsEditingName] = useState<boolean>(false)
	const [showDashboardMenu, setShowDashboardMenu] = useState<boolean>(false)
	const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
	const [showSubscribeModal, setShowSubscribeModal] = useState<boolean>(false)
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const { isAuthenticated } = useAuthContext()
	const { hasFeature, loading: featureFlagsLoading } = useFeatureFlagsContext()
	const {
		items,
		protocolsLoading,
		timePeriod,
		setTimePeriod,
		dashboardName,
		setDashboardName,
		dashboardId,
		dashboards,
		isLoadingDashboards,
		isLoadingDashboard,
		createNewDashboard,
		loadDashboard,
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
		showCreateDashboardModal,
		setShowCreateDashboardModal,
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

	const { trackView, toggleLike, isLiking } = useDashboardEngagement(dashboardId)

	const timePeriods: { value: TimePeriod; label: string }[] = [
		{ value: '30d', label: '30d' },
		{ value: '90d', label: '90d' },
		{ value: '365d', label: '365d' },
		{ value: 'ytd', label: 'YTD' },
		{ value: '3y', label: '3Y' },
		{ value: 'all', label: 'All' }
	]

	const hasChartItems = items?.some(
		(item) => item?.kind === 'chart' || item?.kind === 'multi' || item?.kind === 'builder'
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
		return <DemoPreview />
	}

	return (
		<div className="pro-dashboard flex flex-1 flex-col gap-4 p-2 lg:px-0">
			<BasicLink href="/pro" className="pro-link mr-auto flex items-center gap-2">
				<Icon name="arrow-left" height={16} width={16} />
				Back to Dashboards
			</BasicLink>

			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<Tooltip content={!hasChartItems ? 'Add chart items to enable time period selection' : null} placement="bottom">
					<div className={`order-2 flex gap-0 overflow-x-auto md:order-1 ${isReadOnly ? 'invisible' : ''}`}>
						{timePeriods.map((period) => (
							<button
								key={period.value}
								className={`flex-1 border px-3 py-1.5 text-sm font-medium transition-colors duration-200 md:flex-initial md:px-4 md:py-2 ${
									timePeriod === period.value
										? 'border-(--primary) bg-(--primary) text-white'
										: 'pro-border pro-hover-bg pro-text2'
								} ${!hasChartItems ? 'cursor-not-allowed opacity-50' : ''}`}
								onClick={() => hasChartItems && setTimePeriod(period.value)}
								disabled={!hasChartItems}
							>
								{period.label}
							</button>
						))}
					</div>
				</Tooltip>

				<div className="order-1 flex w-full items-center gap-2 md:order-2 md:w-auto">
					<div className="flex min-w-0 flex-1 items-center gap-2 md:flex-initial">
						{isEditingName && !isReadOnly ? (
							<form onSubmit={handleNameSubmit} className="flex flex-1 items-center">
								<input
									type="text"
									value={dashboardName}
									onChange={(e) => setDashboardName(e.target.value)}
									onBlur={() => {
										setIsEditingName(false)
										saveDashboardName()
									}}
									onKeyDown={handleNameKeyDown}
									className="pro-text1 w-full min-w-0 border-b-2 border-(--primary) bg-transparent px-2 py-1 text-lg font-semibold focus:outline-hidden md:px-3 md:py-2 md:text-center md:text-xl"
									autoFocus
									placeholder="Dashboard Name"
								/>
							</form>
						) : (
							<div className="flex items-center gap-2">
								<button
									onClick={() => !isReadOnly && setIsEditingName(true)}
									className={`group pro-text1 bg-opacity-30 bg-(--bg-glass) px-2 py-1 text-lg font-semibold md:px-3 md:py-2 md:text-xl ${
										!isReadOnly ? 'pro-hover-bg hover:border-(--form-control-border)' : ''
									} flex min-w-0 items-center gap-2 transition-colors`}
									disabled={isReadOnly}
								>
									<span className="truncate">{dashboardName}</span>
									{!isReadOnly && <Icon name="pencil" height={14} width={14} className="pro-text1 shrink-0" />}
									{isReadOnly && <span className="pro-text3 ml-2 shrink-0 text-xs">(Read-only)</span>}
									{!isReadOnly && dashboardId && (
										<span
											className={`ml-2 shrink-0 px-2 py-0.5 text-xs ${
												dashboardVisibility === 'public'
													? 'bg-opacity-20 bg-(--primary)'
													: 'bg-opacity-50 pro-text3 bg-(--bg-main)'
											}`}
										>
											{dashboardVisibility === 'public' ? 'Public' : 'Private'}
										</span>
									)}
								</button>
								{!featureFlagsLoading &&
									hasFeature('dashboard-gen') &&
									currentDashboard?.aiGenerated &&
									Object.keys(currentDashboard.aiGenerated).length > 0 && (
										<div className="flex items-center gap-1">
											<Icon name="sparkles" height={14} width={14} className="text-(--primary)" />
											<span className="text-xs font-medium text-(--primary)">AI Generated</span>
										</div>
									)}
								{dashboardVisibility === 'public' && (
									<div className="pro-text3 flex items-center gap-3 text-sm">
										<div className="flex items-center gap-1" title="Views">
											<Icon name="eye" height={16} width={16} />
											<span>{currentDashboard?.viewCount || 0}</span>
										</div>
										<button
											onClick={() => toggleLike()}
											disabled={isLiking || !isAuthenticated}
											className={`flex items-center gap-1 transition-colors ${
												currentDashboard?.liked ? 'text-(--primary)' : 'hover:text-(--primary)'
											}`}
											title={currentDashboard?.liked ? 'Unlike dashboard' : 'Like dashboard'}
										>
											<Icon
												name="star"
												height={16}
												width={16}
												className={currentDashboard?.liked ? 'fill-current' : ''}
											/>
											<span>{currentDashboard?.likeCount || 0}</span>
										</button>
										<button
											onClick={() => {
												const url = `${window.location.origin}/pro/${dashboardId}`
												navigator.clipboard.writeText(url)
												toast.success('Dashboard link copied to clipboard!')
											}}
											className="flex items-center gap-1 transition-colors hover:text-(--primary)"
											title="Share dashboard"
										>
											<Icon name="link" height={16} width={16} />
											<span className="hidden xl:inline">Share</span>
										</button>
									</div>
								)}
								{dashboardVisibility === 'private' && dashboardId && (
									<Tooltip content="Make dashboard public to share" placement="bottom">
										<button
											disabled
											className="pro-text3 flex cursor-not-allowed items-center gap-1 text-sm opacity-50"
										>
											<Icon name="link" height={16} width={16} />
											<span className="hidden xl:inline">Share</span>
										</button>
									</Tooltip>
								)}
							</div>
						)}

						{isAuthenticated && isReadOnly && (
							<button
								onClick={() => {
									if (subscription?.status === 'active') {
										copyDashboard()
									} else {
										setShowSubscribeModal(true)
									}
								}}
								className="ml-2 flex items-center gap-2 border border-(--primary) px-2 py-2 text-(--primary) transition-colors hover:bg-(--primary) hover:text-white xl:px-3"
								title="Copy Dashboard"
							>
								<Icon name="copy" height={16} width={16} />
								<span className="hidden xl:inline">Copy</span>
							</button>
						)}

						{isAuthenticated && (
							<div className="relative">
								<button
									onClick={() => setShowDashboardMenu(!showDashboardMenu)}
									className="bg-opacity-30 pro-hover-bg bg-(--bg-glass) p-2 transition-colors hover:border-(--form-control-border)"
									title="Dashboard menu"
								>
									<Icon name="chevron-down" height={16} width={16} className="pro-text1" />
								</button>

								{showDashboardMenu && (
									<>
										<div className="fixed inset-0 z-10" onClick={() => setShowDashboardMenu(false)} />
										<div className="bg-opacity-90 pro-glass-border absolute top-full right-0 z-[1000] mt-2 w-64 border bg-(--bg-glass) shadow-lg backdrop-blur-xl backdrop-filter">
											<div className="p-2">
												{isReadOnly ? (
													<button
														onClick={() => {
															if (subscription?.status === 'active') {
																copyDashboard()
															} else {
																setShowSubscribeModal(true)
															}
															setShowDashboardMenu(false)
														}}
														className="pro-hover-bg flex w-full items-center gap-2 px-3 py-2 text-left"
													>
														<Icon name="copy" height={16} width={16} />
														Copy Dashboard
													</button>
												) : (
													<>
														<button
															onClick={() => {
																saveDashboard()
																setShowDashboardMenu(false)
															}}
															className="pro-hover-bg flex w-full items-center gap-2 px-3 py-2 text-left"
															disabled={!dashboardId && items.length === 0}
														>
															<Icon name="download-cloud" height={16} width={16} />
															{dashboardId ? 'Save Dashboard' : 'Save as New Dashboard'}
														</button>

														{dashboardId && (
															<button
																onClick={() => {
																	deleteDashboard(dashboardId)
																	setShowDashboardMenu(false)
																}}
																className="pro-hover-bg flex w-full items-center gap-2 px-3 py-2 text-left text-red-500"
															>
																<Icon name="trash-2" height={16} width={16} />
																Delete Dashboard
															</button>
														)}
													</>
												)}

												<button
													onClick={() => {
														createNewDashboard()
														setShowDashboardMenu(false)
													}}
													className="pro-hover-bg flex w-full items-center gap-2 px-3 py-2 text-left"
												>
													<Icon name="plus" height={16} width={16} />
													New Dashboard
												</button>

												{!featureFlagsLoading && hasFeature('dashboard-gen') && (
													<button
														onClick={() => {
															setShowGenerateDashboardModal(true)
															setShowDashboardMenu(false)
														}}
														className="pro-hover-bg flex w-full items-center gap-2 px-3 py-2 text-left"
													>
														<Icon name="sparkles" height={16} width={16} />
														Generate with LlamaAI
													</button>
												)}

												{dashboards.length > 0 && (
													<>
														<div className="my-2 border-t border-(--divider)" />
														<div className="pro-text3 px-3 py-1 text-xs">My Dashboards</div>
														{isLoadingDashboards ? (
															<div className="pro-text3 flex items-center justify-center gap-1 px-3 py-2 text-sm">
																Loading
																<LoadingDots />
															</div>
														) : (
															<div className="thin-scrollbar max-h-64 overflow-y-auto">
																{dashboards.map((dashboard) => (
																	<button
																		key={dashboard.id}
																		onClick={() => {
																			loadDashboard(dashboard.id)
																			setShowDashboardMenu(false)
																		}}
																		className={`pro-hover-bg w-full px-3 py-2 text-left text-sm ${
																			dashboard.id === dashboardId ? 'bg-(--bg-tertiary)' : ''
																		}`}
																	>
																		<div className="flex items-center justify-between">
																			<span className="truncate">{dashboard.data.dashboardName}</span>
																			{dashboard.id === dashboardId && (
																				<Icon name="check" height={14} width={14} className="text-(--primary)" />
																			)}
																		</div>
																		<div className="pro-text3 text-xs">
																			{new Date(dashboard.updated).toLocaleDateString()}
																		</div>
																	</button>
																))}
															</div>
														)}
													</>
												)}
											</div>
										</div>
									</>
								)}
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 md:hidden">
						{dashboardId && !isReadOnly && (
							<button
								onClick={() => setShowSettingsModal(true)}
								className="bg-opacity-30 pro-hover-bg bg-(--bg-glass) p-2 transition-colors hover:border-(--form-control-border)"
								title="Dashboard Settings"
							>
								<Icon name="settings" height={16} width={16} className="pro-text1" />
							</button>
						)}
						{!isReadOnly && items.length > 0 && !featureFlagsLoading && hasFeature('dashboard-gen') && (
							<button
								className="animate-ai-glow flex items-center gap-2 border border-(--primary) px-2.5 py-2 text-sm whitespace-nowrap text-(--primary) transition-colors hover:bg-(--primary) hover:text-white"
								onClick={() => setShowIterateDashboardModal(true)}
								title="Edit with LlamaAI"
							>
								<Icon name="sparkles" height={16} width={16} />
							</button>
						)}
						<button
							className={`px-2.5 py-2 md:px-4 md:py-2 ${
								!isReadOnly ? 'bg-(--primary) hover:bg-(--primary-hover)' : 'cursor-not-allowed bg-(--bg-tertiary)'
							} flex items-center gap-2 text-sm whitespace-nowrap text-white md:text-base`}
							onClick={() => !isReadOnly && setShowAddModal(true)}
							disabled={isReadOnly}
							title="Add Item"
						>
							<Icon name="plus" height={16} width={16} />
						</button>
					</div>
				</div>

				<div className="order-3 flex items-center gap-2">
					{dashboardId && !isReadOnly && (
						<button
							onClick={() => setShowSettingsModal(true)}
							className="bg-opacity-30 pro-hover-bg hidden bg-(--bg-glass) p-2 transition-colors hover:border-(--form-control-border) md:flex"
							title="Dashboard Settings"
						>
							<Icon name="settings" height={20} width={20} className="pro-text1" />
						</button>
					)}
					{!isReadOnly && items.length > 0 && !featureFlagsLoading && hasFeature('dashboard-gen') && (
						<button
							className="animate-ai-glow hidden items-center gap-2 border border-(--primary) px-4 py-2 text-base whitespace-nowrap text-(--primary) transition-colors hover:bg-(--primary) hover:text-white md:flex"
							onClick={() => setShowIterateDashboardModal(true)}
							title="Edit with LlamaAI"
						>
							<Icon name="sparkles" height={16} width={16} />
							Edit with LlamaAI
						</button>
					)}

					{canUndo && !isReadOnly && (
						<button
							className="pro-border pro-text2 hover:pro-text1 hidden items-center gap-2 border px-4 py-2 text-base whitespace-nowrap transition-colors hover:border-(--primary) md:flex"
							onClick={undoAIGeneration}
							title="Undo AI changes"
						>
							<Icon name="arrow-left" height={16} width={16} />
							Undo
						</button>
					)}

					<button
						className={`px-4 py-2 ${
							!isReadOnly ? 'bg-(--primary) hover:bg-(--primary-hover)' : 'cursor-not-allowed bg-(--bg-tertiary)'
						} hidden items-center gap-2 text-base whitespace-nowrap text-white md:flex ${
							isReadOnly ? 'invisible' : ''
						}`}
						onClick={() => !isReadOnly && setShowAddModal(true)}
						disabled={isReadOnly}
					>
						<Icon name="plus" height={16} width={16} />
						Add Item
					</button>
				</div>
			</div>

			{dashboardTags.length > 0 && (
				<div className="flex items-center gap-2">
					<Icon name="bookmark" height={14} width={14} className="pro-text3" />
					<div className="flex flex-wrap gap-2">
						{dashboardTags.map((tag) => (
							<span key={tag} className="bg-opacity-50 pro-text2 pro-border border bg-(--bg-main) px-2 py-1 text-xs">
								{tag}
							</span>
						))}
					</div>
				</div>
			)}

			{!featureFlagsLoading && hasFeature('dashboard-gen') && currentDashboard?.aiGenerated && (
				<AIGenerationHistory aiGenerated={currentDashboard.aiGenerated as AIGeneratedData} />
			)}

			{currentRatingSession && !isReadOnly && (
				<Rating
					sessionId={currentRatingSession.sessionId}
					mode={currentRatingSession.mode}
					variant="banner"
					prompt={currentRatingSession.prompt}
					onRate={submitRating}
					onSkip={skipRating}
					onDismiss={dismissRating}
				/>
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

			<AddChartModal
				isOpen={showAddModal}
				onClose={() => {
					setShowAddModal(false)
					setEditItem(null)
				}}
				editItem={editItem}
			/>

			{!protocolsLoading && items.length === 0 && (
				<EmptyState
					onAddChart={() => setShowAddModal(true)}
					onGenerateWithAI={hasFeature('dashboard-gen') ? () => setShowIterateDashboardModal(true) : undefined}
					isReadOnly={isReadOnly}
				/>
			)}

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

			<CreateDashboardModal
				isOpen={showCreateDashboardModal}
				onClose={() => setShowCreateDashboardModal(false)}
				onCreate={handleCreateDashboard}
			/>

			<GenerateDashboardModal
				isOpen={showGenerateDashboardModal}
				onClose={() => setShowGenerateDashboardModal(false)}
				onGenerate={handleGenerateDashboard}
			/>

			<GenerateDashboardModal
				isOpen={showIterateDashboardModal}
				onClose={() => setShowIterateDashboardModal(false)}
				mode="iterate"
				existingDashboard={{
					dashboardName,
					visibility: dashboardVisibility,
					tags: dashboardTags,
					description: dashboardDescription,
					items
				}}
				onGenerate={handleIterateDashboard}
			/>

			<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
				<SubscribePlusCard context="modal" returnUrl={router.asPath} />
			</SubscribeModal>
		</div>
	)
}

export default function ProDashboard() {
	return <ProDashboardContent />
}
