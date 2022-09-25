import * as React from 'react'
import Link from 'next/link'
import Image from 'next/future/image'
import styled from 'styled-components'
import { useYieldApp } from '~/hooks'
import { LogoWrapper, Header } from '../shared'
import { navLinks } from '../Links'
import ThemeSwitch from '../ThemeSwitch'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark.png'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import SubMenu from './SubMenu'

export default function DesktopNav() {
	const isYieldApp = useYieldApp()
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	const commonLinks = isYieldApp ? navLinks['Yields'] : navLinks['DeFi']

	return (
		<Wrapper as="aside">
			<Link href="/" passHref>
				<LogoWrapper>
					<span className="visually-hidden">Navigate to Home Page</span>
					<Image src={darkMode ? logoLight : logoDark} alt="Navigate to Home Page" priority />
				</LogoWrapper>
			</Link>

			<Nav>
				<p data-linksheader>Dashboards</p>

				{Object.keys(navLinks).map((mainLink) => (
					<SubMenu key={mainLink} name={mainLink} />
				))}

				<hr />

				<p data-linksheader>Tools</p>

				{commonLinks.tools.map((link) => {
					if ('onClick' in link) {
						return (
							<button key={link.name} onClick={link.onClick}>
								{link.name}
							</button>
						)
					} else {
						return (
							<React.Fragment key={link.name}>
								<Link href={link.path} key={link.path} prefetch={false} passHref>
									<a target="_blank" rel="noopener noreferrer">
										{link.name}
										{link.newTag === true && <span data-newtag>NEW</span>}
									</a>
								</Link>
							</React.Fragment>
						)
					}
				})}

				<hr />

				{commonLinks.footer.map((link) => {
					if ('onClick' in link) {
						return (
							<button key={link.name} onClick={link.onClick}>
								{link.name}
							</button>
						)
					} else {
						return (
							<React.Fragment key={link.name}>
								<Link href={link.path} key={link.path} prefetch={false} passHref>
									<a target="_blank" rel="noopener noreferrer">
										{link.name}
										{link.newTag === true && <span data-newtag>NEW</span>}
									</a>
								</Link>
							</React.Fragment>
						)
					}
				})}
			</Nav>

			<ThemeSwitch isActive={darkMode} toggle={toggleDarkMode} />
		</Wrapper>
	)
}

export const Wrapper = styled(Header)`
	display: none;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: flex;
	}
`

const Nav = styled.nav`
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	gap: 16px;

	button {
		text-align: start;
		padding: 0;
	}

	a,
	button {
		cursor: pointer;
		opacity: 0.7;
	}

	p[data-linksheader] {
		font-size: 0.75rem;
		opacity: 0.6;
	}

	& > * {
		& > *[data-newtag] {
			background: #ebebeb;
			font-size: 0.625rem;
			border-radius: 4px;
			padding: 3px;
			color: black;
			margin-left: 8px;
		}
	}

	& > *:hover {
		opacity: 1;
	}
`
