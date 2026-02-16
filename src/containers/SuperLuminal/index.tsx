import { Suspense, useCallback, useEffect, useState } from 'react'
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
import { Logo } from './Logo'
import { type DashboardTabConfig, getDashboardModule } from './registry'

const NOOP = () => {}

const PROJECTS = [
	{ id: 'etherfi', name: 'Ether.fi', dashboardId: '73x90j3b28pfhgx' },
	{ id: 'spark', name: 'Spark', dashboardId: 'lvp2u48lc11kdy1' },
	{ id: 'maple', name: 'Maple', dashboardId: 'l5accmh9zooc32q' },
	{ id: 'your-project', name: 'Your Project', dashboardId: '', comingSoon: true }
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

const DEFAULT_TABS: DashboardTabConfig[] = [{ id: 'dashboard', label: 'Dashboard' }]

function useProjectTabs(projects: typeof PROJECTS) {
	const [tabsByProject, setTabsByProject] = useState<Record<string, DashboardTabConfig[]>>({})

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
				})
			}
		}
		return () => {
			cancelled = true
		}
	}, [projects])

	return tabsByProject
}

function SuperLuminalContent({
	tabs,
	activeTab,
	displayName
}: {
	tabs: DashboardTabConfig[]
	activeTab: string
	displayName: string
}) {
	const { items } = useProDashboardItemsState()
	const { protocolsLoading } = useProDashboardCatalog()
	const { isLoadingDashboard, currentDashboard } = useProDashboardDashboard()

	if (isLoadingDashboard || !currentDashboard) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Logo animate />
			</div>
		)
	}

	return (
		<>
			<header className="hidden items-center gap-3 md:flex">
				<h1 className="text-xl font-semibold tracking-tight pro-text1">
					{activeTab === 'dashboard' ? displayName || 'Dashboard' : tabs.find((t) => t.id === activeTab)?.label}
				</h1>
			</header>

			<div className={activeTab === 'dashboard' ? '' : 'hidden'}>
				{items.length > 0 && (
					<div className="w-full">
						<ChartGrid onAddChartClick={NOOP} />
					</div>
				)}
				{!protocolsLoading && items.length === 0 && <EmptyState onAddChart={NOOP} isReadOnly />}
			</div>

			{tabs.map((tab) => {
				if (tab.id === 'dashboard' || activeTab !== tab.id) return null
				if (!tab.component) {
					return (
						<div key={tab.id}>
							<ComingSoonSection label={tab.label} />
						</div>
					)
				}
				const TabComponent = tab.component
				return (
					<div key={tab.id}>
						<Suspense
							fallback={
								<div className="flex min-h-[60vh] items-center justify-center py-20">
									<Logo animate />
								</div>
							}
						>
							<TabComponent />
						</Suspense>
					</div>
				)
			})}
		</>
	)
}

function SuperLuminalShell() {
	const [isDark, toggleTheme] = useDarkModeManager()
	const tabsByProject = useProjectTabs(PROJECTS)
	const [activeTab, setActiveTab] = useState('dashboard')
	const [activeProject, setActiveProject] = useState('etherfi')
	const [expandedProject, setExpandedProject] = useState<string | null>('etherfi')
	const [sidebarOpen, setSidebarOpen] = useState(false)

	const closeSidebar = useCallback(() => setSidebarOpen(false), [])

	const activeProjectConfig = PROJECTS.find((p) => p.id === activeProject)
	const dashboardId = activeProjectConfig?.dashboardId ?? PROJECTS[0].dashboardId
	const displayName = activeProjectConfig?.name ?? 'Dashboard'
	const tabs = tabsByProject[activeProject] ?? DEFAULT_TABS

	return (
		<div className="superluminal-dashboard col-span-full flex min-h-screen flex-col pro-dashboard bg-(--app-bg) md:flex-row">
			<link rel="preload" href="/assets/defillama.webp" as="image" />
			<link rel="preload" href="/assets/defillama-dark.webp" as="image" />
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
					{PROJECTS.map((project) => {
						const isActive = activeProject === project.id
						const isExpanded = expandedProject === project.id && !project.comingSoon

						return (
							<div key={project.id}>
								<button
									onClick={() => {
										if (isActive && !project.comingSoon) {
											setExpandedProject(isExpanded ? null : project.id)
										} else {
											setActiveProject(project.id)
											setExpandedProject(project.comingSoon ? expandedProject : project.id)
											if (!project.comingSoon) {
												setActiveTab('dashboard')
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
													activeTab === tab.id
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

			<div className="flex flex-1 flex-col gap-4 p-5 md:ml-56">
				{activeProjectConfig?.comingSoon ? (
					<ProjectComingSoon />
				) : (
					<ProDashboardAPIProvider key={dashboardId} initialDashboardId={dashboardId}>
						<SuperLuminalContent tabs={tabs} activeTab={activeTab} displayName={displayName} />
					</ProDashboardAPIProvider>
				)}
			</div>
		</div>
	)
}

export default function SuperLuminalDashboard() {
	return (
		<AppMetadataProvider>
			<SuperLuminalShell />
		</AppMetadataProvider>
	)
}
