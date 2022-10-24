import Layout from '~/layout'
import YieldPageLoop from '~/components/YieldsPage/indexLoop'
import { revalidate } from '~/api'
import { getLendBorrowData, calculateLoopAPY } from '~/api/categories/yield'
import pako from 'pako'
import { PanelThicc, StyledAnchor } from '~/components'
import Link from '~/components/Link'
import { useState } from 'react'

export async function getStaticProps() {
	let data = await getLendBorrowData()
	data.props.pools = calculateLoopAPY(data.props.pools, 10)

	const strData = JSON.stringify(data)

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

const methodologyMessage = `
Assume a deposit of $1k into a pool with the following parameters:
- Supply APY: 3% Deposit APY + 6% Reward APY = 9%
- Borrow APY: -5% Borrow APY + 8% Reward APY = 3%
- LTV: 75%

Step 1: deposit $1000
Step 2: borrow $750
Step 3: deposit $750

Total Deposits: $1750 -> 1.75x the original $1k
Total Borrowed: $750

Loop APY: 9% * 1.75 + 3% = 18.75% -> >2x increase compared to the Supply APY

You could keep adding leverage by repeating these steps n-times.
`

export default function YieldBorrow(compressedProps) {
	const b = new Uint8Array(Buffer.from(compressedProps.compressed, 'base64'))
	const data = JSON.parse(pako.inflate(b, { to: 'string' }))
	const [methodologyActivated, setMethodologyActivated] = useState(false)
	return (
		<Layout title={`Lend/Borrow rates - DefiLlama Yield`} defaultSEO>
			<PanelThicc as="p" style={{ whiteSpace: 'pre-line', display: 'block' }}>
				This page displays leveraged lending APY values. The way this works:
				<br />
				1. deposit collateral amount N into pool X
				<br />
				2. using your collateral, borrow from the same pool X using the max LTV
				<br />
				3. deposit the borrowed amount M into pool X
				<Link>
					<StyledAnchor onClick={() => setMethodologyActivated(true)} style={{ display: 'block' }}>
						<b>Example</b>
					</StyledAnchor>
				</Link>
				{methodologyActivated && methodologyMessage}
			</PanelThicc>
			<YieldPageLoop {...data.props} />
		</Layout>
	)
}
