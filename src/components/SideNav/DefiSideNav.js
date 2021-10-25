import React, { useState } from "react"
import { DesktopWrapper, entry, MobileWrapper, Option, Wrapper, footer, ButtonWrapper } from "./shared"
import { AutoColumn } from "../Column"
import Title from "../Title"
import { BasicLink } from "../Link"
import { useMedia } from "react-use"
import { withRouter } from "react-router-dom"
import { TrendingUp, Disc, HelpCircle, Link as LinkLogo, CloudDrizzle, Minimize2, Clock } from "react-feather"
import { useDarkModeManager } from "../../contexts/LocalStorage"
import categories from "../../constants/categories"
import SettingsMenuButton from "../SettingsModal"
import NavMenuButton from "./NavMenuButton"

function SideNav({ history }) {
  const below1080 = useMedia("(max-width: 1080px)")
  const below1180 = useMedia("(max-width: 1080px)")

  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false)
  const [isDark, toggleDarkMode] = useDarkModeManager()

  const NavMenu = () => (
    <AutoColumn gap="1.25rem" style={{ marginTop: "1rem" }}>
      {entry("", "Overview", history, { icon: TrendingUp })}
      <BasicLink to="/protocols">
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
      {entry("chains", "Chains", history, { icon: LinkLogo })}
      {entry("airdrops", "Airdrops", history, { icon: CloudDrizzle })}
      {entry("comparison", "Comparison", history, { icon: Minimize2 })}
      {entry("recent", "Recent", history, { icon: Clock })}
      {categories.map(categoryData => (
        <BasicLink to={`/protocols/${categoryData.name.toLowerCase()}`} key={categoryData.name}>
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
      {entry("about", "About", history, { icon: HelpCircle })}
    </AutoColumn>
  )

  if (below1080) {
    return (
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
    )
  }

  return (
    <Wrapper isMobile={false}>
      <DesktopWrapper>
        <AutoColumn gap="1rem" style={{ marginLeft: ".75rem", marginTop: "1.5rem" }}>
          <Title />
          <NavMenu />
        </AutoColumn>
        {footer(below1180, isDark, toggleDarkMode)}
      </DesktopWrapper>
    </Wrapper>
  )
}

export default withRouter(SideNav)
