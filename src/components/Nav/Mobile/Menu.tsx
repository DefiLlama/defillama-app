import { useEffect, useRef, useState, Fragment, forwardRef } from 'react'
import { linksWithNoSubMenu, navLinks, defaultToolsAndFooterLinks } from '../Links'
import { isActiveCategory } from '../utils'
import { useYieldApp } from '~/hooks'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { BasicLink } from '~/components/Link'

export function Menu() {
	const [show, setShow] = useState(false)
	const buttonEl = useRef<HTMLButtonElement>(null)
	const navEl = useRef<HTMLDivElement>(null)

	const router = useRouter()
	const isYieldApp = useYieldApp()
	const { isAuthenticated, user, logout } = useAuthContext()
	const commonLinks = isYieldApp ? navLinks['Yields'] : navLinks['DeFi']

	useEffect(() => {
		function handleClick(e) {
			if (
				!(
					buttonEl.current &&
					navEl.current &&
					(buttonEl.current.contains(e.target) ||
						navEl.current.isSameNode(e.target) ||
						'togglemenuoff' in e.target.dataset)
				)
			) {
				setShow(false)
			}
		}

		document.addEventListener('click', handleClick)
		return () => document.removeEventListener('click', handleClick)
	}, [])

	return (
		<>
			<button
				onClick={() => setShow(!show)}
				ref={buttonEl}
				className="shadow p-3 rounded-md bg-[#445ed0] text-white -my-[2px]"
			>
				<span className="sr-only">Open Navigation Menu</span>
				<Icon name="menu" height={16} width={16} />
			</button>

			<div
				data-active={show}
				className="hidden data-[active=true]:block fixed top-0 right-0 bottom-0 left-0 bg-black/10"
			>
				<nav
					ref={navEl}
					className="fixed top-0 right-0 bottom-0 overflow-auto flex flex-col w-full max-w-[300px] bg-(--bg1) text-black dark:text-white p-4 pl-5 animate-slidein"
				>
					<button onClick={(prev) => setShow(!prev)} className="ml-auto">
						<span className="sr-only">Close Navigation Menu</span>
						<Icon name="x" height={20} width={20} strokeWidth="4px" />
					</button>

					<p className="text-sm opacity-65 p-3">Dashboards</p>

					{Object.keys(navLinks).map((mainLink) => (
						<SubMenu key={mainLink} name={mainLink} />
					))}

					<hr className="border-black/20 dark:border-white/20 my-3" />

					<p className="text-sm opacity-65 p-3">Tools</p>

					{commonLinks.tools.map((link) => {
						if ('onClick' in link) {
							return (
								<button
									key={link.name}
									onClick={link.onClick}
									className="rounded-md data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white p-3"
								>
									{link.name}
								</button>
							)
						} else {
							return (
								<Fragment key={link.name}>
									<BasicLink
										href={link.path}
										key={link.path}
										target="_blank"
										rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
										data-linkactive={link.path === router.asPath.split('/?')[0].split('?')[0]}
										className="rounded-md data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white p-3"
									>
										{link.name}
									</BasicLink>
								</Fragment>
							)
						}
					})}

					<hr className="border-black/20 dark:border-white/20 my-3" />

					{commonLinks.footer.map((link) => {
						if ('onClick' in link) {
							return (
								<button
									key={link.name}
									onClick={link.onClick}
									className="rounded-md data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white p-3"
								>
									{link.name}
								</button>
							)
						} else {
							return (
								<Fragment key={link.name}>
									<BasicLink
										href={link.path}
										key={link.path}
										target="_blank"
										rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
										data-linkactive={link.path === router.asPath.split('/?')[0].split('?')[0]}
										className="rounded-md data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white p-3"
									>
										{link.name}
									</BasicLink>
								</Fragment>
							)
						}
					})}

					<hr className="border-black/20 dark:border-white/20 my-3" />

					{isAuthenticated ? (
						<div className="flex flex-col gap-2">
							{user && <span className="text-sm text-[#8a8c90] p-3">{user.email}</span>}
							<button onClick={logout} className="rounded-md p-3 text-left">
								Logout
							</button>
						</div>
					) : (
						<BasicLink href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`} className="rounded-md p-3">
							Sign In / Subscribe
						</BasicLink>
					)}
				</nav>
			</div>
		</>
	)
}

const isActive = ({ pathname, category }: { pathname: string; category: string }) => {
	if (category === 'DeFi') {
		return (
			!isDefaultLink(pathname) &&
			!Object.keys(navLinks)
				.filter((cat) => cat !== 'DeFi')
				.some((cat) => isActiveCategory(pathname, cat))
		)
	}
	return isActiveCategory(pathname, category)
}

const isDefaultLink = (pathname) =>
	[...defaultToolsAndFooterLinks.tools, ...defaultToolsAndFooterLinks.footer].map((x) => x.path).includes(pathname)

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)
	const router = useRouter()
	const active = isActive({ category: name, pathname: router.pathname })

	if (noSubMenu || (name === 'Yields' && !active)) {
		return (
			<BasicLink
				href={noSubMenu?.url ?? '/yields'}
				target={noSubMenu?.external && '_blank'}
				data-linkactive={(noSubMenu?.url ?? '/yields') === router.pathname}
				className="rounded-md data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white p-3"
			>
				{name}
			</BasicLink>
		)
	}

	return (
		<details ref={ref} className={`group select-none ${active ? 'text-black dark:text-white' : ''}`}>
			<summary
				data-togglemenuoff={false}
				className="group/summary rounded-md flex items-center gap-1 list-none p-3 relative left-[-22px] data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white"
			>
				<Icon
					name="chevron-right"
					height={18}
					width={18}
					data-togglemenuoff={false}
					className="group-open:rotate-90 transition-transform duration-100"
				/>
				<span data-togglemenuoff={false}>{name}</span>
			</summary>
			<span className="my-1 flex flex-col">
				{navLinks[name].main.map((subLink) => (
					<BasicLink
						href={subLink.path}
						key={subLink.path}
						data-linkactive={subLink.path === router.asPath.split('/?')[0].split('?')[0]}
						className="py-3 pl-7 rounded-md flex items-center gap-3 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white"
					>
						<span>{subLink.name}</span>
					</BasicLink>
				))}
			</span>
		</details>
	)
})
