import React, { useState } from 'react'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import { useYieldApp } from '../../hooks'
import AppSwitch from 'components/AppSwitch'
import { MobileWrapper, Wrapper, Footer, ButtonWrapper, Desktop, Mobile } from './shared'
import SettingsMenuButton from '../SettingsModal'
import NavMenuButton from './NavMenuButton'
import { AutoColumn } from '../Column'
import Title from '../Title'
import { useDarkModeManager } from 'contexts/LocalStorage'

const NavMenu = ({ isMobile }) => {
  const isYieldApp = useYieldApp()

  return (
    <>
      {!isMobile && <AppSwitch />}
      {isYieldApp ? <YieldSideNav isMobile={isMobile} /> : <DefiSideNav isMobile={isMobile} />}
    </>
  )
}

export default function SideNav() {
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)
  const [isDark, toggleDarkMode] = useDarkModeManager()
  const isYieldApp = useYieldApp()

  return (
    <Wrapper>
      <MobileWrapper>
        <div>
          <Title homePath={isYieldApp ? '/yields' : '/'} />
          <Desktop>
            <AutoColumn gap="1rem" style={{ paddingBottom: '1rem', marginBottom: 'auto' }}>
              <NavMenu isMobile={false} />
            </AutoColumn>
          </Desktop>
        </div>
        <Desktop>
          <Footer isDark={isDark} toggleDarkMode={toggleDarkMode} />
        </Desktop>
        <Mobile>
          <ButtonWrapper>
            <SettingsMenuButton />
            <NavMenuButton setShow={setShowMobileNavMenu} show={showMobileNavMenu} />
          </ButtonWrapper>
        </Mobile>
      </MobileWrapper>
      <Mobile>{showMobileNavMenu && <NavMenu isMobile />}</Mobile>
    </Wrapper>
  )
}
