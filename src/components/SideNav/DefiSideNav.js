import React from 'react'
import { DesktopWrapper, entry, MobileWrapper, Option, Wrapper, footer } from './shared'
import { AutoColumn } from '../Column'
import Title from '../Title'
import { BasicLink } from '../Link'
import { useMedia } from 'react-use'
import { withRouter } from 'react-router-dom'
import { TrendingUp, Disc, HelpCircle, Link as LinkLogo, CloudDrizzle, Minimize2 } from 'react-feather'
import { useDarkModeManager } from '../../contexts/LocalStorage'
import categories from '../../constants/categories'
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
          <Title />
          <AutoColumn gap="1.25rem" style={{ marginTop: '1rem' }}>
            {entry("home", "Overview", history, { icon: TrendingUp })}
            <BasicLink to="/protocols">
              <Option
                activeText={
                  ((history.location.pathname.split('/')[1] === 'protocols' && history.location.pathname.split('/')[2] === undefined) ||
                    history.location.pathname.split('/')[1] === 'protocol') ??
                  undefined
                }
              >
                <Disc size={20} style={{ marginRight: '.75rem' }} />
                Protocols
              </Option>
            </BasicLink>
            {entry("chains", "Chains", history, { icon: LinkLogo })}
            {entry("airdrops", "Airdrops", history, { icon: CloudDrizzle })}
            {categories
              .map(categoryData =>
                <BasicLink to={`/protocols/${categoryData.name.toLowerCase()}`} key={categoryData.name}>
                  <Option
                    activeText={
                      (history.location.pathname.split('/')[1] === 'protocols' &&
                        history.location.pathname.split('/')[2] === categoryData.name) ??
                      undefined
                    }
                  >
                    <categoryData.icon size={20} style={{ marginRight: '.75rem' }} />
                    {categoryData.name}
                  </Option>
                </BasicLink>
              )}
            {entry("comparison", "Comparison", history, { icon: Minimize2 })}
            {entry("about", "About", history, { icon: HelpCircle })}
          </AutoColumn>
        </AutoColumn>
        {footer(below1180, isDark, toggleDarkMode)}
      </DesktopWrapper>
    </Wrapper>
  )
}

export default withRouter(SideNav)
