import * as React from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { ThemeSwitch } from './ThemeSwitch'
import { TNavLinks } from './types'

export const DesktopNav = ({ links }: { links: TNavLinks }) => {
	const { asPath } = useRouter()
	const { isAuthenticated, user, logout, loaders } = useAuthContext()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const isAccountLoading = loaders?.userLoading || (isAuthenticated && isSubscriptionLoading)

	return (
		<nav className="no-scrollbar fixed top-0 bottom-0 left-0 z-10 hidden h-screen w-[244px] flex-col gap-1 overflow-y-auto bg-(--app-bg) p-4 pl-0 *:pl-4 lg:flex">
			<BasicLink href="/" className="shrink-0">
				<span className="sr-only">Navigate to Home Page</span>
				<img
					src="/defillama-press-kit/defi/PNG/defillama.png"
					height={53}
					width={155}
					className="mr-auto mb-4 hidden object-contain object-left dark:block"
					alt=""
					fetchPriority="high"
				/>
				<img
					src="/defillama-press-kit/defi/PNG/defillama-dark.png"
					height={53}
					width={155}
					className="mr-auto mb-4 object-contain object-left dark:hidden"
					alt=""
					fetchPriority="high"
				/>
			</BasicLink>

			<div className="no-scrollbar flex flex-1 flex-col gap-[6px] overflow-y-auto pb-32">
				{links.map(({ category, pages }) => (
					<div key={`desktop-nav-${category}`} className="group first:mb-auto">
						<hr className="mb-3 hidden border-black/20 group-last:block dark:border-white/20" />
						{category !== 'Main' ? <p className="mb-1 text-xs opacity-65">{category}</p> : null}
						{pages.map(({ name, route, icon }) => (
							<BasicLink
								href={route}
								key={`desktop-nav-${name}-${route}`}
								data-linkactive={route === asPath.split('/?')[0].split('?')[0]}
								className="-ml-[6px] flex items-center gap-3 rounded-md p-[6px] hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
							>
								{icon ? <Icon name={icon as any} className="h-4 w-4" /> : null}
								{name}
							</BasicLink>
						))}
					</div>
				))}
			</div>

			{isAccountLoading ? (
				<div
					className="absolute right-0 bottom-0 left-0 flex flex-col gap-2 border-t border-black/20 bg-(--app-bg) p-3 dark:border-white/20"
					style={{ height: 138 }}
				>
					<div className="flex h-full w-full items-center justify-center">
						<div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-gray-400" />
					</div>
				</div>
			) : (
				<div className="absolute right-0 bottom-0 left-0 flex flex-col gap-2 border-t border-black/20 bg-(--app-bg) p-3 dark:border-white/20">
					{isAuthenticated ? (
						<div className="flex flex-col gap-1.5">
							{user && (
								<BasicLink
									href="/subscription"
									className="flex items-center gap-1.5 truncate px-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
								>
									<Icon name="users" className="h-4 w-4 shrink-0" />
									{user.email}
								</BasicLink>
							)}
							{subscription?.status === 'active' ? (
								<span className="flex items-center gap-1 px-1 text-xs font-medium text-green-600 dark:text-green-500">
									<Icon name="check-circle" className="h-3.5 w-3.5" />
									Subscribed
								</span>
							) : (
								user && (
									<>
										<span className="flex items-center gap-1 px-1 text-xs font-medium text-red-500 dark:text-red-500">
											Subscription inactive
										</span>
										<BasicLink
											href="/subscription"
											className="flex items-center gap-1 px-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400"
										>
											<Icon name="plus" className="h-3.5 w-3.5" />
											Upgrade
										</BasicLink>
									</>
								)
							)}
							<button
								onClick={logout}
								className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 p-1 text-sm font-medium text-red-500 transition-colors duration-200 hover:bg-red-500/20"
							>
								<Icon name="x" className="h-4 w-4" />
								Logout
							</button>
						</div>
					) : (
						<BasicLink
							href={`/subscription?returnUrl=${encodeURIComponent(asPath)}`}
							className="-ml-[6px] flex items-center justify-center gap-2 rounded-lg bg-[#5C5CF9]/10 p-1 text-sm font-medium text-[#5C5CF9] transition-colors duration-200 hover:bg-[#5C5CF9]/20"
						>
							<Icon name="users" className="h-4 w-4" />
							Sign In / Subscribe
						</BasicLink>
					)}
					<ThemeSwitch />
				</div>
			)}
		</nav>
	)
}
