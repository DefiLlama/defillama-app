import * as Ariakit from '@ariakit/react'
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { type KeyboardEvent, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { useGetLiteDashboards } from '~/containers/ProDashboard/hooks/useDashboardAPI'
import { type Dashboard, dashboardAPI } from '~/containers/ProDashboard/services/DashboardAPI'
import type { LlamaAIChartConfig } from '~/containers/ProDashboard/types'
import { addItemToDashboard } from '~/containers/ProDashboard/utils/dashboardItemsUtils'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { FormSubmitEvent } from '~/types/forms'
import type { DashboardChartConfig, LlamaAIChartInput } from './AddToDashboardButton'

const EMPTY_DASHBOARDS: Dashboard[] = []
const EMPTY_UNSUPPORTED_METRICS: string[] = []
type AddToDashboardSubmitType = 'new-dashboard' | 'existing-dashboard'

interface AddToDashboardModalProps {
	dialogStore: Ariakit.DialogStore
	chartConfig: DashboardChartConfig | null
	llamaAIChart?: LlamaAIChartInput | null
	unsupportedMetrics?: string[]
}

function getConfigName(config: DashboardChartConfig | null, llamaAIChart?: LlamaAIChartInput | null): string {
	if (llamaAIChart) return llamaAIChart.title
	if (!config) return ''
	if (config.kind === 'multi') {
		return config.name || ''
	}
	if (config.kind === 'yields') {
		return config.poolName || ''
	}
	if (config.kind === 'stablecoins') {
		const chartTypeLabels: Record<string, string> = {
			totalMcap: 'Total Market Cap',
			tokenMcaps: 'Token Market Caps',
			pie: 'Pie',
			dominance: 'Dominance',
			usdInflows: 'USD Inflows',
			tokenInflows: 'Token Inflows'
		}
		const label = chartTypeLabels[config.chartType] || config.chartType
		return config.chain === 'All' ? `Stablecoins ${label}` : `${config.chain} Stablecoins ${label}`
	}
	if (config.kind === 'stablecoin-asset') {
		const chartTypeLabels: Record<string, string> = {
			totalCirc: 'Total Circulating',
			chainMcaps: 'By Chain',
			chainPie: 'Pie',
			chainDominance: 'Chain Dominance'
		}
		const label = chartTypeLabels[config.chartType] || config.chartType
		return `${config.stablecoin} ${label}`
	}
	return config.name || ''
}

function invalidateDashboardQueries(queryClient: QueryClient) {
	queryClient.invalidateQueries({ queryKey: ['dashboards'] })
	queryClient.invalidateQueries({ queryKey: ['my-dashboards'] })
	queryClient.invalidateQueries({ queryKey: ['lite-dashboards'] })
}

function trackAddToDashboardSubmit(type: AddToDashboardSubmitType) {
	if (typeof window === 'undefined') return
	const maybeUmami = Reflect.get(window, 'umami')
	if (typeof maybeUmami !== 'object' || maybeUmami === null) return
	const maybeTrack = Reflect.get(maybeUmami, 'track')
	if (typeof maybeTrack !== 'function') return
	Reflect.apply(maybeTrack, maybeUmami, ['add-to-dashboard-submit', { type }])
}

function safeTrackAddToDashboardSubmit(type: AddToDashboardSubmitType) {
	try {
		trackAddToDashboardSubmit(type)
	} catch {
		// Ignore analytics failures so dashboard operations can still succeed.
	}
}

function showViewToast(message: string, href: string, onNavigate: (href: string) => void) {
	toast.success(
		(t) => (
			<div>
				{message}{' '}
				<button
					type="button"
					className="underline"
					onClick={() => {
						toast.dismiss(t.id)
						onNavigate(href)
					}}
				>
					View →
				</button>
			</div>
		),
		{ duration: 5000 }
	)
}

function getErrorMessage(error: unknown, fallback: string): string {
	const errorMsg = error instanceof Error ? error.message : ''
	return errorMsg || fallback
}

interface AddToDashboardMutationVariables {
	isCreatingNew: boolean
	nextDashboardName: string
	nextChartName: string
	selectedDashboardId: string | null
}

interface AddToDashboardMutationResult {
	type: AddToDashboardSubmitType
	message: string
	href: string
}

interface BuildChartToAddParams {
	authorizedFetch: ReturnType<typeof useAuthContext>['authorizedFetch']
	chartConfig: DashboardChartConfig | null
	llamaAIChart?: LlamaAIChartInput | null
	configName: string
	nextChartName: string
}

async function buildChartToAdd({
	authorizedFetch,
	chartConfig,
	llamaAIChart,
	configName,
	nextChartName
}: BuildChartToAddParams): Promise<DashboardChartConfig | LlamaAIChartConfig | null> {
	if (llamaAIChart) {
		const res = await authorizedFetch(`${MCP_SERVER}/charts`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messageId: llamaAIChart.messageId, chartId: llamaAIChart.chartId })
		})
		if (!res.ok) {
			throw new Error('Failed to save chart')
		}
		const { id: savedChartId } = await res.json()

		return {
			id: crypto.randomUUID(),
			kind: 'llamaai-chart',
			savedChartId,
			title: nextChartName || llamaAIChart.title
		} satisfies LlamaAIChartConfig
	}

	if (!chartConfig) return null
	if (chartConfig.kind === 'multi' || chartConfig.kind === 'builder') {
		return { ...chartConfig, name: nextChartName || configName }
	}
	return { ...chartConfig }
}

