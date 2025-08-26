import * as React from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { Tooltip } from '../Tooltip'
import { Account } from './Account'
import { ThemeSwitch } from './ThemeSwitch'
import { TNavLink, TNavLinks } from './types'

export const DesktopNav = ({
	mainLinks,
	pinnedPages,
	userDashboards,
	footerLinks
}: {
	mainLinks: TNavLinks
	pinnedPages: TNavLink[]
	userDashboards: TNavLink[]
	footerLinks: TNavLinks
}) => {
	return (
		<nav className="thin-scrollbar fixed top-0 bottom-0 left-0 isolate z-10 hidden h-screen w-[244px] flex-col gap-1 overflow-y-auto bg-(--app-bg) p-4 pl-0 *:pl-4 lg:flex">
			<BasicLink href="/" className="shrink-0">
				<span className="sr-only">Navigate to Home Page</span>
				<img
					src="/icons/defillama.webp"
					height={53}
					width={155}
					className="mr-auto mb-4 hidden object-contain object-left dark:block"
					alt=""
					fetchPriority="high"
				/>
				<img
					src="/icons/defillama-dark.webp"
					height={53}
					width={155}
					className="mr-auto mb-4 object-contain object-left dark:hidden"
					alt=""
					fetchPriority="high"
				/>
			</BasicLink>

			<div className="flex flex-1 flex-col gap-[6px] overflow-y-auto">
				{mainLinks.map(({ category, pages }) => (
					<div key={`desktop-nav-${category}`} className="group">
						{pages.map(({ name, route, icon }) => (
							<LinkToPage key={`desktop-nav-${name}-${route}`} route={route} name={name} icon={icon} />
						))}
					</div>
				))}

				{pinnedPages.length > 0 ? (
					<div className="mt-4">
						<p className="flex items-center justify-between gap-3 rounded-md text-xs opacity-65">Pinned Pages</p>

						{pinnedPages.map(({ name, route }) => (
							<span key={`pinned-page-${name}-${route}`} className="group relative flex flex-wrap items-center gap-1">
								<LinkToPage route={route} name={name} />
								<Tooltip
									content="Unpin from navigation"
									render={
										<button
											onClick={(e) => {
												const currentPinnedPages = JSON.parse(window.localStorage.getItem('pinned-metrics') || '[]')
												window.localStorage.setItem(
													'pinned-metrics',
													JSON.stringify(currentPinnedPages.filter((page: string) => page !== route))
												)
												window.dispatchEvent(new Event('pinnedMetricsChange'))
												e.preventDefault()
												e.stopPropagation()
											}}
										/>
									}
									className="absolute top-1 right-1 bottom-1 my-auto hidden rounded-md bg-(--error) px-1 py-1 text-white group-hover:block"
								>
									<Icon name="x" className="h-4 w-4" />
								</Tooltip>
							</span>
						))}
					</div>
				) : null}

				{userDashboards.length > 0 ? (
					<div className="group mt-4">
						<p className="flex items-center justify-between gap-3 rounded-md text-xs opacity-65">Your Dashboards</p>
						<div>
							{userDashboards.map(({ name, route }) => (
								<LinkToPage key={`desktop-nav-${name}-${route}`} route={route} name={name} />
							))}
						</div>
					</div>
				) : null}

				{footerLinks.map(({ category, pages }) => (
					<details key={`desktop-nav-${category}`} className={`group ${category === 'More' ? 'mt-auto' : ''}`}>
						<summary className="-ml-[6px] flex items-center justify-between gap-3 rounded-md p-[6px] hover:bg-black/5 focus-visible:bg-black/5">
							<span>{category}</span>
							<Icon name="chevron-up" className="h-4 w-4 shrink-0 group-open:rotate-180" />
						</summary>
						<hr className="-ml-[6px] border-black/20 pt-2 group-last:block dark:border-white/20" />
						<div>
							{pages.map(({ name, route, icon }) => (
								<LinkToPage key={`desktop-nav-${name}-${route}`} route={route} name={name} icon={icon} />
							))}
						</div>
					</details>
				))}
			</div>

			<div className="sticky bottom-0 flex w-full flex-col gap-2 bg-(--app-bg)">
				<hr className="-ml-[6px] border-black/20 pb-1 dark:border-white/20" />
				<Account />
				<ThemeSwitch />
			</div>
		</nav>
	)
}

const LinkToPage = ({ route, name, icon }: { route: string; name: string; icon?: string }) => {
	const { asPath } = useRouter()

	return (
		<BasicLink
			href={route}
			data-linkactive={route === asPath.split('/?')[0].split('?')[0]}
			className="group/link -ml-[6px] flex flex-1 items-center gap-3 rounded-md p-[6px] hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
		>
			{icon ? <Icon name={icon as any} className="group-hover/link:animate-wiggle h-4 w-4" /> : null}
			{name}
		</BasicLink>
	)
}
