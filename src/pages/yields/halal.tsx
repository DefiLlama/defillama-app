const methodologyMessage = `
Opinions on shariah-compliant defi are extremely diverse, going from everything related to crypto is haram to the opposite.

Right now the status quo seems to be that everyone must review all protocols and then decide for themselves, but that leads to lots of wasted effort.
In order to help, we built this dashboard that follows a simple set of guidelines to filter halal protocols.
We are not islamic scholars so you shouldn't assume it's perfect, it's just a small tool that saves you time from having to learn about >100 protocols to evaluate them.

The basic guidelines we used are:
- Lending protocols that have time-based loans are removed
- Yield aggregators that may deposit money into lending protocols are removed too
- DEXs that provide liquidity for derivatives are removed (reasoning is that providing loans to a gambler is haram).
- Option selling protocols are removed following the same logic.

In case of uncertainty we erred on the side of caution and removed the following protocols:
- algo-stables
- lending with fixed timeframes and interests
- cdp
- instadapp which offers some leveraged vaults
- tokemak that offers DAO2DAO lending

This leaves us with:
- Simple swap DEXs
- Yield farming
- Liquid staking
- Bridge LPs
`

/*
Blacklist

Removed because of 
- lending: aave, justlend, compound, alpaca finance, venus, euler, solend, tectonic, iron bank, benqi, morpho, goldfinch, radiant, geist, moonwell, dForce, TrueFi
- "lending money to gamblers": GMX
- yield aggregator that can deposit money in lending protocols: yearn, beefy, badger dao, idle finance, yield yak, autofarm, vesper
- algo-stables: frax, origin dollar
- lending with fixed timeframes and interests (may be complaint but not sure): notional
- cdp (not sure): angle, Yeti Finance, abracadabra
- option selling: Francium, friktion, StakeDAO
- kind of lending: tokemak
- leverage: Instadapp
*/

const whitelist = [
	'Curve',
	'Lido',
	'Convex Finance',
	'Uniswap',
	'Arrakis Finance',
	'PancakeSwap',
	'Osmosis',
	'Balancer',
	'VVS Finance',
	'Stargate',
	'SushiSwap',
	'DefiChain DEX',
	'Aura',
	'Biswap',
	'Quickswap',
	'Maiar Exchange',
	'Ankr',
	'Raydium',
	'Wombat Exchange',
	'Trader Joe',
	'Atrix',
	'Platypus Finance',
	'Vector Finance',
	'LooksRare',
	'MDEX',
	'cBridge',
	'Bancor V3',
	'Ellipsis Finance',
	'Concentrator',
	'Velodrome',
	'Beethoven X',
	'Across',
	'SpookySwap',
	'Meshswap',
	'Kokonut Swap',
	'Flamingo Finance',
	'Pangolin',
	'Dot Dot Finance',
	'Loopring',
	'Trisolaris',
	'ApeSwap AMM',
	'MM Finance Polygon'
	// stopped at protocols with <20M TVL
]

import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'
import pako from 'pako'
import { PanelThicc, StyledAnchor } from '~/components'
import Link from '~/components/Link'
import { useState } from 'react'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'

export async function getStaticProps() {
	let data = await getYieldPageData()
	data.props.pools = data.props.pools.filter((p) => whitelist.includes(p.projectName))
	data.props.projectList = data.props.projectList.filter((p) => whitelist.includes(p.name))
	data.props.categoryList = Array.from(
		data.props.pools.reduce((set, pool) => {
			set.add(pool.category)
			return set
		}, new Set())
	)
	const strData = JSON.stringify(data)

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldPlots(compressedProps) {
	const b = new Uint8Array(Buffer.from(compressedProps.compressed, 'base64'))
	const data = JSON.parse(pako.inflate(b, { to: 'string' }))
	const [methodologyActivated, setMethodologyActivated] = useState(false)
	return (
		<Layout title={`Halal - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<PanelThicc as="p" style={{ whiteSpace: 'pre-line', display: 'block' }}>
				This list aims to a practical tracker for halal defi yields.
				<br />
				Shariah-compliant defi is pretty subjective so our approach is to be practical and list DEXs, yield farming and
				liquid staking, excluding dexs that LP for derivatives.
				<br />
				We're not islamic scholars, this is just meant as a useful tool.
				<br />
				<Link>
					<StyledAnchor onClick={() => setMethodologyActivated(true)} style={{ display: 'block' }}>
						<b>Full explanation of methodology</b>
					</StyledAnchor>
				</Link>
				{methodologyActivated && methodologyMessage}
			</PanelThicc>
			<YieldPage {...data.props} />
		</Layout>
	)
}
