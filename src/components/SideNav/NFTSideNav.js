import React from 'react'
import { TrendingUp, HelpCircle, Link as LinkLogo, ShoppingCart, BarChart2 } from 'react-feather'

import { Entry } from './shared'
import { AutoColumn } from '../Column'
import { useRouter } from 'next/router'

const NavMenu = ({ isMobile }) => {
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  return (
    <AutoColumn gap="1.25rem" style={{ paddingBottom: '1rem', marginBottom: 'auto' }}>
      {isMobile && <Entry url="" name="DeFi" history={history} Icon={BarChart2} style={{ marginTop: '20px' }} />}
      <Entry url="nfts" name="Overview" history={history} Icon={TrendingUp} />
      <Entry url="nfts/chains" name="Chains" history={history} Icon={LinkLogo} />
      <Entry url="nfts/marketplaces" name="Marketplaces" history={history} Icon={ShoppingCart} />
      <Entry url="nfts/about" name="About" history={history} Icon={HelpCircle} />
    </AutoColumn>
  )
}

export default NavMenu
