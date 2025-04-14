import { useEffect, useRef, useState, Fragment, forwardRef } from 'react'
import Link from 'next/link'
import { linksWithNoSubMenu, navLinks, defaultToolsAndFooterLinks } from '../Links'
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

const isYields = (pathname: string) =>
	pathname === '/yields' || pathname.startsWith('/yields/') || pathname.startsWith('/yields?')
const isStables = (pathname: string) =>
	pathname === '/stablecoins' || pathname.startsWith('/stablecoin/') || pathname.startsWith('/stablecoins/')
const isLiquidations = (pathname: string) => pathname === '/liquidations' || pathname.startsWith('/liquidations/')
const isDexs = (pathname: string) =>
	pathname === '/dexs' ||
	pathname.startsWith('/dexs/') ||
	pathname.startsWith('/dex/') ||
	pathname.startsWith('/aggregator') ||
	pathname.startsWith('/perps') ||
	pathname.startsWith('/options') ||
	pathname.startsWith('/bridge-aggregators')
const isFees = (pathname: string) =>
	pathname === '/fees' || pathname.startsWith('/fees/') || pathname.startsWith('/fee/')
const isRaises = (pathname: string) => pathname.startsWith('/raises')
const isHacks = (pathname: string) => pathname === '/hacks'
const isBridges = (pathname: string) => pathname.startsWith('/bridge') && pathname !== '/bridged'
const isBorrow = (pathname: string) => pathname.startsWith('/borrow')
const isNFT = (pathname: string) => pathname.startsWith('/nfts')
const isUnlocks = (pathname: string) => pathname.startsWith('/unlocks')
const isCEX = (pathname: string) => pathname.startsWith('/cexs') || pathname.startsWith('/cex/')
const isGovernance = (pathname: string) => pathname.startsWith('/governance')
const isLSD = (pathname: string) => pathname.startsWith('/lsd')
const isETF = (pathname: string) => pathname.startsWith('/crypto-etf') || pathname === '/etfs'
const isNarrativeTracker = (pathname: string) => pathname.startsWith('/narrative-tracker')

const isActive = ({ pathname, category }: { pathname: string; category: string }) => {
	switch (category) {
		case 'Yields':
			return isYields(pathname)
		case 'Stables':
			return isStables(pathname)
		case 'Liquidations':
			return isLiquidations(pathname)
		case 'Volumes':
			return isDexs(pathname)
		case 'Fees/Revenue':
			return isFees(pathname)
		case 'Raises':
			return isRaises(pathname)
		case 'Hacks':
			return isHacks(pathname)
		case 'Bridges':
			return isBridges(pathname)
		case 'Borrow Aggregator':
			return isBorrow(pathname)
		case 'NFT':
			return isNFT(pathname)
		case 'Unlocks':
			return isUnlocks(pathname)
		case 'CEX Transparency':
			return isCEX(pathname)
		case 'Governance':
			return isGovernance(pathname)
		case 'ETH Liquid Staking':
			return isLSD(pathname)
		case 'Crypto ETFs':
			return isETF(pathname)
		case 'Narrative Tracker':
			return isNarrativeTracker(pathname)
		case 'DeFi':
			return (
				!isYields(pathname) &&
				!isStables(pathname) &&
				!isLiquidations(pathname) &&
				!isDexs(pathname) &&
				!isFees(pathname) &&
				!isRaises(pathname) &&
				!isHacks(pathname) &&
				!isBorrow(pathname) &&
				!isNFT(pathname) &&
				!isBridges(pathname) &&
				!isUnlocks(pathname) &&
				!isCEX(pathname) &&
				!isGovernance(pathname) &&
				!isLSD(pathname) &&
				!isETF(pathname) &&
				!isNarrativeTracker(pathname) &&
				!isDefaultLink(pathname)
			)
		default:
			return false
	}
}

const isDefaultLink = (pathname) =>
	[...defaultToolsAndFooterLinks.tools, ...defaultToolsAndFooterLinks.footer].map((x) => x.path).includes(pathname)

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)
	const router = useRouter()
	const active = isActive({ category: name, pathname: router.pathname })

	if (noSubMenu || (name === 'Yields' && !active)) {
		return (
			<Link href={noSubMenu?.url ?? '/yields'} prefetch={false} passHref>
				<a
					target={noSubMenu?.external && '_blank'}
					data-linkactive={(noSubMenu?.url ?? '/yields') === router.pathname}
					className="rounded-md hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-3"
				>
					{name}
				</a>
			</Link>
		)
	}

	return (
		<details ref={ref} className={`group select-none ${active ? 'text-white' : ''}`}>
			<summary
				data-togglemenuoff={false}
				data-linkactive={active}
				className="group/summary rounded-md flex items-center gap-1 list-none p-3 relative left-[-22px] data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white"
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
					<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
						<a
							data-linkactive={subLink.path === router.asPath.split('/?')[0].split('?')[0]}
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
