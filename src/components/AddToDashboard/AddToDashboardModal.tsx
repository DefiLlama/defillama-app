import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { useGetLiteDashboards } from '~/containers/ProDashboard/hooks/useDashboardAPI'
import { dashboardAPI } from '~/containers/ProDashboard/services/DashboardAPI'
import { addItemToDashboard } from '~/containers/ProDashboard/utils/dashboardItemsUtils'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { DashboardChartConfig } from './AddToDashboardButton'

interface AddToDashboardModalProps {
	dialogStore: Ariakit.DialogStore
	chartConfig: DashboardChartConfig
	unsupportedMetrics?: string[]
}

function getConfigName(config: DashboardChartConfig): string {
	if (config.kind === 'multi') {
		return config.name || ''
	}
	if (config.kind === 'yields') {
		return config.poolName || ''
	}
	return config.name || ''
}

export function AddToDashboardModal({ dialogStore, chartConfig, unsupportedMetrics = [] }: AddToDashboardModalProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const { subscription } = useSubscribe()
	const { data: dashboards = [], isLoading: isLoadingDashboards } = useGetLiteDashboards()

	const [search, setSearch] = useState('')
	const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null)
	const [isCreatingNew, setIsCreatingNew] = useState(false)
	const [newDashboardName, setNewDashboardName] = useState('')
	const [chartName, setChartName] = useState(getConfigName(chartConfig))
	const [isAdding, setIsAdding] = useState(false)

	const hasActiveSubscription = subscription?.status === 'active'
	const isOpen = dialogStore.useState('open')

	const filteredDashboards = useMemo(() => {
		if (!search.trim()) return dashboards
		const q = search.toLowerCase()
		return dashboards.filter((d) => d.name.toLowerCase().includes(q))
	}, [dashboards, search])

	const configName = getConfigName(chartConfig)

	useEffect(() => {
		if (!isOpen) return
		setSearch('')
		setSelectedDashboardId(null)
		setIsCreatingNew(false)
		setNewDashboardName('')
		setChartName(configName)
		setIsAdding(false)
	}, [isOpen, configName])

	const handleSelectDashboard = (id: string) => {
		setSelectedDashboardId(id)
		setIsCreatingNew(false)
	}

	const handleCreateNew = () => {
		setIsCreatingNew(true)
		setSelectedDashboardId(null)
	}

	const handleAdd = async () => {
		if (!isAuthenticated || !hasActiveSubscription) return

		const chartToAdd = { ...chartConfig, name: chartName || configName }

		if (isCreatingNew) {
			if (!newDashboardName.trim()) {
				toast.error('Please enter a dashboard name')
				return
			}

			setIsAdding(true)
			try {
				const dashboard = await dashboardAPI.createDashboard(
					{
						items: [chartToAdd],
						dashboardName: newDashboardName,
						timePeriod: '90d',
						visibility: 'private',
						tags: [],
						description: ''
					},
					authorizedFetch
				)

				queryClient.invalidateQueries({ queryKey: ['dashboards'] })
				queryClient.invalidateQueries({ queryKey: ['my-dashboards'] })
				queryClient.invalidateQueries({ queryKey: ['lite-dashboards'] })

				if (typeof window !== 'undefined' && (window as any).umami) {
					;(window as any).umami.track('add-to-dashboard-submit', { type: 'new-dashboard' })
				}

				toast.success(
					<div>
						Dashboard created!{' '}
						<a
							href={`/pro/${dashboard.id}`}
							className="underline"
							onClick={(e) => {
								e.preventDefault()
								router.push(`/pro/${dashboard.id}`)
							}}
						>
							View →
						</a>
					</div>,
					{ duration: 5000 }
				)
				dialogStore.hide()
			} catch (error: any) {
				toast.error(error.message || 'Failed to create dashboard')
			} finally {
				setIsAdding(false)
			}
		} else {
			if (!selectedDashboardId) {
				toast.error('Please select a dashboard')
				return
			}

			setIsAdding(true)
			try {
				await addItemToDashboard(selectedDashboardId, chartToAdd, authorizedFetch)

				queryClient.invalidateQueries({ queryKey: ['dashboards'] })
				queryClient.invalidateQueries({ queryKey: ['my-dashboards'] })
				queryClient.invalidateQueries({ queryKey: ['lite-dashboards'] })

				if (typeof window !== 'undefined' && (window as any).umami) {
					;(window as any).umami.track('add-to-dashboard-submit', { type: 'existing-dashboard' })
				}

				const selected = dashboards.find((d) => d.id === selectedDashboardId)

				toast.success(
					<div>
						Added to {selected?.name}!{' '}
						<a
							href={`/pro/${selectedDashboardId}`}
							className="underline"
							onClick={(e) => {
								e.preventDefault()
								router.push(`/pro/${selectedDashboardId}`)
							}}
						>
							View →
						</a>
					</div>,
					{ duration: 5000 }
				)
				dialogStore.hide()
			} catch (error: any) {
				toast.error(error.message || 'Failed to add chart')
			} finally {
				setIsAdding(false)
			}
		}
	}

	if (!isAuthenticated || !hasActiveSubscription) {
		return null
	}

	const canSubmit = isCreatingNew ? newDashboardName.trim().length > 0 : selectedDashboardId !== null

	return (
		<Ariakit.Dialog
			store={dialogStore}
			className="dialog pro-dashboard w-full max-w-md gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl"
			unmountOnHide
			portal
			hideOnInteractOutside
		>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="pro-text1 text-base font-semibold">Add to Dashboard</h2>
				<Ariakit.DialogDismiss className="pro-hover-bg pro-text2 rounded-md p-1 transition-colors">
					<Icon name="x" height={18} width={18} />
				</Ariakit.DialogDismiss>
			</div>

			<div className="relative mb-3">
				<Icon name="search" className="pro-text3 absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search dashboards..."
					className="pro-border pro-text1 placeholder:pro-text3 w-full rounded-md border py-2 pr-3 pl-9 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
				/>
			</div>

			<div className="thin-scrollbar mb-3 max-h-60 overflow-y-auto">
				{isLoadingDashboards ? (
					<div className="flex items-center justify-center py-6">
						<div className="h-5 w-5 animate-spin rounded-full border-2 border-(--primary) border-t-transparent" />
					</div>
				) : filteredDashboards.length === 0 && !search ? (
					<p className="pro-text3 py-4 text-center text-sm">No dashboards yet</p>
				) : filteredDashboards.length === 0 ? (
					<p className="pro-text3 py-4 text-center text-sm">No matches found</p>
				) : (
					<div className="space-y-1">
						{filteredDashboards.map((dashboard) => (
							<button
								key={dashboard.id}
								type="button"
								onClick={() => handleSelectDashboard(dashboard.id)}
								className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
									selectedDashboardId === dashboard.id ? 'bg-(--primary)/10 text-(--primary)' : 'pro-text1 pro-hover-bg'
								}`}
							>
								<div
									className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
										selectedDashboardId === dashboard.id ? 'border-(--primary) bg-(--primary)' : 'pro-border'
									}`}
								>
									{selectedDashboardId === dashboard.id && <Icon name="check" className="h-2.5 w-2.5 text-white" />}
								</div>
								<span className="truncate">{dashboard.name}</span>
							</button>
						))}
					</div>
				)}
			</div>

			<div className="mb-3 flex items-center gap-2">
				<div className="pro-border h-px flex-1 border-t" />
				<span className="pro-text3 text-xs">or</span>
				<div className="pro-border h-px flex-1 border-t" />
			</div>

			<div className="mb-4">
				{isCreatingNew ? (
					<input
						type="text"
						value={newDashboardName}
						onChange={(e) => setNewDashboardName(e.target.value)}
						placeholder="New dashboard name..."
						autoFocus
						className="pro-text1 placeholder:pro-text3 w-full rounded-md border border-(--primary) px-3 py-2 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
				) : (
					<button
						type="button"
						onClick={handleCreateNew}
						className="pro-text2 hover:pro-text1 pro-hover-bg flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
					>
						<Icon name="plus" className="h-4 w-4" />
						<span>Create new dashboard</span>
					</button>
				)}
			</div>

			<div className="pro-border mb-4 border-t pt-4">
				<label className="pro-text3 mb-1.5 block text-xs">Chart name (optional)</label>
				<input
					type="text"
					value={chartName}
					onChange={(e) => setChartName(e.target.value)}
					placeholder={configName || 'Enter chart name...'}
					className="pro-border pro-text1 placeholder:pro-text3 w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
				/>
			</div>

			{unsupportedMetrics.length > 0 && (
				<div className="mb-4 rounded-md bg-yellow-500/10 px-3 py-2">
					<p className="text-xs text-yellow-600 dark:text-yellow-400">
						{unsupportedMetrics.length} metric{unsupportedMetrics.length > 1 ? 's' : ''} not supported:{' '}
						{unsupportedMetrics.join(', ')}
					</p>
				</div>
			)}

			<div className="flex gap-2">
				<Ariakit.DialogDismiss
					disabled={isAdding}
					className="pro-border pro-text2 hover:pro-text1 pro-hover-bg flex-1 rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-50"
				>
					Cancel
				</Ariakit.DialogDismiss>
				<button
					type="button"
					onClick={handleAdd}
					disabled={isAdding || !canSubmit}
					className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						canSubmit ? 'pro-btn-purple' : 'pro-border pro-text3 cursor-not-allowed border'
					}`}
				>
					{isAdding ? (
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
					) : (
						'Add'
					)}
				</button>
			</div>
		</Ariakit.Dialog>
	)
}
