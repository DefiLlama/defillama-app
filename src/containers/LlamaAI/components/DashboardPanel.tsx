import Router from 'next/router'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import type { DashboardArtifact } from '~/containers/LlamaAI/types'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { ChartGrid } from '~/containers/ProDashboard/components/ChartGrid'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { dashboardAPI } from '~/containers/ProDashboard/services/DashboardAPI'
import type { DashboardItemConfig } from '~/containers/ProDashboard/types'
import { useAuthContext } from '~/containers/Subscribtion/auth'

interface DashboardPanelProps {
	config: DashboardArtifact | null
	versions: DashboardArtifact[]
	versionIndex: number
	onVersionChange: (index: number) => void
	onClose: () => void
	sessionId?: string | null
}

const NOOP = () => {}

function DashboardPanelInner({
	config,
	versions,
	versionIndex,
	onVersionChange,
	onClose,
	sessionId
}: DashboardPanelProps) {
	const { authorizedFetch, user } = useAuthContext()
	const [isCreating, setIsCreating] = useState(false)
	const [animState, setAnimState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed')
	const lastConfigRef = useRef<DashboardArtifact | null>(null)

	if (config) lastConfigRef.current = config
	const displayConfig = config || lastConfigRef.current
	const isConfigPresent = !!config

	const enrichedItems = useMemo(() => {
		if (!displayConfig) return []
		const chartData = displayConfig.chartData
		if (!chartData) return displayConfig.items as DashboardItemConfig[]
		return (displayConfig.items as DashboardItemConfig[]).map((item: any) => {
			if (item.kind === 'llamaai-chart' && item.chartRef && chartData[item.chartRef]) {
				const bundled = chartData[item.chartRef]
				return { ...item, inlineChartConfig: bundled.config, inlineChartData: { [item.chartRef]: bundled.data } }
			}
			return item
		})
	}, [displayConfig])

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		setAnimState((prev) => {
			if (isConfigPresent) {
				if (prev === 'closed' || prev === 'closing') {
					timer = setTimeout(() => setAnimState('open'), 20)
					return 'opening'
				}
			} else {
				if (prev === 'open' || prev === 'opening') {
					timer = setTimeout(() => setAnimState('closed'), 200)
					return 'closing'
				}
			}
			return prev
		})
		return () => {
			if (timer) clearTimeout(timer)
		}
	}, [isConfigPresent])

	const handleCreateDashboard = async () => {
		if (isCreating || !displayConfig) return
		setIsCreating(true)
		try {
			let finalItems = displayConfig.items as DashboardItemConfig[]

			const chartRefItems = finalItems.filter((i: any) => i.kind === 'llamaai-chart' && i.chartRef && !i.savedChartId)
			if (chartRefItems.length > 0 && sessionId) {
				const promoteRes = await authorizedFetch(`${MCP_SERVER}/agentic/promote-charts`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sessionId, chartRefs: chartRefItems.map((i: any) => i.chartRef) })
				})
				if (promoteRes?.ok) {
					const data = await promoteRes.json()
					const mapping = data?.mapping || {}
					finalItems = finalItems.map((item: any) => {
						if (item.kind === 'llamaai-chart' && item.chartRef && mapping[item.chartRef]) {
							return { ...item, savedChartId: mapping[item.chartRef], chartRef: undefined }
						}
						return item
					})
				} else {
					toast.error('Failed to save custom charts. Try again.')
					setIsCreating(false)
					return
				}
			}

			const dashboard = await dashboardAPI.createDashboard(
				{
					items: finalItems,
					dashboardName: displayConfig.dashboardName,
					timePeriod: (displayConfig.timePeriod as any) || '365d',
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
			void Router.push(`/pro/${dashboard.id}`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create dashboard')
		} finally {
			setIsCreating(false)
		}
	}

	if (animState === 'closed' || !displayConfig) return null

	const isOpen = animState === 'open'
	const hasMultipleVersions = versions.length > 1

	return (
		<div
			className="shrink-0 overflow-hidden pl-2.5 transition-[width] duration-200 ease-out max-lg:hidden"
			style={{ width: isOpen ? 'min(50vw, 800px)' : '0px' }}
		>
			<div
				className="flex h-full flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) dark:border-[#222324]"
				style={{ width: 'min(50vw, 800px)', minWidth: '400px' }}
			>
				<div className="flex items-center justify-between border-b border-[#e6e6e6] px-4 py-3 dark:border-[#222324]">
					<div className="flex items-center gap-2 overflow-hidden">
						<Icon name="layout-grid" className="h-4 w-4 shrink-0 text-[#2172e5] dark:text-[#4190f7]" />
						<span className="truncate text-sm font-medium text-[#1a1a2e] dark:text-[#e2e8f0]">
							{displayConfig.dashboardName}
						</span>
						<span className="shrink-0 text-xs text-[#636e72] dark:text-[#8a8f98]">
							{displayConfig.items.length} {displayConfig.items.length === 1 ? 'item' : 'items'}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={handleCreateDashboard}
							disabled={isCreating}
							className="flex items-center gap-1.5 rounded-md bg-[#2172e5] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1a5bc4] disabled:opacity-50"
						>
							{isCreating ? 'Creating...' : 'Create Dashboard'}
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
						<ProDashboardAPIProvider key={displayConfig.id} initialItems={enrichedItems}>
							<ChartGrid onAddChartClick={NOOP} />
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
		</div>
	)
}

export const DashboardPanel = memo(DashboardPanelInner)
