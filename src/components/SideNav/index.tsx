import * as React from 'react'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { Nav, Wrapper } from './shared'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import StablecoinsNav from './StablecoinsSideNav'

export default function SideNav() {
	const isYieldApp = useYieldApp()
	const isStableCoinsApp = usePeggedApp()

	return (
		<Wrapper>
			<Nav>{isYieldApp ? <YieldSideNav /> : isStableCoinsApp ? <StablecoinsNav /> : <DefiSideNav />}</Nav>
		</Wrapper>
	)
}
