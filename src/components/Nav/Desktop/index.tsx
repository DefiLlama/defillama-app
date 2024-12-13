import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useYieldApp } from '~/hooks'
import { navLinks } from '../Links'
import { ThemeSwitch } from '../ThemeSwitch'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { SubMenu } from './SubMenu'
import { NewTag } from '../NewTag'

export const DesktopNav = React.memo(function DesktopNav() {
	const { asPath } = useRouter()
	const isYieldApp = useYieldApp()
	const [darkMode] = useDarkModeManager()

	const commonLinks = isYieldApp ? navLinks['Yields'] : navLinks['DeFi']

	return (
		<nav className="z-10 fixed top-0 bottom-0 left-0 h-screen overflow-y-auto bg-[var(--bg8)] hidden lg:flex flex-col w-[244px] gap-1 p-6 no-scrollbar">
			<Link href="/" passHref>
				<a className="flex-shrink-0">
					<span className="sr-only">Navigate to Home Page</span>
					<img
						src={
							darkMode
								? '/defillama-press-kit/defi/PNG/defillama.png'
								: '/defillama-press-kit/defi/PNG/defillama-dark.png'
						}
						height={53}
						width={155}
						className="object-contain object-left mr-auto mb-4"
						alt=""
					/>
				</a>
			</Link>

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
							<Link href={link.path} key={link.path} prefetch={false} passHref>
								<a
									target={link.external && '_blank'}
									rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
									data-linkactive={link.path === asPath.split('/?')[0].split('?')[0]}
									className="-ml-[6px] rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
								>
									{link.name}
									{link.newTag === true ? <NewTag /> : null}
								</a>
							</Link>
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
							<Link href={link.path} key={link.path} prefetch={false} passHref>
								<a
									target={link.external && '_blank'}
									rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
									data-linkactive={link.path === asPath.split('/?')[0].split('?')[0]}
									className="-ml-[6px] rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
								>
									{link.name}
									{link.newTag === true ? <NewTag /> : null}
								</a>
							</Link>
						</React.Fragment>
					)
				}
			})}

			<ThemeSwitch />
		</nav>
	)
})
