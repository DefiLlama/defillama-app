import React from 'react'
import { TrendingUp, HelpCircle, Link as LinkLogo, ShoppingCart, BarChart2 } from 'react-feather'
import { Nav, Entry, MobileOnlyEntry } from './shared'
import { useRouter } from 'next/router'

const NavMenu = () => {
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  return (
    <Nav>
      <MobileOnlyEntry url="" name="DeFi" history={history} Icon={BarChart2} style={{ marginTop: '20px' }} />
      <Entry url="nfts" name="Overview" history={history} Icon={TrendingUp} />
      <Entry url="nfts/chains" name="Chains" history={history} Icon={LinkLogo} />
      <Entry url="nfts/marketplaces" name="Marketplaces" history={history} Icon={ShoppingCart} />
      <Entry url="nfts/about" name="About" history={history} Icon={HelpCircle} />
    </Nav>
  )
}

export default NavMenu
