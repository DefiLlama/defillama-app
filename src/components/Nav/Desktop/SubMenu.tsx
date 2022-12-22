import { forwardRef } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { linksWithNoSubMenu, navLinks } from '../Links'
import { useRouter } from 'next/router'

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const { pathname } = useRouter()

	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)

	const active = isActive({ category: name, pathname })

	if (noSubMenu || (name === 'Yields' && !active)) {
		return (
			<Link href={noSubMenu?.url ?? '/yields'} prefetch={false} passHref>
				<MainLink data-linkactive={active}>
					<span data-mainlinkicon>{navLinks[name].icon}</span>
					<span>{name}</span>
				</MainLink>
			</Link>
		)
	}

	return (
		<Details ref={ref} open={active ? true : false}>
			<summary>
				<span data-mainlinkicon>{navLinks[name].icon}</span>
				<span>{name}</span>
			</summary>

			<SubMenuWrapper>
				{navLinks[name].main.map((subLink) => (
					<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
						<a data-linkactive={subLink.path === pathname}>
							<span style={{ width: '16px', display: 'inline-block' }}></span>
							<span>{subLink.name}</span>
							{subLink.newTag === true && <span data-newtag>NEW</span>}
						</a>
					</Link>
				))}
			</SubMenuWrapper>
		</Details>
	)
})

const wiggle = keyframes`
	0% {
		transform: rotate(10deg);
	}

	50% {
		transform: rotate(-10deg);
	}

	100% {
		transform: rotate(0);
	}
`

const Details = styled.details`
	summary {
		display: flex;
		align-items: center;
		gap: 12px;
		list-style: none;
		list-style-type: none;
		opacity: 1;
		font-weight: 600;
		cursor: pointer;

		:hover {
			& > *[data-mainlinkicon] {
				animation: ${wiggle} 0.4s ease;
			}
		}
	}

	summary::-webkit-details-marker {
		display: none;
	}
`

const SubMenuWrapper = styled.span`
	margin-top: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
`

const MainLink = styled.a`
	font-weight: 600;
	opacity: 1 !important;

	:hover {
		& > *[data-mainlinkicon] {
			animation: ${wiggle} 0.4s ease;
		}
	}
`

const isYields = (pathname: string) =>
	pathname === '/yields' || pathname.startsWith('/yields/') || pathname.startsWith('/yields?')
const isStables = (pathname: string) =>
	pathname === '/stablecoins' || pathname.startsWith('/stablecoin/') || pathname.startsWith('/stablecoins/')
const isLiquidations = (pathname: string) => pathname === '/liquidations' || pathname.startsWith('/liquidations/')
const isDexs = (pathname: string) =>
	pathname === '/dexs' || pathname.startsWith('/dexs/') || pathname.startsWith('/dex/')
const isFees = (pathname: string) =>
	pathname === '/fees' || pathname.startsWith('/fees/') || pathname.startsWith('/fee/')
const isRaises = (pathname: string) => pathname === '/raises'
const isHacks = (pathname: string) => pathname === '/hacks'
const isBridges = (pathname: string) => pathname.startsWith('bridge')
const isBorrow = (pathname: string) => pathname === '/borrow'

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
		case 'DeFi':
			return (
				!isYields(pathname) &&
				!isStables(pathname) &&
				!isLiquidations(pathname) &&
				!isDexs(pathname) &&
				!isFees(pathname) &&
				!isRaises(pathname) &&
				!isHacks(pathname) &&
				!isBorrow
			)
		default:
			return false
	}
}

export default SubMenu
