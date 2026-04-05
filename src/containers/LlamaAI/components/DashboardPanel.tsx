import { useMutation } from '@tanstack/react-query'
import Router from 'next/router'
import { memo, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import type { DashboardArtifact } from '~/containers/LlamaAI/types'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { ChartGrid } from '~/containers/ProDashboard/components/ChartGrid'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { dashboardAPI } from '~/containers/ProDashboard/services/DashboardAPI'
import type { DashboardItemConfig } from '~/containers/ProDashboard/types'
import { useAuthContext } from '~/containers/Subscription/auth'

interface DashboardPanelProps {
	config: DashboardArtifact | null
	isOpen: boolean
	versions: DashboardArtifact[]
	versionIndex: number
	onVersionChange: (index: number) => void
	onClose: () => void
	onExited: () => void
	sessionId?: string | null
}

const NOOP = () => {}

function DashboardPanelInner({
	config,
	isOpen,
	versions,
	versionIndex,
	onVersionChange,
	onClose,
	onExited,
	sessionId
}: DashboardPanelProps) {
	const { authorizedFetch, user } = useAuthContext()

	const enrichedItems = useMemo(() => {
		if (!config) return []
		const chartData = config.chartData
		if (!chartData) return config.items
		return config.items.map((item) => {
			if (item.kind === 'llamaai-chart' && item.chartRef && chartData[item.chartRef]) {
				const bundled = chartData[item.chartRef]
				return { ...item, inlineChartConfig: bundled.config, inlineChartData: { [item.chartRef]: bundled.data } }
			}
			return item
		})
	}, [config])

	const { mutate: handleCreateDashboard, isPending } = useMutation({
		mutationFn: async () => {
			if (!config) {
				throw new Error('No dashboard configuration')
			}
			let finalItems: DashboardItemConfig[] = config.items

			const chartRefItems = finalItems.filter(
				(item): item is Extract<DashboardItemConfig, { kind: 'llamaai-chart' }> & { chartRef: string } =>
					item.kind === 'llamaai-chart' && typeof item.chartRef === 'string' && !item.savedChartId
			)
			if (chartRefItems.length > 0 && sessionId) {
				const promoteRes = await authorizedFetch(`${MCP_SERVER}/agentic/promote-charts`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sessionId, chartRefs: chartRefItems.map((item) => item.chartRef) })
				})
				if (promoteRes?.ok) {
					const data = await promoteRes.json()
					const mapping = data?.mapping || {}
					finalItems = finalItems.map((item) => {
						if (item.kind === 'llamaai-chart' && item.chartRef && mapping[item.chartRef]) {
							return { ...item, savedChartId: mapping[item.chartRef], chartRef: undefined }
						}
						return item
					})
				} else {
					throw new Error('Failed to save custom charts. Try again.')
				}
			}

			return dashboardAPI.createDashboard(
				{
					items: finalItems,
					dashboardName: config.dashboardName,
					timePeriod: (config.timePeriod as any) || '365d',
					visibility: 'private',
					tags: [],
					description: '',
					aiGenerated: sessionId
						? {
								[sessionId]: {
									mode: 'create' as const,
									timestamp: new Date().toISOString(),
									prompt: '',
									userId: user?.id || '',
									rated: false
								}
							}
						: null
				},
				authorizedFetch
			)
		},
		onSuccess: (dashboard) => {
			void Router.push(`/pro/${dashboard.id}`)
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'Failed to create dashboard')
		}
	})

	const hasMultipleVersions = versions.length > 1

	return (
		<div
			className="shrink-0 overflow-hidden pl-2.5 transition-[width] duration-200 ease-out max-lg:hidden"
			style={{ width: isOpen ? 'min(50vw, 800px)' : '0px' }}
			onTransitionEnd={(event) => {
				if (!isOpen && event.target === event.currentTarget && event.propertyName === 'width') {
					onExited()
				}
			}}
		>
			{config ? (
				<div
					className="flex h-full flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) dark:border-[#222324]"
					style={{ width: 'min(50vw, 800px)', minWidth: '400px' }}
				>
					<div className="flex items-center justify-between border-b border-[#e6e6e6] px-4 py-3 dark:border-[#222324]">
						<div className="flex items-center gap-2 overflow-hidden">
							<Icon name="layout-grid" className="h-4 w-4 shrink-0 text-[#2172e5] dark:text-[#4190f7]" />
							<span className="truncate text-sm font-medium text-[#1a1a2e] dark:text-[#e2e8f0]">
								{config.dashboardName}
							</span>
							<span className="shrink-0 text-xs text-[#636e72] dark:text-[#8a8f98]">
								{config.items.length} {config.items.length === 1 ? 'item' : 'items'}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={() => handleCreateDashboard()}
								disabled={isPending || !config}
								className="flex items-center gap-1.5 rounded-md bg-[#2172e5] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1a5bc4] disabled:opacity-50"
							>
								{isPending ? 'Creating...' : 'Create Dashboard'}
							</button>
							<button
								onClick={onClose}
								aria-label="Close"
								className="flex h-7 w-7 items-center justify-center rounded-md text-[#636e72] transition-colors hover:bg-[#e6e6e6] dark:text-[#8a8f98] dark:hover:bg-[#222324]"
							>
								<Icon name="x" className="h-4 w-4" />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto overscroll-contain p-2.5 *:gap-2.5">
						<AppMetadataProvider>
							<ProDashboardAPIProvider key={config.id} initialItems={enrichedItems}>
								<ChartGrid onAddChartClick={NOOP} forceAllowHtml />
							</ProDashboardAPIProvider>
						</AppMetadataProvider>
					</div>

					{hasMultipleVersions ? (
						<div className="flex items-center justify-center gap-3 border-t border-[#e6e6e6] px-4 py-2.5 dark:border-[#222324]">
							<button
								onClick={() => onVersionChange(versionIndex - 1)}
								disabled={versionIndex === 0}
								aria-label="Previous version"
								className="flex h-6 w-6 items-center justify-center rounded text-[#636e72] transition-colors hover:bg-[#e6e6e6] disabled:opacity-30 dark:text-[#8a8f98] dark:hover:bg-[#222324]"
							>
								<Icon name="chevron-left" className="h-3.5 w-3.5" />
							</button>
							<span className="text-xs text-[#636e72] dark:text-[#8a8f98]">
								Version {versionIndex + 1} of {versions.length}
							</span>
							<button
								onClick={() => onVersionChange(versionIndex + 1)}
								disabled={versionIndex === versions.length - 1}
								aria-label="Next version"
								className="flex h-6 w-6 items-center justify-center rounded text-[#636e72] transition-colors hover:bg-[#e6e6e6] disabled:opacity-30 dark:text-[#8a8f98] dark:hover:bg-[#222324]"
							>
								<Icon name="chevron-right" className="h-3.5 w-3.5" />
							</button>
						</div>
					) : null}
				</div>
			) : null}
		</div>
	)
}

export const DashboardPanel = memo(DashboardPanelInner)