interface SubmitAddToDashboardParams {
	authorizedFetch: ReturnType<typeof useAuthContext>['authorizedFetch']
	chartConfig: DashboardChartConfig | null
	llamaAIChart?: LlamaAIChartInput | null
	configName: string
	dashboardNameById: Map<string, string>
	variables: AddToDashboardMutationVariables
}

async function submitAddToDashboard({
	authorizedFetch,
	chartConfig,
	llamaAIChart,
	configName,
	dashboardNameById,
	variables
}: SubmitAddToDashboardParams): Promise<AddToDashboardMutationResult> {
	const chartToAdd = await buildChartToAdd({
		authorizedFetch,
		chartConfig,
		llamaAIChart,
		configName,
		nextChartName: variables.nextChartName
	})
	if (!chartToAdd) {
		throw new Error('No chart to add')
	}

	if (variables.isCreatingNew) {
		const dashboard = await dashboardAPI.createDashboard(
			{
				items: [chartToAdd],
				dashboardName: variables.nextDashboardName,
				timePeriod: '90d',
				visibility: 'private',
				tags: [],
				description: ''
			},
			authorizedFetch
		)

		return {
			type: 'new-dashboard',
			message: 'Dashboard created!',
			href: `/pro/${dashboard.id}`
		}
	}

	const selectedDashboardId = variables.selectedDashboardId
	if (!selectedDashboardId) {
		throw new Error('Please select a dashboard')
	}

	await addItemToDashboard(selectedDashboardId, chartToAdd, authorizedFetch)
	const selectedName = dashboardNameById.get(selectedDashboardId) ?? 'dashboard'

	return {
		type: 'existing-dashboard',
		message: `Added to ${selectedName}!`,
		href: `/pro/${selectedDashboardId}`
	}
}

