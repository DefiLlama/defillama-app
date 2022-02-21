import React from 'react'
import { TrendingUp, HelpCircle, Link as LinkLogo, ShoppingCart } from 'react-feather'

import { Entry } from './shared'
import { AutoColumn } from '../Column'
import { useRouter } from 'next/router'

const NavMenu = () => {
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  return (
    <AutoColumn gap="1.25rem" style={{ paddingBottom: '1rem', marginBottom: 'auto' }}>
      <Entry url="nfts" name="Overview" history={history} Icon={TrendingUp} />
      <Entry url="nfts/chains" name="Chains" history={history} Icon={LinkLogo} />
      <Entry url="nfts/marketplaces" name="Marketplaces" history={history} Icon={ShoppingCart} />
      <Entry url="nfts/about" name="About" history={history} Icon={HelpCircle} />
    </AutoColumn>
  )
}

export default NavMenu
