import * as React from 'react'
import { TrendingUp, PlusCircle, List, Bookmark, PieChart } from 'react-feather'
import { Entry, Footer } from './shared'

const NavMenu = () => {
	return (
		<>
			<Entry url="/yields/overview" name="Overview" Icon={PieChart} />
			<Entry url="/yields" name="Pools" Icon={TrendingUp} />
			<Entry url="/yields/projects" name="Projects" Icon={List} />
			<Entry url="/yields/watchlist" name="Watchlist" Icon={Bookmark} />
			<Entry url="https://github.com/DefiLlama/yield-server#readme" name="List your protocol" Icon={PlusCircle} />

			<Footer app="yields" />
		</>
	)
}

export default NavMenu
