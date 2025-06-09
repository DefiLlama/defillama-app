import { useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { AddChartModal } from './components/AddChartModal'
import { ChartGrid } from './components/ChartGrid'
import { EmptyState } from './components/EmptyState'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { LoadingSpinner } from './components/LoadingSpinner'
import { useProDashboard, TimePeriod } from './ProDashboardAPIContext'
import { useAuthContext } from '~/containers/Subscribtion/auth'

function ProDashboardContent() {
	const router = useRouter()
	const [showAddModal, setShowAddModal] = useState<boolean>(false)
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

	if (isSubLoading || isLoadingDashboard) {
		return (
			<div className="flex justify-center items-center h-[40vh]">
				<LoadingSpinner />
			</div>
		)
	}

	if (subscription?.status !== 'active') {
		return (
			<div className="flex flex-col items-center justify-center w-full px-4 py-10">
				<div className="mb-10 text-center w-full max-w-3xl">
					<h2 className="text-3xl font-extrabold text-white mb-3">Unlock the Full Picture</h2>
					<p className="text-[#b4b7bc] text-lg mb-4">
						The Pro Dashboard offers dynamic, customizable charts. Here's a sneak peek of what you can explore with a
						Llama+ subscription:
					</p>
				</div>

				<SubscribePlusCard context="modal" />
			</div>
		)
	}

	return (
		<div className="p-4 md:p-6">
			<div className="mb-4">
				<button
					onClick={() => router.push('/pro')}
					className="flex items-center gap-2 text-[var(--text2)] hover:text-[var(--text1)] transition-colors"
				>
					<Icon name="arrow-left" height={16} width={16} />
					Back to Dashboards
				</button>
			</div>

			<div className="grid grid-cols-3 items-center mb-2 gap-4">
				<div className="grid grid-cols-4 gap-0 justify-self-start">
					{timePeriods.map((period) => (
						<button
							key={period.value}
							className={`px-4 py-2 text-sm font-medium border transition-colors duration-200 ${
								timePeriod === period.value
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
							}`}
							onClick={() => setTimePeriod(period.value)}
						>
							{period.label}
						</button>
					))}
				</div>

				<div className="justify-self-center flex items-center gap-2">
					{isEditingName && !isReadOnly ? (
						<form onSubmit={handleNameSubmit} className="flex items-center">
							<input
								type="text"
								value={dashboardName}
								onChange={(e) => setDashboardName(e.target.value)}
								onBlur={() => {
									setIsEditingName(false)
									saveDashboardName()
								}}
								onKeyDown={handleNameKeyDown}
								className="text-xl font-semibold text-center bg-transparent border-b-2 border-[var(--primary1)] text-[var(--text1)] focus:outline-none px-3 py-2 min-w-0"
								autoFocus
								placeholder="Dashboard Name"
							/>
						</form>
					) : (
						<button
							onClick={() => !isReadOnly && setIsEditingName(true)}
							className={`group text-xl font-semibold text-[var(--text1)] px-3 py-2 bg-[var(--bg7)] bg-opacity-30 ${
								!isReadOnly ? 'hover:bg-[var(--bg3)] hover:border-[var(--form-control-border)]' : ''
							} flex items-center gap-2 transition-colors`}
							disabled={isReadOnly}
						>
							{dashboardName}
							{!isReadOnly && <Icon name="pencil" height={14} width={14} className="text-[var(--text1)]" />}
							{isReadOnly && <span className="text-xs text-[var(--text3)] ml-2">(Read-only)</span>}
						</button>
					)}

					{isAuthenticated && (
						<div className="relative">
							<button
								onClick={() => setShowDashboardMenu(!showDashboardMenu)}
								className="p-2 bg-[var(--bg7)] bg-opacity-30  hover:bg-[var(--bg3)] hover:border-[var(--form-control-border)] transition-colors"
								title="Dashboard menu"
							>
								<Icon name="chevron-down" height={16} width={16} className="text-[var(--text1)]" />
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
													className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] flex items-center gap-2"
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
														className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] flex items-center gap-2"
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
															className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-red-500 flex items-center gap-2"
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
												className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] flex items-center gap-2"
											>
												<Icon name="plus" height={16} width={16} />
												New Dashboard
											</button>

											{dashboards.length > 0 && (
												<>
													<div className="border-t border-[var(--divider)] my-2" />
													<div className="text-xs text-[var(--text3)] px-3 py-1">My Dashboards</div>
													{isLoadingDashboards ? (
														<div className="px-3 py-2 text-sm text-[var(--text3)]">Loading...</div>
													) : (
														<div className="max-h-64 overflow-y-auto">
															{dashboards.map((dashboard) => (
																<button
																	key={dashboard.id}
																	onClick={() => {
																		loadDashboard(dashboard.id)
																		setShowDashboardMenu(false)
																	}}
																	className={`w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-sm ${
																		dashboard.id === dashboardId ? 'bg-[var(--bg3)]' : ''
																	}`}
																>
																	<div className="flex items-center justify-between">
																		<span className="truncate">{dashboard.data.dashboardName}</span>
																		{dashboard.id === dashboardId && (
																			<Icon name="check" height={14} width={14} className="text-[var(--primary1)]" />
																		)}
																	</div>
																	<div className="text-xs text-[var(--text3)]">
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
					className={`px-4 py-2 ${!isReadOnly ? 'bg-[var(--primary1)] hover:bg-[var(--primary1-hover)]' : 'bg-[var(--bg3)] cursor-not-allowed'} text-white flex items-center gap-2 justify-self-end`}
					onClick={() => !isReadOnly && setShowAddModal(true)}
					disabled={isReadOnly}
				>
					<Icon name="plus" height={16} width={16} />
					Add Item
				</button>
			</div>

			{!isAuthenticated && (
				<div className="bg-[var(--bg3)] border border-[var(--divider)] p-3 mb-4 text-sm text-[var(--text2)]">
					<Icon name="help-circle" height={16} width={16} className="inline mr-2" />
					Sign in to save and manage multiple dashboards
				</div>
			)}

			{protocolsLoading && items.length === 0 && (
				<div className="flex items-center justify-center h-40">
					<LoadingSpinner />
				</div>
			)}

			{items.length > 0 && <ChartGrid onAddChartClick={() => setShowAddModal(true)} />}

			<AddChartModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

			{!protocolsLoading && items.length === 0 && <EmptyState onAddChart={() => setShowAddModal(true)} />}
		</div>
	)
}

export default function ProDashboard() {
	return <ProDashboardContent />
}