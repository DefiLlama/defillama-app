import { useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import toast from 'react-hot-toast'
import { AddChartModal } from './components/AddChartModal'
import { ChartGrid } from './components/ChartGrid'
import { EmptyState } from './components/EmptyState'
import { DemoPreview } from './components/DemoPreview'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useProDashboard, TimePeriod } from './ProDashboardAPIContext'
import { DashboardItemConfig } from './types'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDashboardEngagement } from './hooks/useDashboardEngagement'
import { DashboardSettingsModal } from './components/DashboardSettingsModal'
import { CreateDashboardModal } from './components/CreateDashboardModal'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'

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
		handleCreateDashboard
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

	const hasChartItems = items?.some((item) => item?.kind === 'chart' || item?.kind === 'multi')

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
		<div className="pro-dashboard p-4 md:p-6">
			<div className="mb-4">
				<button
					onClick={() => router.push('/pro')}
					className="flex items-center gap-2 pro-text2 hover:pro-text1 transition-colors"
				>
					<Icon name="arrow-left" height={16} width={16} />
					Back to Dashboards
				</button>
			</div>

			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-2">
				<Tooltip content={!hasChartItems ? 'Add chart items to enable time period selection' : null} placement="bottom">
					<div className={`flex gap-0 overflow-x-auto order-2 md:order-1 ${isReadOnly ? 'invisible' : ''}`}>
						{timePeriods.map((period) => (
							<button
								key={period.value}
								className={`px-3 py-1.5 md:px-4 md:py-2 text-sm font-medium border transition-colors duration-200 flex-1 md:flex-initial ${
									timePeriod === period.value
										? 'border-(--primary) bg-(--primary) text-white'
										: 'pro-border pro-hover-bg pro-text2'
								} ${!hasChartItems ? 'opacity-50 cursor-not-allowed' : ''}`}
								onClick={() => hasChartItems && setTimePeriod(period.value)}
								disabled={!hasChartItems}
							>
								{period.label}
							</button>
						))}
					</div>
				</Tooltip>

				<div className="flex items-center gap-2 order-1 md:order-2 w-full md:w-auto">
					<div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
						{isEditingName && !isReadOnly ? (
							<form onSubmit={handleNameSubmit} className="flex items-center flex-1">
								<input
									type="text"
									value={dashboardName}
									onChange={(e) => setDashboardName(e.target.value)}
									onBlur={() => {
										setIsEditingName(false)
										saveDashboardName()
									}}
									onKeyDown={handleNameKeyDown}
									className="text-lg md:text-xl font-semibold bg-transparent border-b-2 border-(--primary) pro-text1 focus:outline-hidden px-2 py-1 md:px-3 md:py-2 min-w-0 w-full md:text-center"
									autoFocus
									placeholder="Dashboard Name"
								/>
							</form>
						) : (
							<div className="flex items-center gap-2">
								<button
									onClick={() => !isReadOnly && setIsEditingName(true)}
									className={`group text-lg md:text-xl font-semibold pro-text1 px-2 py-1 md:px-3 md:py-2 bg-(--bg-glass) bg-opacity-30 ${
										!isReadOnly ? 'pro-hover-bg hover:border-(--form-control-border)' : ''
									} flex items-center gap-2 transition-colors min-w-0`}
									disabled={isReadOnly}
								>
									<span className="truncate">{dashboardName}</span>
									{!isReadOnly && <Icon name="pencil" height={14} width={14} className="pro-text1 shrink-0" />}
									{isReadOnly && <span className="text-xs pro-text3 ml-2 shrink-0">(Read-only)</span>}
									{!isReadOnly && dashboardId && (
										<span
											className={`text-xs px-2 py-0.5 ml-2 shrink-0 ${
												dashboardVisibility === 'public'
													? 'bg-(--primary) bg-opacity-20'
													: 'bg-(--bg-main) bg-opacity-50 pro-text3'
											}`}
										>
											{dashboardVisibility === 'public' ? 'Public' : 'Private'}
										</span>
									)}
								</button>
								{dashboardVisibility === 'public' && (
									<div className="flex items-center gap-3 text-sm pro-text3">
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
											className="flex items-center gap-1 text-sm pro-text3 opacity-50 cursor-not-allowed"
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
								className="flex items-center gap-2  ml-2 px-2 xl:px-3 py-2 border border-(--primary) text-(--primary) hover:bg-(--primary) hover:text-white transition-colors"
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
									className="p-2 bg-(--bg-glass) bg-opacity-30 pro-hover-bg hover:border-(--form-control-border) transition-colors"
									title="Dashboard menu"
								>
									<Icon name="chevron-down" height={16} width={16} className="pro-text1" />
								</button>

								{showDashboardMenu && (
									<>
										<div className="fixed inset-0 z-10" onClick={() => setShowDashboardMenu(false)} />
										<div className="absolute right-0 top-full mt-2 w-64 bg-(--bg-glass) bg-opacity-90 backdrop-filter backdrop-blur-xl border pro-glass-border shadow-lg z-[1000]">
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
														className="w-full text-left px-3 py-2 pro-hover-bg flex items-center gap-2"
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
															className="w-full text-left px-3 py-2 pro-hover-bg flex items-center gap-2"
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
																className="w-full text-left px-3 py-2 pro-hover-bg text-red-500 flex items-center gap-2"
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
													className="w-full text-left px-3 py-2 pro-hover-bg flex items-center gap-2"
												>
													<Icon name="plus" height={16} width={16} />
													New Dashboard
												</button>

												{dashboards.length > 0 && (
													<>
														<div className="border-t border-(--divider) my-2" />
														<div className="text-xs pro-text3 px-3 py-1">My Dashboards</div>
														{isLoadingDashboards ? (
															<div className="px-3 py-2 text-sm pro-text3">Loading...</div>
														) : (
															<div className="max-h-64 overflow-y-auto thin-scrollbar">
																{dashboards.map((dashboard) => (
																	<button
																		key={dashboard.id}
																		onClick={() => {
																			loadDashboard(dashboard.id)
																			setShowDashboardMenu(false)
																		}}
																		className={`w-full text-left px-3 py-2 pro-hover-bg text-sm ${
																			dashboard.id === dashboardId ? 'bg-(--bg-tertiary)' : ''
																		}`}
																	>
																		<div className="flex items-center justify-between">
																			<span className="truncate">{dashboard.data.dashboardName}</span>
																			{dashboard.id === dashboardId && (
																				<Icon name="check" height={14} width={14} className="text-(--primary)" />
																			)}
																		</div>
																		<div className="text-xs pro-text3">
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
								className="p-2 bg-(--bg-glass) bg-opacity-30 pro-hover-bg hover:border-(--form-control-border) transition-colors"
								title="Dashboard Settings"
							>
								<Icon name="settings" height={16} width={16} className="pro-text1" />
							</button>
						)}
						<button
							className={`px-2.5 py-2 md:px-4 md:py-2 ${
								!isReadOnly ? 'bg-(--primary) hover:bg-(--primary-hover)' : 'bg-(--bg-tertiary) cursor-not-allowed'
							} text-white flex items-center gap-2 text-sm md:text-base whitespace-nowrap`}
							onClick={() => !isReadOnly && setShowAddModal(true)}
							disabled={isReadOnly}
							title="Add Item"
						>
							<Icon name="plus" height={16} width={16} />
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2 order-3">
					{dashboardId && !isReadOnly && (
						<button
							onClick={() => setShowSettingsModal(true)}
							className="p-2 bg-(--bg-glass) bg-opacity-30 pro-hover-bg hover:border-(--form-control-border) transition-colors hidden md:flex"
							title="Dashboard Settings"
						>
							<Icon name="settings" height={20} width={20} className="pro-text1" />
						</button>
					)}
					<button
						className={`px-4 py-2 ${
							!isReadOnly ? 'bg-(--primary) hover:bg-(--primary-hover)' : 'bg-(--bg-tertiary) cursor-not-allowed'
						} text-white items-center gap-2 text-base whitespace-nowrap hidden md:flex ${
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

			{!isAuthenticated && (
				<div className="bg-(--bg-tertiary) border border-(--divider) p-3 mb-4 text-sm pro-text2">
					<Icon name="help-circle" height={16} width={16} className="inline mr-2" />
					Sign in to save and manage multiple dashboards
				</div>
			)}

			{dashboardTags.length > 0 && (
				<div className="mb-4 flex items-center gap-2">
					<Icon name="bookmark" height={14} width={14} className="pro-text3" />
					<div className="flex flex-wrap gap-2">
						{dashboardTags.map((tag) => (
							<span key={tag} className="px-2 py-1 bg-(--bg-main) bg-opacity-50 text-xs pro-text2 border pro-border">
								{tag}
							</span>
						))}
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

			<AddChartModal
				isOpen={showAddModal}
				onClose={() => {
					setShowAddModal(false)
					setEditItem(null)
				}}
				editItem={editItem}
			/>

			{!protocolsLoading && items.length === 0 && <EmptyState onAddChart={() => setShowAddModal(true)} />}

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

			<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
				<SubscribePlusCard context="modal" returnUrl={router.asPath} />
			</SubscribeModal>
		</div>
	)
}

export default function ProDashboard() {
	return <ProDashboardContent />
}
