import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import DefiLogo from '~/assets/DefiLogo'
import ThemeSwitch from '~/components/SideNav/ThemeSwitch'
import { useDarkModeManager } from '~/contexts/LocalStorage'

interface IAppLink {
	name: string
	url: string
}

const appLinks: IAppLink[] = [
	{ name: 'DeFi', url: '/' },
	{ name: 'Yields', url: '/yields' },
	{ name: 'Stablecoins', url: '/stablecoins' }
]

export default function Header() {
	const router = useRouter()
	const [darkMode, toggleDarkMode] = useDarkModeManager()
	return (
		<Wrapper>
			{/* <Link href="/" passHref>
				<LogoWrapper>
					<span className="visually-hidden">Navigate to Home Page</span>
					<DefiLogo />
				</LogoWrapper>
			</Link>

			<MobileLinksWrapper></MobileLinksWrapper>

			<AppLinksWrapper>
				{appLinks.map((item) => (
					<Link href={item.url} key={item.url} passHref>
						<AppLink isActive={router.pathname === item.url}>{item.name}</AppLink>
					</Link>
				))}

				<ThemeSwitch isActive={darkMode} toggle={toggleDarkMode} />
			</AppLinksWrapper> */}
		</Wrapper>
	)
}

const Wrapper = styled.header`
	grid-column: 1/ -1;
	grid-row: span 1;
	display: flex;
	align-items: center;
	gap: 1.5rem;
	padding: 12px 16px;
	z-index: 10;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`
interface IAppLinkWrapper {
	isActive: boolean
}

const AppLink = styled.a<IAppLinkWrapper>`
	font-size: 0.85rem;
	font-weight: 500;
	position: relative;
	color: ${({ isActive }) => (isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)')};

	:hover,
	:focus-visible {
		color: #fff;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		font-size: 1rem;
		top: 1px;
	}
`

const LogoWrapper = styled.a`
	flex-shrink: 0;
	svg {
		width: 160px;
		height: 30px;
		position: relative;
		margin: 0 -20px;
	}
`

const MobileLinksWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 1.5rem;
	flex: 1;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`
