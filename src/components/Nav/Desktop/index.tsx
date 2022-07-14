import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AppSwitch from '~/components/AppSwitch'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { Nav, Wrapper } from './shared'
import DefiSideNav from './Defi'
import YieldSideNav from './Yield'
import StablecoinsNav from './Stablecoins'
import Logo from '~/assets/logo_white_long.png'
import ThemeSwitch from '../ThemeSwitch'
import { LogoWrapper } from '../shared'

export default function Desktop() {
	const isYieldApp = useYieldApp()
	const isStableCoinsApp = usePeggedApp()
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	return (
		<Wrapper>
			<Link href="/" passHref>
				<LogoWrapper>
					<Image
						src={Logo}
						alt="Navigate to Home Page"
						height={54}
						width={160}
						objectFit="contain"
						objectPosition="left"
						priority
					/>
				</LogoWrapper>
			</Link>

			<AppSwitch />

			<Nav>{isYieldApp ? <YieldSideNav /> : isStableCoinsApp ? <StablecoinsNav /> : <DefiSideNav />}</Nav>

			<ThemeSwitch isActive={darkMode} toggle={toggleDarkMode} />
		</Wrapper>
	)
}
