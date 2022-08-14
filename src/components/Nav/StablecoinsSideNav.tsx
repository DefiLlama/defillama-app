import * as React from 'react'
import { Link as LinkLogo, BarChart2, PieChart, Percent } from 'react-feather'
import { Entry, MobileOnlyEntry } from './shared'

const NavMenu = () => {
	return (
		<>
			<MobileOnlyEntry url="/" name="DeFi" Icon={BarChart2} style={{ marginTop: '20px' }} />
			<MobileOnlyEntry url="/yields" name="Yields" Icon={Percent} style={{ marginTop: '20px' }} />

			<Entry url="/stablecoins" name="Overview" Icon={PieChart} />
			<Entry url="/stablecoins/chains" name="Chains" Icon={LinkLogo} />
		</>
	)
}

export default NavMenu
