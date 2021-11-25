import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { TrendingUp, HelpCircle, Link as LinkLogo } from 'react-feather'

import { DesktopWrapper, Entry, MobileWrapper, Wrapper, ButtonWrapper, Footer, Mobile, Desktop } from './shared'
import { AutoColumn } from '../Column'
import Title from '../Title'
import SettingsMenuButton from '../SettingsModal'
import NavMenuButton from './NavMenuButton'
import { useDarkModeManager } from '../../contexts/LocalStorage'

function SideNav() {
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)
  const [isDark, toggleDarkMode] = useDarkModeManager()
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  const NavMenu = () => (
    <AutoColumn gap="1.25rem" style={{ paddingBottom: '1rem', marginBottom: 'auto' }}>
      <Entry url="nfts" name="Overview" history={history} Icon={TrendingUp} />
      <Entry url="nfts/chains" name="Chains" history={history} Icon={LinkLogo} />
      <Entry url="nfts/about" name="About" history={history} Icon={HelpCircle} />
    </AutoColumn>
  )

  return (
    <>
      <Mobile>
        <Wrapper isMobile={true}>
          <MobileWrapper>
            <Title homePath={'/nfts'} />
            <ButtonWrapper>
              <SettingsMenuButton />
              <NavMenuButton setShow={setShowMobileNavMenu} show={showMobileNavMenu} />
            </ButtonWrapper>
          </MobileWrapper>
          {showMobileNavMenu && <NavMenu />}
        </Wrapper>
      </Mobile>
      <Desktop>
        <Wrapper isMobile={false}>
          <DesktopWrapper>
            <AutoColumn gap="1rem">
              <Title homePath={'/nfts'} />
              <NavMenu />
            </AutoColumn>
            <Footer isDark={isDark} toggleDarkMode={toggleDarkMode} />
          </DesktopWrapper>
        </Wrapper>
      </Desktop>
    </>
  )
}

export default SideNav
