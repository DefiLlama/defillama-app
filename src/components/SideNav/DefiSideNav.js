import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { TrendingUp, HelpCircle, Link as LinkLogo, CloudDrizzle, Minimize2, Clock, Bookmark, Award } from 'react-feather'

import { DesktopWrapper, Entry, MobileWrapper, Option, Wrapper, Footer, ButtonWrapper, Desktop, Mobile } from './shared'
import { AutoColumn } from '../Column'
import Title from '../Title'
import { BasicLink } from '../Link'
import SettingsMenuButton from '../SettingsModal'
import NavMenuButton from './NavMenuButton'
import { useDarkModeManager } from '../../contexts/LocalStorage'
import categories from '../../constants/categories'

const NavMenu = ({ isMobile }) => {
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  return (
    <AutoColumn gap="1.25rem" style={{ marginTop: '1rem' }}>
      <Entry url="nfts" name="NFTs" history={history} Icon={Award} />
      <Entry url="" name="Overview" history={history} Icon={TrendingUp} />
      <Entry url="chains" name="Chains" history={history} Icon={LinkLogo} />
      {!isMobile && <Entry url="portfolio" name="Portfolio" history={history} Icon={Bookmark} />}
      <Entry url="airdrops" name="Airdrops" history={history} Icon={CloudDrizzle} />
      <Entry url="comparison" name="Comparison" history={history} Icon={Minimize2} />
      <Entry url="recent" name="Recent" history={history} Icon={Clock} />
      {categories.map(categoryData => (
        <BasicLink href={`/protocols/${categoryData.name.toLowerCase()}`} key={categoryData.name}>
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
      ))}
      <Entry url="about" name="About" history={history} Icon={HelpCircle} />
    </AutoColumn>
  )
}

function SideNav() {
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)
  const [isDark, toggleDarkMode] = useDarkModeManager()

  return (
    <>
      <Wrapper>
        <MobileWrapper>
          <div>
            <Title />
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
        <Mobile>
          {showMobileNavMenu && <NavMenu isMobile />}
        </Mobile>
      </Wrapper>
    </>
  )
}

export default SideNav
