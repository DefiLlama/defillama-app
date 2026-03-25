import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AppMetadataProvider } from '~/containers/ProDashboard/AppMetadataContext'
import { ChartGrid } from '~/containers/ProDashboard/components/ChartGrid'
import { EmptyState } from '~/containers/ProDashboard/components/EmptyState'
import {
	ProDashboardAPIProvider,
	useProDashboardCatalog,
	useProDashboardDashboard,
	useProDashboardItemsState
} from '~/containers/ProDashboard/ProDashboardAPIContext'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { SUPERLUMINAL_PROJECTS } from './config'
import { CustomServerDataContext } from './CustomServerDataContext'
import { Logo } from './Logo'
import { type DashboardTabConfig, type DashboardModule, getDashboardModule } from './registry'

const ContentReadyContext = createContext<() => void>(() => {})
export const useContentReady = () => useContext(ContentReadyContext)

const NOOP = () => {}

const ALL_PROJECTS = [
	...SUPERLUMINAL_PROJECTS.map((p) => ({ ...p, comingSoon: false })),
	{ id: 'your-project', name: 'Your Project', dashboardId: '', comingSoon: true, customOnly: false }
]

const SKELETON_WIDTHS = [
	['w-16', 'w-4/5', 'w-14', 'w-20', 'w-12'],
	['w-14', 'w-3/5', 'w-16', 'w-16', 'w-14'],
	['w-16', 'w-2/3', 'w-12', 'w-24', 'w-10'],
	['w-14', 'w-1/2', 'w-14', 'w-20', 'w-16'],
	['w-16', 'w-3/4', 'w-16', 'w-14', 'w-12'],
	['w-14', 'w-2/5', 'w-12', 'w-20', 'w-14'],
	['w-16', 'w-3/5', 'w-14', 'w-16', 'w-10'],
	['w-14', 'w-1/2', 'w-16', 'w-24', 'w-12']
]

const PLACEHOLDER_COLS = ['', '', '', '', '']

function SkeletonTable() {
	return (
		<div className="relative overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-col">
				<div className="flex border-b border-(--divider)">
					{PLACEHOLDER_COLS.map((_, i) => (
						<div key={i} className="flex-1 px-4 py-3.5">
							<div className="h-2.5 w-16 rounded-full bg-(--text-disabled) opacity-40" />
						</div>
					))}
				</div>
				{SKELETON_WIDTHS.map((widths, r) => (
					<div
						key={r}
						className="flex border-b border-(--divider) last:border-b-0"
						style={{ opacity: Math.max(0.15, 0.7 - r * 0.08) }}
					>
						{widths.map((w, c) => (
							<div key={c} className="flex-1 px-4 py-3.5">
								<div className={`${w} h-3 rounded-full bg-(--text-disabled)`} />
							</div>
						))}
					</div>
				))}
			</div>
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-(--cards-bg) via-transparent to-transparent" />
		</div>
	)
}

function ComingSoonSection({ label }: { label: string }) {
	return (
		<div className="relative">
			<SkeletonTable />
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="rounded-full border border-(--cards-border) bg-(--cards-bg) px-5 py-2.5 text-sm font-semibold tracking-wide text-(--text-secondary) shadow-lg">
					{label} — Coming Soon
				</span>
			</div>
		</div>
	)
}

function ProjectComingSoon() {
	return (
		<div className="flex flex-1 items-center justify-center p-8">
			<div className="relative w-full max-w-2xl">
				<SkeletonTable />
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="rounded-full border border-(--cards-border) bg-(--cards-bg) px-5 py-2.5 text-sm font-semibold tracking-wide text-(--text-secondary) shadow-lg">
						Coming Soon
					</span>
				</div>
			</div>
		</div>
	)
}

const DEFAULT_TABS: DashboardTabConfig[] = [{ id: 'dashboard', label: 'Overview' }]

