import * as React from 'react'
import Link from 'next/link'
import Image from 'next/future/image'
import styled from 'styled-components'
import AppSwitch from '~/components/AppSwitch'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { Nav, LogoWrapper, MobileOnlyEntry, Entry, FooterWrapper, Header } from '../shared'
import { navLinks } from '../Links'
import ThemeSwitch from '../ThemeSwitch'
import Logo from '~/assets/logo_white_long.png'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export default function DesktopNav() {
	const isYieldApp = useYieldApp()
	const isPeggedApp = usePeggedApp()
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	const links = isYieldApp ? navLinks.yields : isPeggedApp ? navLinks.stablecoins : navLinks.defi

	return (
		<Wrapper>
			<Link href="/" passHref>
				<LogoWrapper>
					<span className="visually-hidden">Navigate to Home Page</span>
					<Image src={Logo} alt="Navigate to Home Page" priority />
				</LogoWrapper>
			</Link>

			<AppSwitch />

			<Nav>
				{links.main.map((link) => (
					<React.Fragment key={link.path}>
						{link.mobileOnly ? (
							<MobileOnlyEntry name={link.name} url={link.path} Icon={link.icon} style={{ marginTop: '20px' }} />
						) : (
							<Entry name={link.name} url={link.path} Icon={link.icon} newTag={link.newTag} />
						)}
					</React.Fragment>
				))}

				<FooterWrapper>
					{links.footer.map((link) => {
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
										</a>
									</Link>
								</React.Fragment>
							)
						}
					})}
				</FooterWrapper>

				<ThemeSwitch isActive={darkMode} toggle={toggleDarkMode} />
			</Nav>
		</Wrapper>
	)
}

const Wrapper = styled(Header)`
	display: none;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: flex;
	}
`
