import * as React from 'react'
import Link from 'next/link'
import Image from 'next/future/image'
import styled from 'styled-components'
import AppSwitch from '~/components/AppSwitch'
import SettingsMenu from '~/components/SettingsModal'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { Nav, TitleWrapper, LogoWrapper, Wrapper, MobileOnlyEntry, Entry, FooterWrapper } from './shared'
import NavMenuButton from './NavMenuButton'
import { navLinks } from './Links'
import ThemeSwitch from './ThemeSwitch'
import Logo from '~/assets/logo_white_long.png'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export default function SideNav() {
	const isYieldApp = useYieldApp()
	const isPeggedApp = usePeggedApp()
	const [showMobileNavMenu, setShowMobileNavMenu] = React.useState(false)
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	const style = {
		'--mobile-display': showMobileNavMenu ? 'flex' : 'none'
	} as React.CSSProperties

	const links = isYieldApp ? navLinks.yields : isPeggedApp ? navLinks.stablecoins : navLinks.defi

	return (
		<Wrapper>
			<TitleWrapper>
				<Link href="/" passHref>
					<LogoWrapper>
						<span className="visually-hidden">Navigate to Home Page</span>
						<Image src={Logo} alt="Navigate to Home Page" priority />
					</LogoWrapper>
				</Link>

				<Settings />

				<NavMenuButton show={showMobileNavMenu} setShow={setShowMobileNavMenu} />
			</TitleWrapper>

			<AppSwitch />

			<Nav style={style}>
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

const Settings = styled(SettingsMenu)`
	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		display: none !important;
	}
`
