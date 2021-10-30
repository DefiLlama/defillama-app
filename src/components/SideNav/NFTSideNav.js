import React from 'react'
import { DesktopWrapper, Entry, MobileWrapper, Wrapper, Footer } from './shared'
import { AutoColumn } from '../Column'
import Title from '../Title'
import { useMedia } from 'react-use'
import { withRouter } from 'react-router-dom'
import { TrendingUp, HelpCircle, Link as LinkLogo } from 'react-feather'
import { useDarkModeManager } from '../../contexts/LocalStorage'
import Menu from '../SettingsModal'

function SideNav({ history }) {
  const below1080 = useMedia('(max-width: 1080px)')

  const [isDark, toggleDarkMode] = useDarkModeManager()

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
        <AutoColumn gap="1rem" style={{ marginLeft: '.75rem', marginTop: '1.5rem' }}>
          <Title homePath={'/nfts'} />
          <AutoColumn gap="1.25rem" style={{ marginTop: '1rem' }}>
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

export default withRouter(SideNav)
