import { useEffect, useRef, useState, Fragment, forwardRef } from 'react'
import Link from 'next/link'
import { linksWithNoSubMenu, navLinks } from '../Links'
import { useYieldApp } from '~/hooks'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

export function Menu() {
	const [show, setShow] = useState(false)
	const buttonEl = useRef<HTMLButtonElement>(null)
	const navEl = useRef<HTMLDivElement>(null)

	const router = useRouter()

	const isYieldApp = useYieldApp()

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

		return () => {
			document.removeEventListener('click', handleClick)
		}
	}, [])

	return (
		<>
			<button onClick={() => setShow(!show)} ref={buttonEl} className="shadow p-3 rounded-lg bg-[#445ed0] -my-[2px]">
				<span className="sr-only">Open Navigation Menu</span>
				<Icon name="menu" height={16} width={16} />
			</button>

			<div
				data-active={show}
				className="hidden data-[active=true]:block fixed top-0 right-0 bottom-0 left-0 bg-black/10"
			>
				<nav
					ref={navEl}
					className="fixed top-0 right-0 bottom-0 overflow-auto flex flex-col w-full max-w-[300px] bg-[var(--bg1)] p-4 pl-5 animate-slidein"
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
									className="rounded-md hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-3"
								>
									{link.name}
								</button>
							)
						} else {
							return (
								<Fragment key={link.name}>
									<Link href={link.path} key={link.path} prefetch={false} passHref>
										<a
											target="_blank"
											rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
											data-linkactive={link.path === router.asPath.split('/?')[0].split('?')[0]}
											className="rounded-md hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-3"
										>
											{link.name}
										</a>
									</Link>
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
									className="rounded-md hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-3"
								>
									{link.name}
								</button>
							)
						} else {
							return (
								<Fragment key={link.name}>
									<Link href={link.path} key={link.path} prefetch={false} passHref>
										<a
											target="_blank"
											rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
											data-linkactive={link.path === router.asPath.split('/?')[0].split('?')[0]}
											className="rounded-md hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-3"
										>
											{link.name}
										</a>
									</Link>
								</Fragment>
							)
						}
					})}
				</nav>
			</div>
		</>
	)
}

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)
	const router = useRouter()

	if (noSubMenu || (name === 'Yields' && !router.pathname.startsWith('/yields'))) {
		return (
			<Link href={noSubMenu?.url ?? '/yields'} passHref>
				<a
					target={noSubMenu?.external && '_blank'}
					className="rounded-md hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-3"
				>
					{name}
				</a>
			</Link>
		)
	}

	return (
		<details ref={ref} className="group select-none">
			<summary
				data-togglemenuoff={false}
				className="group/summary rounded-md flex items-center gap-1 list-none p-3 relative left-[-22px]"
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
				{navLinks[name].main.map((subLink, i) => (
					<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
						<a
							data-linkactive={i == 2}
							className="py-3 pl-7 rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white"
						>
							<span>{subLink.name}</span>
						</a>
					</Link>
				))}
			</span>
		</details>
	)
})
