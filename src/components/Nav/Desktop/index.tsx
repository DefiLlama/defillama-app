import * as React from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '../ThemeSwitch'
import { TNavLink, TNavLinks, TOldNavLink } from '../types'
import { LinkToPage } from './shared'

const Account = React.lazy(() => import('../Account').then((mod) => ({ default: mod.Account })))
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

	return (
		<span className="col-span-1 border-r border-black/20 max-lg:hidden dark:border-white/20">
			<nav className="thin-scrollbar sticky top-0 bottom-0 left-0 isolate z-10 col-span-1 flex h-screen flex-col gap-1 overflow-y-auto bg-(--app-bg) py-4 *:pl-4">
				<BasicLink href="/" className="mb-4 block w-full shrink-0 border-b border-black/20 pb-4 dark:border-white/20">
					<span className="sr-only">Navigate to Home Page</span>
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
				</BasicLink>

				{/* Navigation */}
				<div className="flex flex-1 flex-col gap-1 space-y-6 overflow-y-auto">
					{mainLinks.map((section) => (
						<div key={`desktop-nav-${section.category}`}>
							<h3 className="px-3 py-1 text-xs font-bold tracking-wider text-gray-600 uppercase">{section.category}</h3>
							<div className="space-y-1">
								{section.pages.map(({ name, route, icon, attention }) => (
									<LinkToPage
										key={`desktop-nav-${name}-${route}`}
										route={route}
										name={name}
										icon={icon}
										attention={attention}
										asPath={asPath}
									/>
								))}
							</div>
						</div>
					))}

					{/* Old Menu - Toggleable */}

					<details className="group border-t border-black/20 pt-2 dark:border-white/20">
						<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 text-xs opacity-80 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
							<span className="px-3 py-1 text-xs font-bold tracking-wider text-gray-600 uppercase">Old Menu</span>
							<Icon
								name="chevron-down"
								className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
							/>
						</summary>
						<div className="border-l border-black/20 pl-2 dark:border-white/20">
							{oldMetricLinks.map(({ name, route, pages }: TOldNavLink) => (
								<React.Fragment key={`old-nav-desktop-${name}-${route ?? ''}`}>
									{pages ? (
										<details className="group/second">
											<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
												<span>{name}</span>
												<Icon
													name="chevron-down"
													className="h-4 w-4 shrink-0 transition-transform duration-200 group-open/second:rotate-180"
												/>
											</summary>
											<div className="border-l border-black/20 pl-2 dark:border-white/20">
												{pages.map(({ name, route }) => (
													<LinkToPage
														key={`old-desktop-nav-${name}-${route}`}
														route={route}
														name={name}
														asPath={asPath}
													/>
												))}
											</div>
										</details>
									) : route ? (
										<LinkToPage key={`old-desktop-nav-${name}-${route}`} route={route} name={name} asPath={asPath} />
									) : null}
								</React.Fragment>
							))}
						</div>
					</details>

					<div className="flex flex-col gap-1">
						{pinnedPages.length > 0 ? (
							<React.Suspense>
								<PinnedPages pinnedPages={pinnedPages} asPath={asPath} />
							</React.Suspense>
						) : null}

						{userDashboards.length > 0 ? (
							<div className="group">
								<p className="flex items-center justify-between gap-3 rounded-md pt-1.5 text-xs opacity-65">
									Your Dashboards
								</p>
								<div>
									{userDashboards.map(({ name, route }) => (
										<LinkToPage key={`desktop-nav-${name}-${route}`} route={route} name={name} asPath={asPath} />
									))}
								</div>
							</div>
						) : null}
					</div>
					<div className="mt-auto">
						{footerLinks.map(({ category, pages }) => (
							<NavDetailsSection key={`desktop-nav-${category}`} category={category} pages={pages} asPath={asPath} />
						))}
					</div>
				</div>

				<div className="sticky bottom-0 flex w-full flex-col gap-2 bg-(--app-bg)">
					<hr className="-ml-1.5 border-black/20 pb-1 dark:border-white/20" />
					<React.Suspense fallback={<div className="flex min-h-7 w-full items-center justify-center" />}>
						<Account />
					</React.Suspense>
					<ThemeSwitch />
				</div>
			</nav>
		</span>
	)
})

const NavDetailsSection = React.memo(function NavDetailsSection({
	category,
	pages,
	asPath
}: {
	category: string
	pages: TNavLink[]
	asPath: string
}) {
	const lastItemRef = React.useRef<HTMLDivElement>(null)

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
			<summary className="-ml-1.5 flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
				<span>{category}</span>
				<Icon name="chevron-up" className="h-4 w-4 shrink-0 group-open:rotate-180" />
			</summary>
			<div className="border-l border-black/20 pl-2 dark:border-white/20">
				{pages.map(({ name, route, icon, attention }, index) => (
					<div key={`desktop-nav-${name}-${route}`} ref={index === pages.length - 1 ? lastItemRef : null}>
						<LinkToPage route={route} name={name} icon={icon} attention={attention} asPath={asPath} />
					</div>
				))}
			</div>
		</details>
	)
})
