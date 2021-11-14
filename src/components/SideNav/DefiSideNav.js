import React, { useState } from "react"
import { DesktopWrapper, Entry, MobileWrapper, Option, Wrapper, Footer, ButtonWrapper } from "./shared"
import { AutoColumn } from "../Column"
import Title from "../Title"
import { BasicLink } from "../Link"
import { TrendingUp, Disc, HelpCircle, Link as LinkLogo, CloudDrizzle, Minimize2, Clock } from "react-feather"
import { useDarkModeManager } from "../../contexts/LocalStorage"
import categories from "../../constants/categories"
import SettingsMenuButton from "../SettingsModal"
import NavMenuButton from "./NavMenuButton"
import styled from "styled-components"

const Mobile = styled.div`
@media (min-width: 1080px) {
  display:none
}
`

const Desktop = styled.div`
@media (max-width: 1080px) {
  display:none
}
`

function SideNav() {
  const history = { location: { pathname: '' } }

  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)
  const [isDark, toggleDarkMode] = useDarkModeManager()

  const NavMenu = () => (
    <AutoColumn gap="1.25rem" style={{ marginTop: "1rem" }}>
      <Entry url="" name="Overview" history={history} Icon={TrendingUp} />
      <BasicLink href="/protocols">
        <Option
          activeText={
            ((history.location.pathname.split("/")[1] === "protocols" &&
              history.location.pathname.split("/")[2] === undefined) ||
              history.location.pathname.split("/")[1] === "protocol") ??
            undefined
          }
        >
          <Disc size={20} style={{ marginRight: ".75rem" }} />
          Protocols
        </Option>
      </BasicLink>
      <Entry url="chains" name="Chains" history={history} Icon={LinkLogo} />
      <Entry url="airdrops" name="Airdrops" history={history} Icon={CloudDrizzle} />
      <Entry url="comparison" name="Comparison" history={history} Icon={Minimize2} />
      <Entry url="recent" name="Recent" history={history} Icon={Clock} />
      {categories.map(categoryData => (
        <BasicLink href={`/protocols/${categoryData.name.toLowerCase()}`} key={categoryData.name}>
          <Option
            activeText={
              (history.location.pathname.split("/")[1] === "protocols" &&
                history.location.pathname.split("/")[2] === categoryData.name) ??
              undefined
            }
          >
            <categoryData.icon size={20} style={{ marginRight: ".75rem" }} />
            {categoryData.name}
          </Option>
        </BasicLink>
      ))}
      <Entry url="about" name="About" history={history} Icon={HelpCircle} />
    </AutoColumn>
  )

  return (
    <>
      <Mobile>
        <Wrapper isMobile={true}>
          <MobileWrapper>
            <Title />
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
            <AutoColumn gap="1rem" style={{ paddingBottom: '1rem', marginBottom: 'auto' }} >
              <Title />
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
