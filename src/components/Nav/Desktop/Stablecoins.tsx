import * as React from 'react'
import { TrendingUp, Link as LinkLogo } from 'react-feather'
import { Entry } from './shared'

const NavMenu = () => {
	return (
		<>
			<Entry url="/stablecoins" name="Overview" Icon={TrendingUp} />
			<Entry url="/stablecoins/chains" name="Chains" Icon={LinkLogo} />
		</>
	)
}

export default NavMenu
