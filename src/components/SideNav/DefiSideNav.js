import React from 'react'
import { useRouter } from 'next/router'
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

import { Entry } from './shared'
import { AutoColumn } from '../Column'

const NavMenu = ({ isMobile }) => {
  const router = useRouter()
  const history = { location: { pathname: router.pathname } }

  return (
    <AutoColumn gap="1.25rem">
      {isMobile && <Entry url="yields" name="Yields" history={history} Icon={Percent} style={{ marginTop: '20px' }} />}
      <Entry url="" name="Overview" history={history} Icon={TrendingUp} />
      <Entry url="chains" name="Chains" history={history} Icon={LinkLogo} />
      <Entry
        url="https://wiki.defillama.com/wiki/Main_Page"
        name="Wiki"
        history={history}
        Icon={Book}
        external
        newTag
      />
      <Entry url="airdrops" name="Airdrops" history={history} Icon={CloudDrizzle} />
      <Entry url="oracles" name="Oracles" history={history} Icon={Shield} />
      <Entry url="forks" name="Forks" history={history} Icon={Share2} />
      <Entry url="peggedassets/stablecoins" name="Stablecoins" history={history} Icon={Pocket} newTag />
      {!isMobile && <Entry url="portfolio" name="Portfolio" history={history} Icon={Bookmark} />}
      <Entry url="top-protocols" name="Top Protocols" history={history} Icon={Map} />
      <Entry url="categories" name="Categories" history={history} Icon={RefreshCcw} />
      <Entry url="recent" name="Recent" history={history} Icon={Clock} />
      <Entry url="comparison" name="Comparison" history={history} Icon={Minimize2} />
      <Entry url="languages" name="Languages" history={history} Icon={Code} />
      <Entry url="https://chainlist.org/" name="Chainlist" history={history} Icon={List} external />
      <Entry url="about" name="About" history={history} Icon={HelpCircle} />
    </AutoColumn>
  )
}

export default NavMenu
