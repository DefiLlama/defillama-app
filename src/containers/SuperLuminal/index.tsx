import { Suspense, useEffect, useState } from 'react'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { ChartGrid } from '~/containers/ProDashboard/components/ChartGrid'
import { EmptyState } from '~/containers/ProDashboard/components/EmptyState'
import {
	useProDashboardCatalog,
	useProDashboardDashboard,
	useProDashboardItemsState
} from '~/containers/ProDashboard/ProDashboardAPIContext'
import { getSuperLuminalConfig } from './config'
import { DashboardTabConfig, getDashboardModule } from './registry'

const NOOP = () => {}

const DEFAULT_TABS: DashboardTabConfig[] = [{ id: 'dashboard', label: 'Dashboard' }]

function SuperLuminalContent() {
	const config = getSuperLuminalConfig()
	const { items } = useProDashboardItemsState()
	const { protocolsLoading } = useProDashboardCatalog()
	const { dashboardName, isLoadingDashboard } = useProDashboardDashboard()

	const [tabs, setTabs] = useState<DashboardTabConfig[]>(DEFAULT_TABS)
	const [activeTab, setActiveTab] = useState('dashboard')

	useEffect(() => {
		if (!config?.dashboardId) return
		let cancelled = false
		getDashboardModule(config.dashboardId)?.then((mod) => {
			if (!cancelled && mod?.tabs) {
				setTabs(mod.tabs)
			}
		})
		return () => {
			cancelled = true
		}
	}, [config?.dashboardId])

	const displayName = config?.branding.name || dashboardName

	if (isLoadingDashboard) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-(--app-bg)">
				<div className="sl-loader text-center leading-none select-none">
					<span className="block text-[13px] font-medium tracking-[0.4em] text-white/40">SUPER</span>
					<span
						className="block text-[34px] font-black tracking-[0.08em] text-transparent"
						style={{ WebkitTextStroke: '1px #00d4ff' }}
					>
						LUMINAL
					</span>
				</div>
			</div>
		)
	}

	return (
		<div className="superluminal-dashboard col-span-full flex min-h-screen flex-row pro-dashboard bg-(--app-bg)">
			<aside className="sl-sidebar fixed top-0 left-0 z-10 flex h-screen w-56 shrink-0 flex-col overflow-hidden px-3 pt-6 pb-4">
				<div className="flex flex-col items-center gap-2 pb-5">
					<div className="text-center leading-none select-none">
						<span className="block text-[11px] font-medium tracking-[0.4em] text-white/40">SUPER</span>
						<span
							className="block text-[28px] font-black tracking-[0.08em] text-transparent"
							style={{ WebkitTextStroke: '1px #00d4ff' }}
						>
							LUMINAL
						</span>
					</div>
					<span className="sl-powered-badge text-[10px] tracking-wide text-white/35">
						Powered by <span className="sl-powered-brand font-semibold">DefiLlama</span>
					</span>
				</div>
				<div className="mb-3 h-px bg-white/[0.04]" />
				<nav className="flex flex-col gap-0.5">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`px-3 py-2 text-left text-[13px] font-medium tracking-wide transition-colors ${
								activeTab === tab.id ? 'sl-tab-active' : 'sl-tab-inactive'
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</aside>

			<div className="ml-56 flex flex-1 flex-col gap-4 p-5">
				<header className="flex items-center">
					<h1 className="text-xl font-semibold tracking-tight pro-text1">
						{activeTab === 'dashboard' ? displayName || 'Dashboard' : tabs.find((t) => t.id === activeTab)?.label}
					</h1>
				</header>

				{activeTab === 'dashboard' && (
					<>
						{items.length > 0 && (
							<div className="w-full">
								<ChartGrid onAddChartClick={NOOP} />
							</div>
						)}
						{!protocolsLoading && items.length === 0 && <EmptyState onAddChart={NOOP} isReadOnly />}
					</>
				)}

				{activeTab !== 'dashboard' &&
					tabs.map((tab) => {
						if (tab.id !== activeTab || !tab.component) return null
						const TabComponent = tab.component
						return (
							<Suspense
								key={tab.id}
								fallback={
									<div className="flex flex-1 items-center justify-center py-20">
										<div className="sl-loader text-center leading-none select-none">
											<span className="block text-[13px] font-medium tracking-[0.4em] text-white/40">SUPER</span>
											<span
												className="block text-[34px] font-black tracking-[0.08em] text-transparent"
												style={{ WebkitTextStroke: '1px #00d4ff' }}
											>
												LUMINAL
											</span>
										</div>
									</div>
								}
							>
								<TabComponent />
							</Suspense>
						)
					})}
			</div>
		</div>
	)
}

export default function SuperLuminalDashboard() {
	return (
		<AppMetadataProvider>
			<SuperLuminalContent />
		</AppMetadataProvider>
	)
}
