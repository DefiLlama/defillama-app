import React from 'react'
import { TrendingUp, BarChart2, PlusCircle, List } from 'react-feather'
import { Nav, Entry, MobileOnlyEntry, Footer } from './shared'

const NavMenu = () => {
  return (
    <Nav>
      <MobileOnlyEntry url="/" name="DeFi" Icon={BarChart2} style={{ marginTop: '20px' }} />

      <Entry url="/yields" name="Overview" Icon={TrendingUp} />
      <Entry url="/yields/projects" name="Projects" Icon={List} />
      <Entry url="https://github.com/DefiLlama/yield-server#readme" name="List your protocol" Icon={PlusCircle} />

      <Footer app="yields" />
    </Nav>
  )
}

export default NavMenu
