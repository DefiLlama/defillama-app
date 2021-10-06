import React from 'react'
import { DesktopWrapper, entry, MobileWrapper, Wrapper, footer } from './shared'
import { AutoColumn } from '../Column'
import Title from '../Title'
import { useMedia } from 'react-use'
import { withRouter } from 'react-router-dom'
import { TrendingUp, HelpCircle, Link as LinkLogo } from 'react-feather'
import { useDarkModeManager } from '../../contexts/LocalStorage'
import Menu from '../SettingsModal'

function SideNav({ history }) {
  const below1080 = useMedia('(max-width: 1080px)')
  const below1180 = useMedia('(max-width: 1080px)')

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
            {entry("nfts", "Overview", history, { icon: TrendingUp })}
            {entry("nfts/chains", "Chains", history, { icon: LinkLogo })}
            {entry("nfts/about", "About", history, { icon: HelpCircle })}
          </AutoColumn>
        </AutoColumn>
        {footer(below1180, isDark, toggleDarkMode)}
      </DesktopWrapper>
    </Wrapper>
  )
}

export default withRouter(SideNav)
