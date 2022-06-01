import React, { useState } from 'react'
import DefiSideNav from './DefiSideNav'
import YieldSideNav from './YieldSideNav'
import { useLg, useYieldApp } from '../../hooks'
import AppSwitch from 'components/AppSwitch'
import { Wrapper, TitleWrapper } from './shared'
import SettingsMenuButton from '../SettingsModal'
import NavMenuButton from './NavMenuButton'
import Title from '../Title'

export default function SideNav() {
  const isYieldApp = useYieldApp()
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)
  const isLg = useLg()

  return (
    <Wrapper>
      <TitleWrapper>
        <Title homePath={isYieldApp ? '/yields' : '/'} />
        {isLg && (
          <>
            <SettingsMenuButton />
            <NavMenuButton show={showMobileNavMenu} setShow={setShowMobileNavMenu} />
          </>
        )}
      </TitleWrapper>

      {isLg}

      {!isLg ? (
        <>
          <AppSwitch />
          {isYieldApp ? <YieldSideNav /> : <DefiSideNav />}
        </>
      ) : (
        showMobileNavMenu && <>{isYieldApp ? <YieldSideNav /> : <DefiSideNav />}</>
      )}
    </Wrapper>
  )
}
