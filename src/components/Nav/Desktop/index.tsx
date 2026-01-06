import * as React from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useSidebarCollapsed } from '~/contexts/LocalStorage'
import { Account } from '../Account'
import { ThemeSwitch } from '../ThemeSwitch'
import { TNavLink, TNavLinks, TOldNavLink } from '../types'
import { LinkToPage } from './shared'

const PinnedPages = React.lazy(() => import('./PinnedPages').then((mod) => ({ default: mod.PinnedPages })))

export const DesktopNav = React.memo(function DesktopNav({
	mainLinks,
	pinnedPages,
	userDashboards,
	footerLinks,
	oldMetricLinks
}: {
	mainLinks: TNavLinks
	pinnedPages: Array<TNavLink>
	userDashboards: Array<TNavLink>
	footerLinks: TNavLinks
	oldMetricLinks: Array<TOldNavLink>
}) {
	const { asPath } = useRouter()
	const [isCollapsed, toggleCollapsed] = useSidebarCollapsed()

	return (
		<span className="col-span-1 max-lg:hidden">
			<nav
				className={`group/sidebar thin-scrollbar sticky top-0 bottom-0 left-0 isolate z-10 col-span-1 flex h-screen w-full flex-col overflow-y-auto bg-(--app-bg) py-4 transition-all duration-300 ease-in-out ${isCollapsed ? 'gap-2 *:pl-2' : 'gap-1 *:pl-4'}`}
			>
				<div className={`mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
					<BasicLink href="/" className={`w-fit shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}>
						<span className="sr-only">Navigate to Home Page</span>
						{isCollapsed ? (
							<img
								src="/icons/android-chrome-512x512.png"
								height={48}
								width={48}
								className="object-contain"
								alt=""
								fetchPriority="high"
							/>
						) : (
							<>
								<img
									src="/icons/defillama.webp"
									height={53}
									width={155}
									className="mr-auto hidden object-contain object-left dark:block"
									alt=""
									fetchPriority="high"
								/>
								<img
									src="/icons/defillama-dark.webp"
									height={53}
									width={155}
									className="mr-auto object-contain object-left dark:hidden"
									alt=""
									fetchPriority="high"
								/>
							</>
						)}
					</BasicLink>
					{!isCollapsed && (
						<button
							onClick={toggleCollapsed}
							className="group/button flex items-center justify-center rounded-md p-1.5 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-60 hover:bg-black/5 focus-visible:bg-black/5 focus-visible:opacity-100 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
							aria-label="Collapse sidebar"
						>
							<Icon name="panel-left-close" className="group-hover/button:animate-slideleft h-4 w-4 shrink-0" />
						</button>
					)}
				</div>

				<div className="flex flex-1 flex-col gap-1 overflow-y-auto">
					{mainLinks.map(({ category, pages }) => (
						<div key={`desktop-nav-${category}`} className="group flex flex-col">
							{pages.map(({ name, route, icon, attention }) => (
								<LinkToPage
									key={`desktop-nav-${name}-${route}`}
									route={route}
									name={name}
									icon={icon}
									attention={attention}
									asPath={asPath}
									isCollapsed={isCollapsed}
								/>
							))}
						</div>
					))}
					{isCollapsed && (
						<button
							onClick={toggleCollapsed}
							className="group/button mx-auto flex w-full items-center justify-center rounded-md p-2 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-60 hover:bg-black/5 focus-visible:bg-black/5 focus-visible:opacity-100 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
							aria-label="Expand sidebar"
						>
							<Icon name="panel-left-open" className="group-hover/button:animate-slideright h-5 w-5 shrink-0" />
						</button>
					)}

					{!isCollapsed && (
						<details className="group">
							<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 text-xs opacity-65 transition-opacity duration-300 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
								<span>Old Menu</span>
								<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open:rotate-180" />
							</summary>
							<div className="border-l border-black/20 pl-2 dark:border-white/20">
								{oldMetricLinks.map(({ name, route, pages }: TOldNavLink) => (
									<React.Fragment key={`old-nav-desktop-${name}-${route ?? ''}`}>
										{pages ? (
											<details className="group/second">
												<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
													<span>{name}</span>
													<Icon name="chevron-down" className="h-4 w-4 shrink-0 group-open/second:rotate-180" />
												</summary>
												<div className="border-l border-black/20 pl-2 dark:border-white/20">
													{pages.map(({ name, route }) => (
														<LinkToPage
															key={`old-desktop-nav-${name}-${route}`}
															route={route}
															name={name}
															asPath={asPath}
															isCollapsed={isCollapsed}
														/>
													))}
												</div>
											</details>
										) : route ? (
											<LinkToPage
												key={`old-desktop-nav-${name}-${route}`}
												route={route}
												name={name}
												asPath={asPath}
												isCollapsed={isCollapsed}
											/>
										) : null}
									</React.Fragment>
								))}
							</div>
						</details>
					)}

					{pinnedPages.length > 0 ? (
						<React.Suspense>
							<PinnedPages pinnedPages={pinnedPages} asPath={asPath} isCollapsed={isCollapsed} />
						</React.Suspense>
					) : null}

					{userDashboards.length > 0 ? (
						<div className="group">
							{!isCollapsed && (
								<p className="flex items-center justify-between gap-3 rounded-md pt-1.5 text-xs opacity-65 transition-opacity duration-300">
									Your Dashboards
								</p>
							)}
							<div>
								{userDashboards.map(({ name, route }) => (
									<LinkToPage
										key={`desktop-nav-${name}-${route}`}
										route={route}
										name={name}
										asPath={asPath}
										isCollapsed={isCollapsed}
									/>
								))}
							</div>
						</div>
					) : null}

					{footerLinks.map(({ category, pages }) => (
						<NavDetailsSection
							key={`desktop-nav-${category}`}
							category={category}
							pages={pages}
							asPath={asPath}
							isCollapsed={isCollapsed}
						/>
					))}
				</div>

				<div
					className={`sticky bottom-0 flex w-full flex-col gap-2 bg-(--app-bg) ${isCollapsed ? 'items-center' : ''}`}
				>
					<hr className="-ml-1.5 border-black/20 pb-1 dark:border-white/20" />
					<Account isCollapsed={isCollapsed} />
					<ThemeSwitch isCollapsed={isCollapsed} />
				</div>
			</nav>
		</span>
	)
})

