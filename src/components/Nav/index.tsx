import * as React from 'react'
import styled from 'styled-components'
import AppSwitch from '~/components/AppSwitch'
import SettingsMenu from '~/components/SettingsModal'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { Nav, TitleWrapper, Wrapper } from './shared'
import NavMenuButton from './NavMenuButton'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import StablecoinsSideNav from './StablecoinsSideNav'
import Title from './Title'

export default function SideNav() {
	const isYieldApp = useYieldApp()
	const isPeggedApp = usePeggedApp()
	const [showMobileNavMenu, setShowMobileNavMenu] = React.useState(false)

	const style = {
		'--mobile-display': showMobileNavMenu ? 'flex' : 'none'
	} as React.CSSProperties

	return (
		<Wrapper>
			<TitleWrapper>
				<Title homePath="/" />

				<Settings />

				<NavMenuButton show={showMobileNavMenu} setShow={setShowMobileNavMenu} />
			</TitleWrapper>

			<AppSwitch />

			<Nav style={style}>{isYieldApp ? <YieldSideNav /> : isPeggedApp ? <StablecoinsSideNav /> : <DefiSideNav />}</Nav>
		</Wrapper>
	)
}

const Settings = styled(SettingsMenu)`
	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		display: none !important;
	}
`