export function AddToDashboardModal({
	dialogStore,
	chartConfig,
	llamaAIChart,
	unsupportedMetrics = EMPTY_UNSUPPORTED_METRICS
}: AddToDashboardModalProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated, hasActiveSubscription } = useAuthContext()
	const { data: dashboardsData, isLoading: isLoadingDashboards } = useGetLiteDashboards()
	const dashboards = dashboardsData ?? EMPTY_DASHBOARDS

	const configName = getConfigName(chartConfig, llamaAIChart)
	const [search, setSearch] = useState('')
	const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null)
	const [isCreatingNew, setIsCreatingNew] = useState(false)
	const [newDashboardNameInput, setNewDashboardNameInput] = useState('')
	const deferredSearch = useDeferredValue(search)
	const formRef = useRef<HTMLFormElement>(null)

	const filteredDashboards = useMemo(() => {
		const query = deferredSearch.trim().toLowerCase()
		if (!query) return dashboards
		return dashboards.filter((dashboard) => dashboard.name.toLowerCase().includes(query))
	}, [dashboards, deferredSearch])

	const dashboardNameById = useMemo(() => {
		return new Map<string, string>(dashboards.map((dashboard) => [dashboard.id, dashboard.name]))
	}, [dashboards])

	const handleSelectDashboard = useCallback((id: string) => {
		setSelectedDashboardId(id)
		setIsCreatingNew(false)
	}, [])

	const handleCreateNew = useCallback(() => {
		setIsCreatingNew(true)
		setSelectedDashboardId(null)
		setNewDashboardNameInput('')
	}, [])

	const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()
		}
	}, [])

	const { mutate: submitAddToDashboardMutation, isPending: isSubmitting } = useMutation({
		mutationFn: async (variables: AddToDashboardMutationVariables) => {
			return submitAddToDashboard({
				authorizedFetch,
				chartConfig,
				llamaAIChart,
				configName,
				dashboardNameById,
				variables
			})
		},
		onSuccess: (result) => {
			invalidateDashboardQueries(queryClient)
			safeTrackAddToDashboardSubmit(result.type)
			showViewToast(result.message, result.href, router.push)
			dialogStore.hide()
		},
		onError: (error, variables) => {
			const fallbackErrorMessage = variables.isCreatingNew ? 'Failed to create dashboard' : 'Failed to add chart'
			toast.error(getErrorMessage(error, fallbackErrorMessage))
		}
	})

	const handleAdd = useCallback(
		(event: FormSubmitEvent) => {
			event.preventDefault()
			if (!isAuthenticated || !hasActiveSubscription) return
			if (isSubmitting) return

			const formData = new FormData(event.currentTarget)
			const nextDashboardName = `${formData.get('newDashboardName') ?? ''}`.trim()
			const nextChartName = `${formData.get('chartName') ?? ''}`.trim()

			if (isCreatingNew && !nextDashboardName) {
				toast.error('Please enter a dashboard name')
				return
			}

			if (!isCreatingNew && !selectedDashboardId) {
				toast.error('Please select a dashboard')
				return
			}

			submitAddToDashboardMutation({
				isCreatingNew,
				nextDashboardName,
				nextChartName,
				selectedDashboardId
			})
		},
		[
			hasActiveSubscription,
			isAuthenticated,
			isCreatingNew,
			isSubmitting,
			selectedDashboardId,
			submitAddToDashboardMutation
		]
	)

	if (!isAuthenticated || !hasActiveSubscription) {
		return null
	}

	const canSubmit = isCreatingNew ? newDashboardNameInput.trim().length > 0 : selectedDashboardId !== null

	return (
		<Ariakit.Dialog
			store={dialogStore}
			className="dialog w-full max-w-md gap-0 overflow-hidden border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-0 shadow-2xl"
			unmountOnHide
			portal
			hideOnInteractOutside
		>
			<div className="h-1 w-full bg-linear-to-r from-pro-purple-300/60 via-pro-blue-300/40 to-transparent" />

			<form ref={formRef} onSubmit={handleAdd} className="p-5">
				<div className="mb-5 flex items-center justify-between">
					<Ariakit.DialogHeading className="text-lg font-semibold tracking-tight pro-text1">
						Add to Dashboard
					</Ariakit.DialogHeading>
					<Ariakit.DialogDismiss className="rounded-md pro-hover-bg p-1.5 pro-text3 transition-colors hover:pro-text1">
						<Icon name="x" height={16} width={16} />
					</Ariakit.DialogDismiss>
				</div>

				<div className="relative mb-4">
					<Icon name="search" className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 pro-text3" />
					<input
						type="text"
						defaultValue=""
						onChange={(e) => setSearch(e.target.value)}
						onKeyDown={handleSearchKeyDown}
						placeholder="Search dashboards..."
						className="w-full rounded-md border pro-border pro-bg2 py-2 pr-3 pl-9 text-sm pro-text1 transition-colors placeholder:pro-text3 focus:border-pro-blue-300/40 focus:ring-1 focus:ring-pro-blue-300/30 focus:outline-hidden"
					/>
				</div>

				<div className="-mx-1 mb-4 thin-scrollbar max-h-56 overflow-y-auto px-1">
					{isLoadingDashboards ? (
						<div className="flex items-center justify-center py-8">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-pro-blue-300 border-t-transparent" />
						</div>
					) : filteredDashboards.length === 0 && !search.trim() ? (
						<p className="py-6 text-center text-sm pro-text3">No dashboards yet</p>
					) : filteredDashboards.length === 0 ? (
						<p className="py-6 text-center text-sm pro-text3">No matches found</p>
					) : (
						<div className="space-y-0.5">
							{filteredDashboards.map((dashboard: (typeof dashboards)[number]) => {
								const isSelected = selectedDashboardId === dashboard.id
								return (
									<button
										key={dashboard.id}
										type="button"
										onClick={() => handleSelectDashboard(dashboard.id)}
										className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-all duration-150 ${
											isSelected
												? 'bg-pro-blue-300/10 text-pro-blue-400 dark:bg-pro-blue-300/15 dark:text-pro-blue-200'
												: 'pro-hover-bg pro-text2 hover:pro-text1'
										}`}
									>
										<div
											className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-150 ${
												isSelected ? 'bg-pro-blue-300 shadow-sm shadow-pro-blue-300/30' : 'border pro-border'
											}`}
										>
											{isSelected && <Icon name="check" className="h-2.5 w-2.5 text-white" />}
										</div>
										<span className="truncate">{dashboard.name}</span>
									</button>
								)
							})}
						</div>
					)}
				</div>

				<div className="mb-4">
					{isCreatingNew ? (
						<input
							type="text"
							name="newDashboardName"
							required={isCreatingNew}
							autoFocus
							onChange={(e) => setNewDashboardNameInput(e.target.value)}
							placeholder="New dashboard name..."
							className="w-full rounded-md border border-pro-blue-300/40 pro-bg2 px-3 py-2 text-sm pro-text1 transition-colors placeholder:pro-text3 focus:ring-1 focus:ring-pro-blue-300/30 focus:outline-hidden"
						/>
					) : (
						<button
							type="button"
							onClick={handleCreateNew}
							className="flex w-full items-center gap-2 rounded-md border border-dashed pro-border px-3 py-2 text-sm pro-text3 transition-colors hover:border-pro-blue-300/40 hover:bg-pro-blue-300/5 hover:pro-text1"
						>
							<Icon name="plus" className="h-3.5 w-3.5" />
							<span>Create new dashboard</span>
						</button>
					)}
				</div>

				{chartConfig && (chartConfig.kind === 'multi' || chartConfig.kind === 'builder') ? (
					<div className="mb-4 border-t pro-divider pt-4">
						<label className="mb-1.5 block text-xs font-medium pro-text3">Chart name</label>
						<input
							type="text"
							name="chartName"
							defaultValue={configName}
							placeholder={configName || 'Enter chart name...'}
							className="w-full rounded-md border pro-border pro-bg2 px-3 py-2 text-sm pro-text1 transition-colors placeholder:pro-text3 focus:border-pro-blue-300/40 focus:ring-1 focus:ring-pro-blue-300/30 focus:outline-hidden"
						/>
					</div>
				) : null}

				{unsupportedMetrics.length > 0 && (
					<div className="mb-4 rounded-md border border-pro-gold-300/20 bg-pro-gold-300/5 px-3 py-2">
						<p className="text-xs text-pro-gold-400 dark:text-pro-gold-200">
							{unsupportedMetrics.length} metric{unsupportedMetrics.length > 1 ? 's' : ''} not supported:{' '}
							{unsupportedMetrics.join(', ')}
						</p>
					</div>
				)}

				<div className="flex gap-2.5 border-t pro-divider pt-4">
					<Ariakit.DialogDismiss
						disabled={isSubmitting}
						className="flex-1 rounded-md border pro-border pro-hover-bg px-3 py-2 text-sm pro-text3 transition-colors hover:pro-text1 disabled:opacity-50"
					>
						Cancel
					</Ariakit.DialogDismiss>
					<button
						type="submit"
						disabled={isSubmitting || !canSubmit}
						className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
							canSubmit ? 'pro-btn-blue' : 'cursor-not-allowed border pro-border pro-text3 opacity-50'
						}`}
					>
						{isSubmitting ? (
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						) : (
							<>
								<Icon name="plus" className="h-3.5 w-3.5" />
								Add to Dashboard
							</>
						)}
					</button>
				</div>
			</form>
		</Ariakit.Dialog>
	)
}
