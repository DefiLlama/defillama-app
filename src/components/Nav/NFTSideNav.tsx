import * as React from 'react'
import { TrendingUp, HelpCircle, Link as LinkLogo, ShoppingCart, BarChart2 } from 'react-feather'
import { Nav, Entry, MobileOnlyEntry } from './shared'

const NavMenu = () => {
  return (
    <Nav>
      <MobileOnlyEntry url="" name="DeFi" Icon={BarChart2} style={{ marginTop: '20px' }} />
      <Entry url="nfts" name="Overview" Icon={TrendingUp} />
      <Entry url="nfts/chains" name="Chains" Icon={LinkLogo} />
      <Entry url="nfts/marketplaces" name="Marketplaces" Icon={ShoppingCart} />
      <Entry url="nfts/about" name="About" Icon={HelpCircle} />
    </Nav>
  )
}

export default NavMenu
