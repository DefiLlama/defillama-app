import { forwardRef } from 'react'
import Link from 'next/link'
import { defaultToolsAndFooterLinks, linksWithNoSubMenu, navLinks } from '../Links'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { NewTag } from '../NewTag'

export const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const { pathname } = useRouter()

	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)

	const active = isActive({ category: name, pathname })

	if (noSubMenu || (name === 'Yields' && !active)) {
		return (
			<Link href={noSubMenu?.url ?? '/yields'} prefetch={false} passHref>
				<a
					data-linkactive={(noSubMenu?.url ?? '/yields') === pathname}
					target={noSubMenu?.external && '_blank'}
					className="group -ml-[6px] font-semibold rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
				>
					<span className="group-hover:animate-wiggle">{navLinks[name].icon}</span>
					<span>{name}</span>
					{navLinks[name].newTag === true ? <NewTag /> : null}
				</a>
			</Link>
		)
	}

	return (
		<details ref={ref} open={active ? true : false} className="group">
			<summary className="group/summary -ml-[6px] font-semibold rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 p-[6px]">
				<span className="group-hover/summary:animate-wiggle group-focus-visible/summary:animate-wiggle">
					{navLinks[name].icon}
				</span>
				<span>{name}</span>
				{navLinks[name].newTag === true ? <NewTag /> : null}
				<Icon
					name="chevron-right"
					height={16}
					width={16}
					className="ml-auto group-open:rotate-90 transition-transform duration-100 relative -right-1"
				/>
			</summary>

			<span className="my-4 flex flex-col gap-4">
				{navLinks[name].main.map((subLink) => (
					<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
						<a
							data-linkactive={subLink.path === pathname}
							className="-my-[6px] pl-7 rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
						>
							<span>{subLink.name}</span>
							{subLink.newTag === true ? <NewTag /> : null}
						</a>
					</Link>
				))}
			</span>
		</details>
	)
})

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
	pathname.startsWith('/derivatives') ||
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