const NavDetailsSection = React.memo(function NavDetailsSection({
	category,
	pages,
	asPath,
	isCollapsed
}: {
	category: string
	pages: TNavLink[]
	asPath: string
	isCollapsed: boolean
}) {
	const lastItemRef = React.useRef<HTMLDivElement>(null)

	if (isCollapsed) {
		// When collapsed, only show pages that have icons
		const pagesWithIcons = pages.filter((page) => page.icon || page.name === 'LlamaAI')

		// Don't render anything if no pages have icons
		if (pagesWithIcons.length === 0) {
			return null
		}

		return (
			<div className={`flex flex-col ${category === 'More' ? 'mt-auto' : ''}`}>
				{pagesWithIcons.map(({ name, route, icon, attention }) => (
					<LinkToPage
						key={`desktop-nav-${name}-${route}`}
						route={route}
						name={name}
						icon={icon}
						attention={attention}
						asPath={asPath}
						isCollapsed={isCollapsed}
					/>
				))}
			</div>
		)
	}

	return (
		<details
			className={`group ${category === 'More' ? 'mt-auto' : ''}`}
			onToggle={(e) => {
				if (e.currentTarget.open) {
					setTimeout(() => {
						lastItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
					}, 0)
				}
			}}
		>
			<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 transition-opacity duration-300 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
				<span>{category}</span>
				<Icon name="chevron-up" className="h-4 w-4 shrink-0 group-open:rotate-180" />
			</summary>
			<div className="border-l border-black/20 pl-2 dark:border-white/20">
				{pages.map(({ name, route, icon, attention }, index) => (
					<div key={`desktop-nav-${name}-${route}`} ref={index === pages.length - 1 ? lastItemRef : null}>
						<LinkToPage
							route={route}
							name={name}
							icon={icon}
							attention={attention}
							asPath={asPath}
							isCollapsed={isCollapsed}
						/>
					</div>
				))}
			</div>
		</details>
	)
})
