import React, { useState } from 'react'

import DefiSideNav from './DefiSideNav'
import NFTSideNav from './NFTSideNav'
import { useNFTApp } from '../../hooks'
import AppSwitch from 'components/AppSwitch'
import { MobileWrapper, Wrapper, Footer, ButtonWrapper, Desktop, Mobile } from './shared'
import SettingsMenuButton from '../SettingsModal'
import NavMenuButton from './NavMenuButton'
import { AutoColumn } from '../Column'
import Title from '../Title'
import { useDarkModeManager } from 'contexts/LocalStorage'

const NavMenu = () => {
  const isNFTApp = useNFTApp()
  return (
    <>
      <AppSwitch />
      {isNFTApp ? <NFTSideNav /> : <DefiSideNav />}
    </>
  )
}

export default function SideNav() {
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)
  const [isDark, toggleDarkMode] = useDarkModeManager()
  const isNFTApp = useNFTApp()

  return (
    <Wrapper>
      <MobileWrapper>
        <div>
          <Title homePath={isNFTApp ? '/nfts' : '/'} />
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
