import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Router from 'next/router'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { dashboardAPI } from '~/containers/ProDashboard/services/DashboardAPI'
import type { DashboardItemConfig } from '~/containers/ProDashboard/types'
import type { DashboardArtifact } from '~/containers/LlamaAI/types'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { ChartGrid } from '~/containers/ProDashboard/components/ChartGrid'

interface DashboardPanelProps {
	config: DashboardArtifact | null
	versions: DashboardArtifact[]
	versionIndex: number
	onVersionChange: (index: number) => void
	onClose: () => void
	sessionId?: string | null
}

const NOOP = () => {}

function DashboardPanelInner({ config, versions, versionIndex, onVersionChange, onClose, sessionId }: DashboardPanelProps) {
	const { authorizedFetch, user } = useAuthContext()
	const [isCreating, setIsCreating] = useState(false)
	const [animState, setAnimState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed')
	const lastConfigRef = useRef<DashboardArtifact | null>(null)

	if (config) lastConfigRef.current = config
	const displayConfig = config || lastConfigRef.current
	const isConfigPresent = !!config

	useEffect(() => {
		if (isConfigPresent) {
			if (animState === 'closed' || animState === 'closing') {
				setAnimState('opening')
				const timer = setTimeout(() => setAnimState('open'), 20)
				return () => clearTimeout(timer)
			}
		} else {
			if (animState === 'open' || animState === 'opening') {
				setAnimState('closing')
				const timer = setTimeout(() => setAnimState('closed'), 200)
				return () => clearTimeout(timer)
			}
		}
	}, [isConfigPresent])

	const handleClose = useCallback(() => {
		onClose()
	}, [onClose])

	const handleCreateDashboard = async () => {
		if (isCreating || !displayConfig) return
		setIsCreating(true)
		try {
			const dashboard = await dashboardAPI.createDashboard(
				{
					items: displayConfig.items as DashboardItemConfig[],
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
			console.error('Failed to create dashboard:', err)
		} finally {
			setIsCreating(false)
		}
	}

	if (animState === 'closed' || !displayConfig) return null

	const isOpen = animState === 'open'
	const hasMultipleVersions = versions.length > 1

	return (
		<div
			className="shrink-0 overflow-hidden transition-[width] duration-200 ease-out max-lg:hidden"
			style={{ width: isOpen ? 'min(50vw, 800px)' : '0px' }}
		>
			<div className="flex h-full flex-col border-l border-[#e6e6e6] bg-(--cards-bg) dark:border-[#222324]" style={{ width: 'min(50vw, 800px)', minWidth: '400px' }}>
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
							onClick={handleClose}
							className="flex h-7 w-7 items-center justify-center rounded-md text-[#636e72] transition-colors hover:bg-[#e6e6e6] dark:text-[#8a8f98] dark:hover:bg-[#222324]"
						>
							<Icon name="x" className="h-4 w-4" />
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					<AppMetadataProvider>
						<ProDashboardAPIProvider initialItems={displayConfig.items as DashboardItemConfig[]}>
							<ChartGrid onAddChartClick={NOOP} />
						</ProDashboardAPIProvider>
					</AppMetadataProvider>
				</div>

				{hasMultipleVersions ? (
					<div className="flex items-center justify-center gap-3 border-t border-[#e6e6e6] px-4 py-2.5 dark:border-[#222324]">
						<button
							onClick={() => onVersionChange(versionIndex - 1)}
							disabled={versionIndex === 0}
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
