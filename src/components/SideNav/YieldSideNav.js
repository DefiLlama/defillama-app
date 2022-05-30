import React from 'react'
import { TrendingUp, BarChart2, PlusCircle, List } from 'react-feather'
import { Nav, Entry, MobileOnlyEntry } from './shared'
import { useRouter } from 'next/router'

const NavMenu = () => {
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  return (
    <Nav>
      <MobileOnlyEntry url="" name="DeFi" history={history} Icon={BarChart2} style={{ marginTop: '20px' }} />

      <Entry url="yields" name="Overview" history={history} Icon={TrendingUp} />
      <Entry url="yields/projects" name="Projects" history={history} Icon={List} />
      <Entry
        url="https://github.com/DefiLlama/yield-server#readme"
        name="List your protocol"
        history={history}
        Icon={PlusCircle}
        external
      />
    </Nav>
  )
}

export default NavMenu
