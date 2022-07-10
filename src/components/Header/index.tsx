import * as React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import DefiLogo from './DefiLogo'
import { useRouter } from 'next/router'

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
	return (
		<Wrapper>
			<Link href="/" passHref>
				<LogoWrapper>
					<span className="visually-hidden">Navigate to Home Page</span>
					<DefiLogo />
				</LogoWrapper>
			</Link>

			{appLinks.map((item) => (
				<Link href={item.url} key={item.url} passHref>
					<AppLink isActive={router.pathname === item.url}>{item.name}</AppLink>
				</Link>
			))}

			{/* <Link href="/" passHref>
				<a target="_blank" rel="noopener noreferrer">
					<span className="visually-hidden">Twitter</span>
					<Twitter />
				</a>
			</Link>
			<Link href="/" passHref>
				<a target="_blank" rel="noopener noreferrer">
					<span className="visually-hidden">Discord</span>
					<Discord />
				</a>
			</Link>
			<Link href="/" passHref>
				<a target="_blank" rel="noopener noreferrer">
					<span className="visually-hidden">Github</span>
					<GitHub />
				</a>
			</Link> */}
		</Wrapper>
	)
}

const Wrapper = styled.header`
	grid-column: 1/ -1;
	grid-row: span 1;
	display: flex;
	align-items: center;
	gap: 1.5rem;
	padding: 12px 36px;
	background: linear-gradient(168deg, #344179 3.98%, #445ed0 100%);
	z-index: 10;
`
interface IAppLinkWrapper {
	isActive: boolean
}

const AppLink = styled.a<IAppLinkWrapper>`
	font-size: 1rem;
	font-weight: 500;
	position: relative;
	top: 1.5px;
	color: ${({ isActive }) => (isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)')};

	:hover,
	:focus-visible {
		color: #fff;
	}
`

const LogoWrapper = styled.a`
	svg {
		width: 160px;
		height: 46px;
		position: relative;
		margin: 0 -8px;
	}
`
