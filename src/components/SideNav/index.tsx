import * as React from 'react'
import Link from 'next/link'
import DefiLogo from '~/assets/DefiLogo'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { Nav, Wrapper } from './shared'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import StablecoinsNav from './StablecoinsSideNav'
import ThemeSwitch from './ThemeSwitch'

export default function SideNav() {
	const isYieldApp = useYieldApp()
	const isStableCoinsApp = usePeggedApp()
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	return (
		<Wrapper>
			<Link href="/" passHref>
				<a style={{ width: '160px', height: '54px' }}>
					<span className="visually-hidden">Navigate to Home Page</span>
					<DefiLogo />
				</a>
			</Link>

			<Nav>{isYieldApp ? <YieldSideNav /> : isStableCoinsApp ? <StablecoinsNav /> : <DefiSideNav />}</Nav>

			<ThemeSwitch isActive={darkMode} toggle={toggleDarkMode} />
		</Wrapper>
	)
}
