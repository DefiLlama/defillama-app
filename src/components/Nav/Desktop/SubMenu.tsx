import { forwardRef } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { linksWithNoSubMenu, navLinks } from '../Links'
import { useRouter } from 'next/router'

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const { pathname, asPath } = useRouter()

	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)

	const active = isActive({ category: name, pathname })

	if (noSubMenu) {
		return (
			<Link href={noSubMenu.url} prefetch={false} passHref>
				<MainLink data-linkactive={active}>
					{navLinks[name].icon}
					<span>{name}</span>
				</MainLink>
			</Link>
		)
	}

	return (
		<Details ref={ref} open={active ? true : false}>
			<summary>
				{navLinks[name].icon}
				<span>{name}</span>
			</summary>

			<SubMenuWrapper>
				{navLinks[name].main.map((subLink) => (
					<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
						<a data-linkactive={subLink.path === asPath}>
							<span style={{ width: '16px', display: 'inline-block' }}></span>
							<span>{subLink.name}</span>
						</a>
					</Link>
				))}
			</SubMenuWrapper>
		</Details>
	)
})

const Details = styled.details`
	summary {
		display: flex;
		align-items: center;
		gap: 12px;
		list-style: none;
		list-style-type: none;
		opacity: 1;
		font-weight: 500;
		cursor: pointer;
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
	font-weight: 500;
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

const isActive = ({ pathname, category }: { pathname: string; category: string }) => {
	switch (category) {
		case 'Yields':
			return isYields(pathname)
		case 'Stables':
			return isStables(pathname)
		case 'Liquidations':
			return isLiquidations(pathname)
		case 'DEXs':
			return isDexs(pathname)
		case 'Fees':
			return isFees(pathname)
		case 'DeFi':
			return (
				!isYields(pathname) &&
				!isStables(pathname) &&
				!isLiquidations(pathname) &&
				!isDexs(pathname) &&
				!isFees(pathname)
			)
		default:
			return false
	}
}

export default SubMenu
