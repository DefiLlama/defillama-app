import * as React from 'react'
import { TrendingUp, BarChart2, PlusCircle, List, Bookmark } from 'react-feather'
import { Entry, MobileOnlyEntry, Footer } from './shared'

const NavMenu = () => {
	return (
		<>
			<MobileOnlyEntry url="/" name="DeFi" Icon={BarChart2} style={{ marginTop: '20px' }} />

			<Entry url="/yields" name="Overview" Icon={TrendingUp} />
			<Entry url="/yields/projects" name="Projects" Icon={List} />
			<Entry url="/yields/watchlist" name="Watchlist" Icon={Bookmark} />
			<Entry url="https://github.com/DefiLlama/yield-server#readme" name="List your protocol" Icon={PlusCircle} />

			<Footer app="yields" />
		</>
	)
}

export default NavMenu
