import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { TNavLink, TNavLinks } from '../types'

export function Menu({
	mainLinks,
	pinnedPages,
	userDashboards,
	footerLinks
}: {
	mainLinks: TNavLinks
	pinnedPages: TNavLink[]
	userDashboards: TNavLink[]
	footerLinks: TNavLinks
}) {
	const [show, setShow] = useState(false)
	const buttonEl = useRef<HTMLButtonElement>(null)
	const navEl = useRef<HTMLDivElement>(null)

	const router = useRouter()
	const { isAuthenticated, user, logout } = useAuthContext()

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
				className="-my-[2px] rounded-md bg-[#445ed0] p-3 text-white shadow"
			>
				<span className="sr-only">Open Navigation Menu</span>
				<Icon name="menu" height={16} width={16} />
			</button>

			<div
				data-active={show}
				className="fixed top-0 right-0 bottom-0 left-0 hidden bg-black/10 data-[active=true]:block"
			>
				<nav
					ref={navEl}
					className="animate-slidein fixed top-0 right-0 bottom-0 flex w-full max-w-[300px] flex-col overflow-auto bg-(--bg-main) p-4 pl-5 text-black dark:text-white"
				>
					<button onClick={(prev) => setShow(!prev)} className="ml-auto">
						<span className="sr-only">Close Navigation Menu</span>
						<Icon name="x" height={20} width={20} strokeWidth="4px" />
					</button>

					{mainLinks.map(({ category, pages }) => (
						<div key={`mobile-nav-${category}`} className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">{category}</p>
							<hr className="border-black/20 dark:border-white/20" />
							{pages.map(({ name, route }) => (
								<LinkToPage route={route} name={name} key={`mobile-nav-${name}-${route}`} />
							))}
						</div>
					))}

					{pinnedPages.length > 0 ? (
						<div className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">Pinned Pages</p>
							<hr className="border-black/20 dark:border-white/20" />
							{pinnedPages.map(({ name, route }) => (
								<LinkToPage route={route} name={name} key={`mobile-nav-pinned-${name}-${route}`} />
							))}
						</div>
					) : null}

					{userDashboards.length > 0 ? (
						<div className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">Your Dashboards</p>
							<hr className="border-black/20 dark:border-white/20" />
							{userDashboards.map(({ name, route }) => (
								<LinkToPage route={route} name={name} key={`mobile-nav-${name}-${route}`} />
							))}
						</div>
					) : null}

					{footerLinks.map(({ category, pages }) => (
						<div key={`mobile-nav-${category}`} className="group mb-3 flex flex-col first:mb-auto">
							<p className="mb-1 text-xs opacity-65">{category}</p>
							<hr className="border-black/20 dark:border-white/20" />
							{pages.map(({ name, route }) => (
								<LinkToPage route={route} name={name} key={`mobile-nav-${name}-${route}`} />
							))}
						</div>
					))}

					<hr className="my-3 border-black/20 dark:border-white/20" />

					{isAuthenticated ? (
						<div className="flex flex-col gap-2">
							{user && <span className="p-3 text-sm text-[#8a8c90]">{user.email}</span>}
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

const LinkToPage = ({ route, name }: { route: string; name: string }) => {
	const { asPath } = useRouter()

	return (
		<BasicLink
			href={route}
			data-linkactive={route === asPath.split('/?')[0].split('?')[0]}
			className="-ml-[6px] flex items-center gap-3 rounded-md p-[6px] hover:bg-black/5 focus-visible:bg-black/5 data-[linkactive=true]:bg-(--link-active-bg) data-[linkactive=true]:text-white dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
		>
			{name}
		</BasicLink>
	)
}
