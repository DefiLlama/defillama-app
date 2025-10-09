import * as React from 'react'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Account } from '../Account'
import { NavItems, NavLink } from '../NavGroup'
import { NavCollapseProvider } from '../NavCollapseContext'
import { primaryNavigation, resourcesNavigation } from '../navStructure'
import type { NavLink as NavLinkType } from '../navStructure'
import { getPinnedNavStructure, unpinRoute } from '../utils'

export const Menu = React.memo(function Menu({
	pinnedPages,
	userDashboards,
	accountAttention
}: {
	pinnedPages: string[]
	userDashboards: NavLinkType[]
	accountAttention?: boolean
}) {
	const [show, setShow] = useState(false)
	const buttonEl = useRef<HTMLButtonElement>(null)
	const navEl = useRef<HTMLDivElement>(null)

	// Convert pinned routes to grouped structure
	const pinnedNavStructure = React.useMemo(() => getPinnedNavStructure(pinnedPages), [pinnedPages])

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			const target = e.target as HTMLElement
			if (
				!(
					buttonEl.current &&
					navEl.current &&
					(buttonEl.current.contains(target) ||
						navEl.current.contains(target) ||
						target.dataset?.togglemenuoff)
				)
			) {
				setShow(false)
			}
		}

		document.addEventListener('click', handleClick)
		return () => document.removeEventListener('click', handleClick)
	}, [])

	return (
		<Ariakit.DialogProvider open={show} setOpen={setShow}>
			<Ariakit.DialogDisclosure ref={buttonEl} className="-my-0.5 rounded-md bg-[#445ed0] p-3 text-white shadow">
				<span className="sr-only">Open Navigation Menu</span>
				<Icon name="menu" height={16} width={16} />
			</Ariakit.DialogDisclosure>

			<Ariakit.Dialog
				data-active={show}
				className="fixed top-0 right-0 bottom-0 left-0 hidden bg-black/10 data-[active=true]:block"
			>
				<nav
					ref={navEl}
					className="animate-slidein fixed top-0 right-0 bottom-0 z-10 flex w-full max-w-[300px] flex-col gap-3 overflow-auto bg-(--bg-main) p-4 pl-5 text-black dark:text-white"
				>
					<Ariakit.DialogDismiss className="ml-auto">
						<span className="sr-only">Close Navigation Menu</span>
						<Icon name="x" height={20} width={20} strokeWidth="4px" />
					</Ariakit.DialogDismiss>

					{/* Primary Navigation */}
					<div className="flex flex-col gap-1">
						<NavItems items={primaryNavigation} isExpanded={true} />

						{/* Metrics Link */}
						<NavLink
							link={{
								type: 'link',
								label: 'Metrics',
								route: '/metrics',
								icon: 'bar-chart-2'
							}}
							isExpanded={true}
						/>

						{/* Account and Custom Dashboards */}
						<NavLink
							link={{
								type: 'link',
								label: 'Account',
								route: '/subscription',
								icon: 'user',
								attention: accountAttention
							}}
							isExpanded={true}
						/>
						<NavLink
							link={{
								type: 'link',
								label: 'Custom Dashboards',
								route: '/pro',
								icon: 'blocks'
							}}
							isExpanded={true}
						/>
					</div>

					{/* Pinned Pages with Grouped Structure or Empty State */}
					{pinnedNavStructure.length > 0 ? (
						<NavCollapseProvider>
							<div className="group flex flex-col">
								<p className="mb-1 text-xs opacity-65">Pinned</p>
								<hr className="border-black/20 dark:border-white/20" />
								<div className="flex flex-col gap-1 mt-1">
									<NavItems items={pinnedNavStructure} isExpanded={true} showUnpin={true} onUnpin={unpinRoute} />
								</div>
							</div>
						</NavCollapseProvider>
					) : (
						<div className="group flex flex-col">
							<p className="mb-1 text-xs opacity-65">Pinned</p>
							<hr className="border-black/20 dark:border-white/20" />
							<p className="mt-2 text-xs text-(--text-form) opacity-75">
								Visit Metrics page to pin your favorites
							</p>
						</div>
					)}

					{/* User Dashboards */}
					{userDashboards.length > 0 && (
						<div className="group flex flex-col">
							<p className="mb-1 text-xs opacity-65">Your Dashboards</p>
							<hr className="border-black/20 dark:border-white/20" />
							<div className="flex flex-col gap-0.5 mt-1">
								{userDashboards.map((dashboard) => (
									<NavLink key={`mobile-dashboard-${dashboard.route}`} link={dashboard} isExpanded={true} />
								))}
							</div>
						</div>
					)}

					{/* Resources - Footer Section */}
					<div>
						<p className="mb-1 text-xs opacity-50">Resources</p>
						<hr className="border-black/10 dark:border-white/10" />
						<div className="flex flex-col gap-0.5 mt-1">
							<NavItems items={resourcesNavigation} isExpanded={true} />
						</div>
					</div>

					{/* Legal Footer */}
					<div className="flex items-center justify-center gap-2 text-xs opacity-40">
						<BasicLink href="/privacy-policy" className="transition-opacity hover:opacity-60">
							Privacy
						</BasicLink>
						<span>•</span>
						<BasicLink href="/terms" className="transition-opacity hover:opacity-60">
							Terms
						</BasicLink>
					</div>

					<hr className="border-black/20 dark:border-white/20" />

					<Suspense fallback={<div className="flex min-h-7 w-full items-center justify-center" />}>
						<Account />
					</Suspense>
				</nav>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})
