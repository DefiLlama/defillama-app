import { forwardRef } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { linksWithNoSubMenu, navLinks } from '../Links'
import { useRouter } from 'next/router'
import { darken } from 'polished'

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const { pathname, asPath } = useRouter()

	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)

	const active = isActive({ category: name, pathname })

	if (noSubMenu) {
		return (
			<Link href={noSubMenu.url} passHref>
				<MainLink data-active={active} data-linkactive={active}>
					{navLinks[name].icon}
					<span data-togglemenuoff={false}>{name}</span>
				</MainLink>
			</Link>
		)
	}

	return (
		<Details ref={ref}>
			<summary data-togglemenuoff={false} data-active={active}>
				{navLinks[name].icon}
				<span data-togglemenuoff={false}>{name}</span>
			</summary>
			<SubMenuWrapper>
				{navLinks[name].main.map((subLink) => (
					<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
						<a data-linkactive={subLink.path === asPath}>
							<span style={{ width: '28px', display: 'inline-block' }}></span>
							<span>{subLink.name}</span>
						</a>
					</Link>
				))}
			</SubMenuWrapper>
		</Details>
	)
})

const Details = styled.details`
	cursor: pointer;

	summary {
		margin: -6px 0 -6px -6px;
		padding: 6px;
		border-radius: 6px;
		white-space: nowrap;
	}

	summary {
		display: flex;
		align-items: center;
		gap: 12px;
		list-style: none;
		list-style-type: none;
		font-size: 1rem;
		opacity: 0.8;
	}

	summary:hover {
		opacity: 1;
	}

	summary[data-active='true'] {
		background-color: #2172e5;
		color: white;
		opacity: 1;

		:hover,
		:focus-visible {
			background-color: ${darken(0.1, '#2172e5')};
		}
	}

	a[data-linkactive='true'] {
		opacity: 1;
		font-weight: 500;
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

	a:hover {
		opacity: 1;
	}
`

const MainLink = styled.a`
	display: flex;
	align-items: center;
	gap: 12px;
	opacity: 0.8;
	font-size: 1rem;
	margin: -6px 0 -6px -6px;
	padding: 6px;
	border-radius: 6px;
	white-space: nowrap;

	&[data-active='true'] {
		background-color: #2172e5;
		color: white;
		opacity: 1;
		:hover,
		:focus-visible {
			background-color: ${darken(0.1, '#2172e5')};
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