function useProjectModules(projects: typeof ALL_PROJECTS) {
	const [tabsByProject, setTabsByProject] = useState<Record<string, DashboardTabConfig[]>>({})
	const [headersByProject, setHeadersByProject] = useState<Record<string, DashboardModule['header']>>({})
	const [loadingProjects, setLoadingProjects] = useState<Set<string>>(() => new Set(projects.filter((p) => p.dashboardId && !p.comingSoon).map((p) => p.id)))

	useEffect(() => {
		let cancelled = false
		for (const project of projects) {
			if (!project.dashboardId || project.comingSoon) continue
			const loader = getDashboardModule(project.dashboardId)
			if (loader) {
				loader.then((mod) => {
					if (!cancelled && mod?.tabs) {
						setTabsByProject((prev) => (prev[project.id] === mod.tabs ? prev : { ...prev, [project.id]: mod.tabs }))
					}
					if (!cancelled && mod?.header) {
						setHeadersByProject((prev) => (prev[project.id] === mod.header ? prev : { ...prev, [project.id]: mod.header }))
					}
					if (!cancelled) {
						setLoadingProjects((prev) => {
							if (!prev.has(project.id)) return prev
							const next = new Set(prev)
							next.delete(project.id)
							return next
						})
					}
				})
			}
		}
		return () => {
			cancelled = true
		}
	}, [projects])

	return { tabsByProject, headersByProject, loadingProjects }
}

function DashboardTabInner({ visible }: { visible: boolean }) {
	const { items } = useProDashboardItemsState()
	const { protocolsLoading } = useProDashboardCatalog()
	const { isLoadingDashboard, currentDashboard } = useProDashboardDashboard()
	const dashboardReady = !isLoadingDashboard && !!currentDashboard

	return (
		<div className={visible ? '' : 'hidden'}>
			{dashboardReady && items.length > 0 && (
				<div className="w-full">
					<ChartGrid onAddChartClick={NOOP} />
				</div>
			)}
			{dashboardReady && !protocolsLoading && items.length === 0 && <EmptyState onAddChart={NOOP} isReadOnly />}
		</div>
	)
}

function SuperLuminalContent({
	tabs,
	activeTab,
	displayName,
	dashboardId,
	hasCustomHeader
}: {
	tabs: DashboardTabConfig[]
	activeTab: string
	displayName: string
	dashboardId: string
	hasCustomHeader?: boolean
}) {
	const prevTab = useRef(activeTab)
	const [visitedTabsBase, setVisitedTabsBase] = useState<Set<string>>(() => new Set([activeTab]))

	// Always include current activeTab synchronously — no blink waiting for useEffect
	const visitedTabs = visitedTabsBase.has(activeTab) ? visitedTabsBase : new Set([...visitedTabsBase, activeTab])

	useEffect(() => {
		setVisitedTabsBase((prev) => {
			if (prev.has(activeTab)) return prev
			return new Set(prev).add(activeTab)
		})
		if (activeTab !== prevTab.current) {
			prevTab.current = activeTab
			requestAnimationFrame(() => {
				window.dispatchEvent(new Event('resize'))
			})
		}
	}, [activeTab])

	const dashboardVisited = visitedTabs.has('dashboard')

	return (
		<>
			{!hasCustomHeader && (
				<header className="hidden items-center gap-3 md:flex">
					<h1 className="text-xl font-semibold tracking-tight pro-text1">
						{activeTab === 'dashboard' ? displayName || 'Dashboard' : tabs.find((t) => t.id === activeTab)?.label}
					</h1>
				</header>
			)}

			{dashboardVisited && (
				<ProDashboardAPIProvider key={dashboardId} initialDashboardId={dashboardId}>
					<DashboardTabInner visible={activeTab === 'dashboard'} />
				</ProDashboardAPIProvider>
			)}

			{tabs.map((tab) => {
				if (tab.id === 'dashboard') return null
				if (!visitedTabs.has(tab.id)) return null
				if (!tab.component) {
					return (
						<div key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
							<ComingSoonSection label={tab.label} />
						</div>
					)
				}
				const TabComponent = tab.component
				return (
					<div key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
						<Suspense fallback={null}>
							<TabComponent />
						</Suspense>
					</div>
				)
			})}
		</>
	)
}

