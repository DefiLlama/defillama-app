import React from 'react'
import { TrendingUp, BarChart2 } from 'react-feather'

import { Entry } from './shared'
import { AutoColumn } from '../Column'
import { useRouter } from 'next/router'

const NavMenu = ({ isMobile }) => {
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  return (
    <AutoColumn gap="1.25rem" style={{ paddingBottom: '1rem', marginBottom: 'auto' }}>
      {isMobile && <Entry url="" name="DeFi" history={history} Icon={BarChart2} style={{ marginTop: '20px' }} />}
      <Entry url="yields" name="Overview" history={history} Icon={TrendingUp} />
    </AutoColumn>
  )
}

export default NavMenu
