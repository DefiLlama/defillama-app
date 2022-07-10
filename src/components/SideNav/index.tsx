import * as React from 'react'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { Nav, Wrapper } from './shared'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import StablecoinsNav from './StablecoinsSideNav'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import ThemeSwitch from './ThemeSwitch'

export default function SideNav() {
	const isYieldApp = useYieldApp()
	const isStableCoinsApp = usePeggedApp()

	const [darkMode, toggleDarkMode] = useDarkModeManager()

	return (
		<Wrapper>
			<Nav>
				<>
					{isYieldApp ? <YieldSideNav /> : isStableCoinsApp ? <StablecoinsNav /> : <DefiSideNav />}
					<ThemeSwitch isActive={darkMode} toggle={toggleDarkMode} />
				</>
			</Nav>
		</Wrapper>
	)
}
