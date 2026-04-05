import { startTransition, useState } from 'react'
import { fetchCoinGeckoTokensListFromDataset } from '~/api/coingecko'
import { Announcement } from '~/components/Announcement'
import YieldPageLoop from '~/containers/Yields/indexLoop'
import { calculateLoopAPY, getLendBorrowData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/loop', async () => {
	let {
		props: { ...data }
	} = await getLendBorrowData()

	const cgTokens = await fetchCoinGeckoTokensListFromDataset()

	const tokens = []

	for (const token of cgTokens) {
		if (token.symbol) {
			tokens.push({
				name: token.name,
				symbol: token.symbol.toUpperCase(),
				logo: token.image2 || null,
				fallbackLogo: token.image || null
			})
		}
	}

	return {
		props: {
			...data,
			pools: calculateLoopAPY(data.pools, 10, null),
			tokens
		},
		revalidate: maxAgeForNext([23])
	}
})

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

Loop APY: 9% * 1.75 + 3% * 0.75 = 18% -> 2x increase compared to the Supply APY

You could keep adding leverage by repeating these steps n-times.
`

const pageName = ['Yields: Leveraged Lending']

export default function YieldBorrow(data) {
	const [methodologyActivated, setMethodologyActivated] = useState(false)

	return (
		<Layout
			title={`Lend/Borrow rates - DefiLlama Yield`}
			description="Compare leveraged lending and borrowing rates across DeFi protocols. Find the best lend/borrow rate spreads for looping strategies."
			canonicalUrl={`/yields/loop`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>

			<p className="rounded-md bg-(--cards-bg) p-3 text-center whitespace-pre-line">
				This page displays leveraged lending APY values. The way this works:
				<br />
				1. deposit collateral amount N into pool X
				<br />
				2. using your collateral, borrow from the same pool X using the max LTV
				<br />
				3. deposit the borrowed amount M into pool X
				<button
					onClick={() => startTransition(() => setMethodologyActivated((prev) => !prev))}
					className="mx-auto block font-medium text-(--blue) hover:underline"
				>
					Example
				</button>
				{methodologyActivated ? methodologyMessage : null}
			</p>
			<YieldPageLoop {...data} />
		</Layout>
	)
}
