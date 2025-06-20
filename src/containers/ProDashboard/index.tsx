import { useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { AddChartModal } from './components/AddChartModal'
import { ChartGrid } from './components/ChartGrid'
import { EmptyState } from './components/EmptyState'
import { DemoPreview } from './components/DemoPreview'
import { useSubscribe } from '~/hooks/useSubscribe'
import { ProDashboardLoader } from './components/ProDashboardLoader'
import { useProDashboard, TimePeriod } from './ProDashboardAPIContext'
import { DashboardItemConfig } from './types'
import { useAuthContext } from '~/containers/Subscribtion/auth'

function ProDashboardContent() {
	const router = useRouter()
	const [showAddModal, setShowAddModal] = useState<boolean>(false)
	const [editItem, setEditItem] = useState<DashboardItemConfig | null>(null)
	const [isEditingName, setIsEditingName] = useState<boolean>(false)
	const [showDashboardMenu, setShowDashboardMenu] = useState<boolean>(false)
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
		copyDashboard
	} = useProDashboard()

	const timePeriods: { value: TimePeriod; label: string }[] = [
		{ value: '30d', label: '30d' },
		{ value: '90d', label: '90d' },
		{ value: '365d', label: '365d' },
		{ value: 'all', label: 'All' }
	]

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

	if (!isAuthenticated && subscription?.status !== 'active') {
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
				<div className="flex gap-0 overflow-x-auto order-2 md:order-1">
					{timePeriods.map((period, index) => (
						<button
							key={period.value}
							className={`px-3 py-1.5 md:px-4 md:py-2 text-sm font-medium border transition-colors duration-200 flex-1 md:flex-initial ${
								timePeriod === period.value
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 pro-hover-bg pro-text2'
							}`}
							onClick={() => setTimePeriod(period.value)}
						>
							{period.label}
						</button>
					))}
				</div>

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
									className="text-lg md:text-xl font-semibold bg-transparent border-b-2 border-[var(--primary1)] pro-text1 focus:outline-none px-2 py-1 md:px-3 md:py-2 min-w-0 w-full md:text-center"
									autoFocus
									placeholder="Dashboard Name"
								/>
							</form>
						) : (
							<button
								onClick={() => !isReadOnly && setIsEditingName(true)}
								className={`group text-lg md:text-xl font-semibold pro-text1 px-2 py-1 md:px-3 md:py-2 bg-[var(--bg7)] bg-opacity-30 ${
									!isReadOnly ? 'pro-hover-bg hover:border-[var(--form-control-border)]' : ''
								} flex items-center gap-2 transition-colors min-w-0`}
								disabled={isReadOnly}
							>
								<span className="truncate">{dashboardName}</span>
								{!isReadOnly && <Icon name="pencil" height={14} width={14} className="pro-text1 flex-shrink-0" />}
								{isReadOnly && <span className="text-xs pro-text3 ml-2 flex-shrink-0">(Read-only)</span>}
							</button>
						)}

						{isAuthenticated && (
							<div className="relative">
								<button
									onClick={() => setShowDashboardMenu(!showDashboardMenu)}
									className="p-2 bg-[var(--bg7)] bg-opacity-30 pro-hover-bg hover:border-[var(--form-control-border)] transition-colors"
									title="Dashboard menu"
								>
									<Icon name="chevron-down" height={16} width={16} className="pro-text1" />
								</button>

								{showDashboardMenu && (
									<>
										<div className="fixed inset-0 z-10" onClick={() => setShowDashboardMenu(false)} />
										<div className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg7)] bg-opacity-90 backdrop-filter backdrop-blur-xl border border-white/30 shadow-lg z-20">
											<div className="p-2">
												{isReadOnly ? (
													<button
														onClick={() => {
															copyDashboard()
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
														<div className="border-t border-[var(--divider)] my-2" />
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
																			dashboard.id === dashboardId ? 'bg-[var(--bg3)]' : ''
																		}`}
																	>
																		<div className="flex items-center justify-between">
																			<span className="truncate">{dashboard.data.dashboardName}</span>
																			{dashboard.id === dashboardId && (
																				<Icon name="check" height={14} width={14} className="text-[var(--primary1)]" />
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

					<button
						className={`px-2.5 py-2 md:px-4 md:py-2 ${
							!isReadOnly
								? 'bg-[var(--primary1)] hover:bg-[var(--primary1-hover)]'
								: 'bg-[var(--bg3)] cursor-not-allowed'
						} text-white flex items-center gap-2 text-sm md:text-base whitespace-nowrap md:hidden`}
						onClick={() => !isReadOnly && setShowAddModal(true)}
						disabled={isReadOnly}
						title="Add Item"
					>
						<Icon name="plus" height={16} width={16} />
					</button>
				</div>

				<button
					className={`px-4 py-2 ${
						!isReadOnly ? 'bg-[var(--primary1)] hover:bg-[var(--primary1-hover)]' : 'bg-[var(--bg3)] cursor-not-allowed'
					} text-white items-center gap-2 text-base whitespace-nowrap hidden md:flex order-3`}
					onClick={() => !isReadOnly && setShowAddModal(true)}
					disabled={isReadOnly}
				>
					<Icon name="plus" height={16} width={16} />
					Add Item
				</button>
			</div>

			{!isAuthenticated && (
				<div className="bg-[var(--bg3)] border border-[var(--divider)] p-3 mb-4 text-sm pro-text2">
					<Icon name="help-circle" height={16} width={16} className="inline mr-2" />
					Sign in to save and manage multiple dashboards
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
		</div>
	)
}

export default function ProDashboard() {
	return <ProDashboardContent />
}
