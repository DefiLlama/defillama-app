import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Tooltip } from '~/components/Tooltip'
import { useSidebarState } from '~/contexts/SidebarContext'
import { NavCollapseProvider } from './NavCollapseContext'
import { NavItems, NavLink } from './NavGroup'
import { primaryNavigation, resourcesNavigation } from './navStructure'
import type { NavLink as NavLinkType } from './navStructure'
import { ThemeSwitch } from './ThemeSwitch'
import { getPinnedNavStructure, unpinRoute } from './utils'

const Account = React.lazy(() => import('./Account').then((mod) => ({ default: mod.Account })))

export const DesktopNav = React.memo(function DesktopNav({
	pinnedPages,
	userDashboards,
	accountAttention
}: {
	pinnedPages: string[]
	userDashboards: NavLinkType[]
	accountAttention?: boolean
}) {
	// Convert pinned routes to grouped structure
	const pinnedNavStructure = React.useMemo(() => getPinnedNavStructure(pinnedPages), [pinnedPages])

	const { isCollapsed, isPinned, toggle, setCollapsed } = useSidebarState()
	const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
	const leaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

	// Handle mouse enter with delay
	const handleMouseEnter = React.useCallback(() => {
		// Clear any pending leave timer (user came back)
		if (leaveTimerRef.current) {
			clearTimeout(leaveTimerRef.current)
			leaveTimerRef.current = null
		}

		if (!isCollapsed || isPinned) return

		const timer = setTimeout(() => {
			setCollapsed(false)
		}, 200) // 200ms delay to prevent accidental triggers

		hoverTimerRef.current = timer
	}, [isCollapsed, isPinned, setCollapsed])

	// Handle mouse leave with delay
	const handleMouseLeave = React.useCallback(() => {
		// Clear any pending hover timer
		if (hoverTimerRef.current) {
			clearTimeout(hoverTimerRef.current)
			hoverTimerRef.current = null
		}

		// Don't auto-collapse if pinned
		if (isPinned) return

		// Set leave timer with grace period
		leaveTimerRef.current = setTimeout(() => {
			setCollapsed(true)
		}, 800) // 800ms grace period for users to recover
	}, [isPinned, setCollapsed])

	// Handle Escape key to collapse when temporarily expanded (not pinned)
	React.useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !isCollapsed && !isPinned) {
				setCollapsed(true)
			}
		}

		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [isCollapsed, isPinned, setCollapsed])

	// Determine if sidebar should appear expanded
	const isExpanded = !isCollapsed
	const showOverlay = !isCollapsed && !isPinned
	const dynamicNavWidth = isExpanded ? 'w-[244px]' : 'w-[80px]'

	return (
		<>
			{/* Backdrop - only show when temporarily expanded (not pinned) */}
			{showOverlay && (
				<div
					className="fixed inset-0 z-[9] bg-black/40 transition-opacity duration-200 dark:bg-black/70"
					aria-hidden="true"
					onClick={() => setCollapsed(true)}
					style={{ overscrollBehavior: 'contain' }}
				/>
			)}
			<nav
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				className={`thin-scrollbar fixed top-0 bottom-0 left-0 isolate z-10 hidden h-screen flex-col overflow-y-auto rounded-lg bg-(--app-bg) p-4 pb-0 pl-0 transition-all duration-200 ease-out lg:flex ${
					dynamicNavWidth
				}`}
			>
				<div className={`mb-4 flex h-[53px] items-center pl-4 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
					<BasicLink href="/" className="flex h-full shrink-0 items-center">
						<span className="sr-only">Navigate to Home Page</span>
						{isExpanded ? (
							<>
								<img
									src="/icons/llama-logos/defi-llama-dark-theme.svg"
									height={53}
									width={155}
									className="mr-auto hidden h-full object-contain object-left dark:block"
									alt="DefiLlama"
									fetchPriority="high"
								/>
								<img
									src="/icons/llama-logos/defillama-light-theme.svg"
									height={53}
									width={155}
									className="mr-auto h-full object-contain object-left dark:hidden"
									alt="DefiLlama"
									fetchPriority="high"
								/>
							</>
						) : (
							<img
								src="/icons/llama-logos/defi-llama-icon.svg"
								height={32}
								width={32}
								className="h-full w-auto object-contain"
								alt="DefiLlama"
								fetchPriority="high"
							/>
						)}
					</BasicLink>
				</div>

				<div className="flex flex-1 flex-col gap-1.5 pl-4">
					{/* Primary Navigation */}
					<div className="flex flex-col gap-1">
						<NavItems
							items={primaryNavigation.map((item) =>
								item.type === 'link' && item.route === '/subscription' ? { ...item, attention: accountAttention } : item
							)}
							isExpanded={isExpanded}
						/>
					</div>

					{/* Pinned Pages with Grouped Structure or Empty State */}
					{pinnedNavStructure.length > 0 ? (
						<NavCollapseProvider>
							<div className={isExpanded ? 'mt-4' : 'mt-2'}>
								{/* Pinned header - text when expanded, icon with badge when collapsed */}
								{isExpanded ? (
									<p className="mb-1 flex items-center gap-2 pl-2 text-xs opacity-65">Pinned</p>
								) : (
									<Tooltip content={`${pinnedPages.length} pinned`} placement="right">
										<div className="relative mx-auto mb-2 flex h-10 w-10 items-center justify-center">
											<Icon name="pin" className="h-4 w-4" style={{ '--icon-fill': 'currentColor' } as any} />
											<span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--old-blue) px-1 text-[10px] font-medium text-white">
												{pinnedPages.length}
											</span>
										</div>
									</Tooltip>
								)}
								<div className="flex flex-col gap-1">
									<NavItems items={pinnedNavStructure} isExpanded={isExpanded} showUnpin={true} onUnpin={unpinRoute} />
								</div>
							</div>
						</NavCollapseProvider>
					) : (
						isExpanded && (
							<div className="mt-4">
								<p className="mb-1 text-xs opacity-65">Pinned</p>
								<p className="text-xs text-(--text-form) opacity-75">Visit Metrics page to pin your favorites</p>
							</div>
						)
					)}

					{/* User Dashboards */}
					{userDashboards.length > 0 && (
						<div className={isExpanded ? 'my-4' : 'my-0'}>
							<p
								className={`flex items-center justify-between gap-3 rounded-md text-xs transition-opacity duration-200 ${
									isExpanded ? 'mb-1 opacity-65' : 'mb-0 h-0 overflow-hidden opacity-0'
								}`}
							>
								Your Dashboards
							</p>
							<div className="flex flex-col gap-0.5">
								{userDashboards.map((dashboard) => (
									<NavLink key={`dashboard-${dashboard.route}`} link={dashboard} isExpanded={isExpanded} />
								))}
							</div>
						</div>
					)}

					{/* Resources - Footer Section */}
					<div className="mt-auto">
						<p
							className={`flex items-center justify-between gap-3 rounded-md pl-2 text-xs transition-opacity duration-200 ${
								isExpanded ? 'mb-1 opacity-50' : 'mb-0 h-0 overflow-hidden opacity-0'
							}`}
						>
							Resources
						</p>
						<hr
							className={`-ml-1.5 border-black/10 transition-opacity duration-200 dark:border-white/10 ${
								isExpanded ? 'pt-1 opacity-100' : 'h-0 overflow-hidden pt-0 opacity-0'
							}`}
						/>
						<div className="flex flex-col gap-0.5">
							<NavItems items={resourcesNavigation} isExpanded={isExpanded} />
						</div>
					</div>

					{/* Legal Footer */}
					<div
						className={`pl-2 transition-opacity duration-200 ${
							isExpanded ? 'mt-2 pt-2 opacity-100' : 'mt-0 h-0 overflow-hidden pt-0 opacity-0'
						}`}
					>
						<div className="flex items-center justify-center gap-2 text-xs">
							<BasicLink href="/privacy-policy" className="opacity-60 transition-opacity hover:opacity-90">
								Privacy
							</BasicLink>
							<span className="opacity-50">•</span>
							<BasicLink href="/terms" className="opacity-60 transition-opacity hover:opacity-90">
								Terms
							</BasicLink>
						</div>
					</div>
				</div>

				<div className="sticky bottom-0 flex w-full flex-col gap-2 bg-(--app-bg) pt-2 pb-4 pl-4">
					<hr className="border-black/20 dark:border-white/20" />
					<React.Suspense fallback={<div className="flex min-h-7 w-full items-center justify-center" />}>
						<Account />
					</React.Suspense>
					<div className="flex justify-center">
						<ThemeSwitch />
					</div>
				</div>
			</nav>
		</>
	)
})