function CustomOnlyContent({
	tabs,
	activeTab,
	displayName,
	hasCustomHeader
}: {
	tabs: DashboardTabConfig[]
	activeTab: string
	displayName: string
	hasCustomHeader?: boolean
}) {
	const [visitedTabsBase, setVisitedTabsBase] = useState<Set<string>>(() => new Set([activeTab]))
	const visitedTabs = visitedTabsBase.has(activeTab) ? visitedTabsBase : new Set([...visitedTabsBase, activeTab])

	useEffect(() => {
		setVisitedTabsBase((prev) => {
			if (prev.has(activeTab)) return prev
			return new Set(prev).add(activeTab)
		})
	}, [activeTab])

	return (
		<>
			{!hasCustomHeader && (
				<header className="hidden items-center gap-3 md:flex">
					<h1 className="text-xl font-semibold tracking-tight pro-text1">
						{tabs.find((t) => t.id === activeTab)?.label ?? displayName}
					</h1>
				</header>
			)}

			{tabs.map((tab) => {
				if (!tab.component || !visitedTabs.has(tab.id)) return null
				const TabComponent = tab.component
				return (
					<div key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
						<Suspense fallback={null}>
							<TabComponent />
						</Suspense>
					</div>
				)
			})}
		</>
	)
}

function SuperLuminalShell({
	protocol,
	customServerData
}: {
	protocol?: string
	customServerData?: Record<string, unknown>
}) {
	const [isDark, toggleTheme] = useDarkModeManager()

	const isSingleProtocol = !!protocol
	const visibleProjects = protocol ? ALL_PROJECTS.filter((p) => p.id === protocol) : ALL_PROJECTS
	const defaultProject = visibleProjects[0]?.id ?? ALL_PROJECTS[0].id

	const { tabsByProject, headersByProject, loadingProjects } = useProjectModules(visibleProjects)
	const [activeTab, setActiveTab] = useState<string | null>(null)
	const [activeProject, setActiveProject] = useState(defaultProject)
	const [expandedProject, setExpandedProject] = useState<string | null>(defaultProject)
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [contentReadyProjects, setContentReadyProjects] = useState<Set<string>>(new Set())

	const closeSidebar = useCallback(() => setSidebarOpen(false), [])
	const markContentReady = useCallback(() => {
		setContentReadyProjects((prev) => {
			if (prev.has(activeProject)) return prev
			return new Set(prev).add(activeProject)
		})
	}, [activeProject])

	const activeProjectConfig = visibleProjects.find((p) => p.id === activeProject)
	const dashboardId = activeProjectConfig?.dashboardId ?? visibleProjects[0]?.dashboardId ?? ALL_PROJECTS[0].dashboardId
	const displayName = activeProjectConfig?.name ?? 'Dashboard'
	const tabs = tabsByProject[activeProject] ?? DEFAULT_TABS
	const HeaderComponent = headersByProject[activeProject]
	// Derive the effective tab: use activeTab if set and valid, otherwise first tab
	const resolvedTab = activeTab && tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id ?? 'dashboard'

	// Only show the global loader when the active tab is the pro dashboard (Overview) tab.
	// Custom tabs handle their own loading state and should not be blocked by the stream.
	const showGlobalLoader = !!HeaderComponent && !contentReadyProjects.has(activeProject) && resolvedTab === 'dashboard'

	// Auto-select first tab once tabs load (only if user hasn't manually selected)
	useEffect(() => {
		if (activeTab === null && tabs.length > 0 && tabs !== DEFAULT_TABS) {
			setActiveTab(tabs[0].id)
		}
	}, [tabs, activeTab])

	return (
		<CustomServerDataContext.Provider value={customServerData ?? {}}>
		<div className="superluminal-dashboard col-span-full flex min-h-screen flex-col pro-dashboard bg-(--app-bg) md:flex-row">
			{sidebarOpen && <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={closeSidebar} />}

			<div className="sticky top-0 z-10 flex items-center gap-3 bg-(--app-bg) px-4 py-3 md:hidden">
				<button
					onClick={() => setSidebarOpen(true)}
					className="flex h-8 w-8 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--sl-hover-bg) hover:text-(--text-primary)"
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
					</svg>
				</button>
				<Logo size="sm" />
			</div>

			<aside
				className={`sl-sidebar fixed top-0 left-0 z-30 flex h-screen w-56 shrink-0 flex-col overflow-hidden px-3 pt-6 pb-4 transition-transform duration-200 ${
					sidebarOpen ? 'translate-x-0' : '-translate-x-full'
				} md:z-10 md:translate-x-0`}
			>
				<div className="hidden flex-col items-center pb-3 md:flex">
					<Logo />
				</div>
				<div className="mb-3 hidden h-px bg-(--sl-divider) md:block" />

				<nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
					{visibleProjects.map((project) => {
						const isActive = activeProject === project.id
						const isExpanded = isSingleProtocol || (expandedProject === project.id && !project.comingSoon)

						return (
							<div key={project.id}>
								<button
									onClick={() => {
										if (isSingleProtocol) return
										if (isActive && !project.comingSoon) {
											setExpandedProject(isExpanded ? null : project.id)
										} else {
											setActiveProject(project.id)
											setExpandedProject(project.comingSoon ? expandedProject : project.id)
											if (!project.comingSoon) {
												const projectTabs = tabsByProject[project.id]
												setActiveTab(projectTabs?.[0]?.id ?? 'dashboard')
											}
											closeSidebar()
										}
									}}
									className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-semibold tracking-wide transition-colors ${
										isActive
											? 'text-(--sl-accent)'
											: 'text-(--text-secondary) hover:bg-(--sl-hover-bg) hover:text-(--text-primary)'
									}`}
								>
									{!isSingleProtocol && (
										<svg
											width="12"
											height="12"
											viewBox="0 0 12 12"
											fill="none"
											className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
										>
											<path
												d="M4.5 2.5L8 6L4.5 9.5"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									)}
									{project.name}
									{project.comingSoon && (
										<span className="ml-auto rounded-full bg-(--sl-btn-inactive-bg) px-1.5 py-0.5 text-[10px] font-normal text-(--text-tertiary)">
											Soon
										</span>
									)}
								</button>

								{isExpanded && (
									<div className="ml-3 flex flex-col gap-0.5 border-l border-(--sl-divider) pt-1 pl-2">
										{(tabsByProject[project.id] ?? DEFAULT_TABS).map((tab) => (
											<button
												key={tab.id}
												onClick={() => {
													setActiveTab(tab.id)
													closeSidebar()
												}}
												className={`rounded-md px-3 py-1.5 text-left text-[12px] font-medium tracking-wide transition-colors ${
													resolvedTab === tab.id
														? 'bg-(--sl-accent-muted) text-(--sl-accent)'
														: 'text-(--text-secondary) hover:bg-(--sl-hover-bg) hover:text-(--text-primary)'
												}`}
											>
												{tab.label}
											</button>
										))}
									</div>
								)}
							</div>
						)
					})}
				</nav>

				<div className="mt-auto flex items-center justify-end pt-4">
					<button
						onClick={toggleTheme}
						className="flex h-8 w-8 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sl-hover-bg) hover:text-(--text-primary)"
					>
						{isDark ? (
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
								<path
									d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
								/>
							</svg>
						) : (
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<path
									d="M14 9.68A6.5 6.5 0 0 1 6.32 2 6.5 6.5 0 1 0 14 9.68Z"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						)}
					</button>
				</div>
			</aside>

			<div className="relative flex flex-1 flex-col gap-4 p-5 md:ml-56">
				{showGlobalLoader && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-(--app-bg) md:left-56">
						<Logo animate />
					</div>
				)}
				<ContentReadyContext.Provider value={markContentReady}>
					{HeaderComponent && (
						<Suspense fallback={null}>
							<HeaderComponent />
						</Suspense>
					)}
					{activeProjectConfig?.comingSoon ? (
						<ProjectComingSoon />
					) : activeProjectConfig?.customOnly ? (
						<CustomOnlyContent tabs={tabs} activeTab={resolvedTab} displayName={displayName} hasCustomHeader={!!HeaderComponent} />
					) : loadingProjects.has(activeProject) ? null : (
						<SuperLuminalContent tabs={tabs} activeTab={resolvedTab} displayName={displayName} dashboardId={dashboardId} hasCustomHeader={!!HeaderComponent} />
					)}
				</ContentReadyContext.Provider>
			</div>
		</div>
		</CustomServerDataContext.Provider>
	)
}

export default function SuperLuminalDashboard({
	protocol,
	customServerData
}: {
	protocol?: string
	customServerData?: Record<string, unknown>
}) {
	return (
		<AppMetadataProvider>
			<SuperLuminalShell
				protocol={protocol}
				customServerData={customServerData}
			/>
		</AppMetadataProvider>
	)
}
