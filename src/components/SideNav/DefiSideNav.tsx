import React from 'react'
import {
  TrendingUp,
  HelpCircle,
  Link as LinkLogo,
  CloudDrizzle,
  Minimize2,
  Clock,
  Bookmark,
  RefreshCcw,
  Code,
  Shield,
  Share2,
  Map,
  List,
  Percent,
  Book,
  Pocket,
} from 'react-feather'
import { Nav, Entry, Footer, MobileOnlyEntry } from './shared'

const NavMenu = () => {
  return (
    <Nav>
      <MobileOnlyEntry url="/yields" name="Yields" Icon={Percent} style={{ marginTop: '20px' }} />

      <Entry url="/" name="Overview" Icon={TrendingUp} />
      <Entry url="/chains" name="Chains" Icon={LinkLogo} />
      <Entry url="https://wiki.defillama.com/wiki/Main_Page" name="Wiki" Icon={Book} newTag />
      <Entry url="/airdrops" name="Airdrops" Icon={CloudDrizzle} />
      <Entry url="/oracles" name="Oracles" Icon={Shield} />
      <Entry url="/forks" name="Forks" Icon={Share2} />
      <Entry url="/peggedassets/stablecoins" name="Stablecoins" Icon={Pocket} newTag />
      <Entry url="/watchlist" name="Watchlist" Icon={Bookmark} />
      <Entry url="/top-protocols" name="Top Protocols" Icon={Map} />
      <Entry url="/categories" name="Categories" Icon={RefreshCcw} />
      <Entry url="/recent" name="Recent" Icon={Clock} />
      <Entry url="/comparison" name="Comparison" Icon={Minimize2} />
      <Entry url="/languages" name="Languages" Icon={Code} />
      <Entry url="https://chainlist.org/" name="Chainlist" Icon={List} />
      <Entry url="/about" name="About" Icon={HelpCircle} />

      <Footer />
    </Nav>
  )
}

export default NavMenu
