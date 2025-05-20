import * as React from 'react'
import { useRouter } from 'next/router'
import { useYieldApp } from '~/hooks'
import { navLinks } from '../Links'
import { ThemeSwitch } from '../ThemeSwitch'
import { SubMenu } from './SubMenu'
import { NewTag } from '../NewTag'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

export const DesktopNav = React.memo(function DesktopNav() {
	const { asPath } = useRouter()
	const isYieldApp = useYieldApp()
	const { isAuthenticated, user, logout, loaders } = useAuthContext()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const isAccountLoading = loaders.userLoading || (isAuthenticated && isSubscriptionLoading)

	const commonLinks = isYieldApp ? navLinks['Yields'] : navLinks['DeFi']

	return (
		<nav className="z-10 fixed top-0 bottom-0 left-0 h-screen overflow-y-auto bg-[var(--app-bg)] hidden lg:flex flex-col w-[244px] gap-1 p-4 pl-0 *:pl-4 no-scrollbar">
			<BasicLink href="/" className="flex-shrink-0">
				<span className="sr-only">Navigate to Home Page</span>
				<img
					src="/defillama-press-kit/defi/PNG/defillama.png"
					height={53}
					width={155}
					className="object-contain object-left mr-auto mb-4 hidden dark:block"
					alt=""
				/>
				<img
					src="/defillama-press-kit/defi/PNG/defillama-dark.png"
					height={53}
					width={155}
					className="object-contain object-left mr-auto mb-4 dark:hidden"
					alt=""
				/>
			</BasicLink>

			<div className="overflow-y-auto pb-32 no-scrollbar">
				<p className="text-xs opacity-65 mb-1">Dashboards</p>

				{Object.keys(navLinks).map((mainLink) => (
					<SubMenu key={mainLink} name={mainLink} />
				))}

				<hr className="border-black/20 dark:border-white/20 my-4" />

				<p className="text-xs opacity-65 mb-1">Tools</p>

				{commonLinks.tools.map((link) => {
					if ('onClick' in link) {
						return (
							<button
								key={link.name}
								onClick={link.onClick}
								className="-ml-[6px] rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
							>
								{link.name}
							</button>
						)
					} else {
						return (
							<React.Fragment key={link.name}>
								<BasicLink
									href={link.path}
									key={link.path}
									{...(link.external ? { target: '_blank' } : {})}
									rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
									data-linkactive={link.path === asPath.split('/?')[0].split('?')[0]}
									className="-ml-[6px] rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
								>
									{link.name}
									{link.newTag === true ? <NewTag /> : null}
								</BasicLink>
							</React.Fragment>
						)
					}
				})}

				<hr className="border-black/20 dark:border-white/20 my-4" />

				{commonLinks.footer.map((link) => {
					if ('onClick' in link) {
						return (
							<button
								key={link.name}
								onClick={link.onClick}
								className="-ml-[6px] rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
							>
								{link.name}
							</button>
						)
					} else {
						return (
							<React.Fragment key={link.name}>
								<BasicLink
									href={link.path}
									key={link.path}
									{...(link.external ? { target: '_blank' } : {})}
									rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
									data-linkactive={link.path === asPath.split('/?')[0].split('?')[0]}
									className="-ml-[6px] rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
								>
									{link.name}
									{link.newTag === true ? <NewTag /> : null}
								</BasicLink>
							</React.Fragment>
						)
					}
				})}
			</div>

			{isAccountLoading ? (
				<div
					className="absolute bottom-0 left-0 right-0 bg-[var(--app-bg)] p-3 border-t border-black/20 dark:border-white/20 flex flex-col gap-2"
					style={{ height: 138 }}
				>
					<div className="flex items-center justify-center w-full h-full">
						<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-400" />
					</div>
				</div>
			) : (
				<div className="absolute bottom-0 left-0 right-0 bg-[var(--app-bg)] p-3 border-t border-black/20 dark:border-white/20 flex flex-col gap-2">
					{isAuthenticated ? (
						<div className="flex flex-col gap-1.5">
							{user && (
								<BasicLink
									href="/subscription"
									className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-1 truncate font-medium flex items-center gap-1.5 transition-colors"
								>
									<Icon name="users" className="w-4 h-4 flex-shrink-0" />
									{user.email}
								</BasicLink>
							)}
							{subscription?.status === 'active' ? (
								<span className="text-xs px-1 font-medium text-green-600 dark:text-green-500 flex items-center gap-1">
									<Icon name="check-circle" className="w-3.5 h-3.5" />
									Subscribed
								</span>
							) : (
								user && (
									<>
										<span className="text-xs px-1 font-medium text-red-500 dark:text-red-500 flex items-center gap-1">
											Subscription inactive
										</span>
										<BasicLink
											href="/subscription"
											className="text-xs px-1 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
										>
											<Icon name="plus" className="w-3.5 h-3.5" />
											Upgrade
										</BasicLink>
									</>
								)
							)}
							<button
								onClick={logout}
								className="rounded-lg flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 p-1 text-sm font-medium transition-colors duration-200"
							>
								<Icon name="x" className="w-4 h-4" />
								Logout
							</button>
						</div>
					) : (
						<BasicLink
							href="/subscription"
							className="-ml-[6px] rounded-lg flex items-center justify-center gap-2 bg-[#5C5CF9]/10 hover:bg-[#5C5CF9]/20 text-[#5C5CF9] p-1 text-sm font-medium transition-colors duration-200"
						>
							<Icon name="users" className="w-4 h-4" />
							Sign In / Subscribe
						</BasicLink>
					)}
					<ThemeSwitch />
				</div>
			)}
		</nav>
	)
})
