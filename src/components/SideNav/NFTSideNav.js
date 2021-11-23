import React from 'react'
import { DesktopWrapper, Entry, MobileWrapper, Wrapper, Footer } from './shared'
import { AutoColumn } from '../Column'
import Title from '../Title'
import { useMedia } from 'react-use'
import { TrendingUp, HelpCircle, Link as LinkLogo } from 'react-feather'
import { useDarkModeManager } from '../../contexts/LocalStorage'
import Menu from '../SettingsModal'
import { useRouter } from 'next/router'

function SideNav() {
  const below1080 = useMedia('(max-width: 1080px)')
  const [isDark, toggleDarkMode] = useDarkModeManager()
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  if (below1080) {
    return (
      <Wrapper isMobile={true}>
        <MobileWrapper>
          <Title />
          <Menu />
        </MobileWrapper>
      </Wrapper>
    )
  }

  return (
    <Wrapper isMobile={false}>
      <DesktopWrapper>
        <AutoColumn gap="1rem">
          <Title homePath={'/nfts'} />
          <AutoColumn gap="1.25rem" style={{ paddingBottom: '1rem', marginBottom: 'auto' }}>
            <Entry url="nfts" name="Overview" history={history} Icon={TrendingUp} />
            <Entry url="nfts/chains" name="Chains" history={history} Icon={LinkLogo} />
            <Entry url="nfts/about" name="About" history={history} Icon={HelpCircle} />
          </AutoColumn>
        </AutoColumn>
        <Footer isDark={isDark} toggleDarkMode={toggleDarkMode} />
      </DesktopWrapper>
    </Wrapper>
  )
}

export default SideNav
