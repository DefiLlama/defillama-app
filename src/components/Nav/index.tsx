import React, { useState } from 'react'
import styled from 'styled-components'
import AppSwitch from 'components/AppSwitch'
import SettingsMenu from 'components/SettingsModal'
import { useYieldApp } from 'hooks'
import { Nav, TitleWrapper, Wrapper } from './shared'
import NavMenuButton from './NavMenuButton'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import Title from './Title'

export default function SideNav() {
  const isYieldApp = useYieldApp()
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)

  const style = { '--mobile-display': showMobileNavMenu ? 'flex' : 'none' } as React.CSSProperties

  return (
    <Wrapper>
      <TitleWrapper>
        <Title homePath="/" />

        <Settings />

        <NavMenuButton show={showMobileNavMenu} setShow={setShowMobileNavMenu} />
      </TitleWrapper>

      <AppSwitch />

      <Nav style={style}>{isYieldApp ? <YieldSideNav /> : <DefiSideNav />}</Nav>
    </Wrapper>
  )
}

const Settings = styled(SettingsMenu)`
  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    display: none !important;
  }
`
