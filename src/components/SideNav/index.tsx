import React, { useState } from 'react'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import { useYieldApp } from '../../hooks'
import AppSwitch from 'components/AppSwitch'
import { Nav, TitleWrapper, Wrapper } from './shared'
import SettingsMenu from '../SettingsModal'
import NavMenuButton from './NavMenuButton'
import Title from '../Title'
import styled from 'styled-components'

export default function SideNav() {
  const isYieldApp = useYieldApp()
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)

  const style = { '--mobile-display': showMobileNavMenu ? 'flex' : 'none' } as React.CSSProperties

  return (
    <Wrapper>
      <TitleWrapper>
        <Title homePath={isYieldApp ? '/yields' : '/'} />

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
