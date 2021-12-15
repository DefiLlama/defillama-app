import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { TrendingUp, HelpCircle, Link as LinkLogo, BarChart2 } from 'react-feather'

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
      <Entry url="" name="DeFi" history={history} Icon={BarChart2} />
    </AutoColumn>
  )

  return (
    <>
      <Wrapper>
        <MobileWrapper>
          <div>
            <Title homePath={'/nfts'} />
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
              <SettingsMenuButton type="nfts" />
              <NavMenuButton setShow={setShowMobileNavMenu} show={showMobileNavMenu} />
            </ButtonWrapper>
          </Mobile>
        </MobileWrapper>
        <Mobile>
          {showMobileNavMenu && <NavMenu isMobile />}
        </Mobile>
      </Wrapper>
    </>
  )
}

export default SideNav
