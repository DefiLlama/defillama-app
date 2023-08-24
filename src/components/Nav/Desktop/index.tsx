import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
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
	const { asPath } = useRouter()
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
									<a
										target={link.external && '_blank'}
										rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
										data-linkactive={link.path === asPath}
									>
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
									<a
										target={link.external && '_blank'}
										rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}
										data-linkactive={link.path === asPath}
									>
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
	user-select: none;

	a,
	button {
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		opacity: 0.8;
		text-align: start;
		margin: -6px 0 -6px -6px;
		padding: 6px;
		border-radius: 6px;

		& > *[data-newtag] {
			background: #ebebeb;
			font-size: 0.625rem;
			border-radius: 4px;
			padding: 2px 5px;
			color: black;
			position: relative;
			left: -4px;
			font-weight: 600;
			top: 1px;
			letter-spacing: 0.5px;
		}

		:hover,
		:focus-visible {
			opacity: 1;
			background-color: ${({ theme }) =>
		theme.mode === 'dark' ? 'rgba(246, 246, 246, 0.1)' : 'rgba(246, 246, 246, 1)'};
		}

		&[data-linkactive='true'] {
			background: linear-gradient(135deg, #2172e5, hsl(215 79% 36% / 1));
			color: white;
			font-weight:500;
			opacity: 1;
		}
	}

	p[data-linksheader] {
		font-size: 0.75rem;
		opacity: 0.5;
	}
`
