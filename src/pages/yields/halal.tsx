import { startTransition, useState } from 'react'
import { Announcement } from '~/components/Announcement'
import { YIELD_HALAL_DATASET_API } from '~/constants'
import { disclaimer } from '~/containers/Yields/constants'
import YieldPage from '~/containers/Yields/views/PoolsView'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

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

export const getStaticProps = withPerformanceLogging('yields/halal', async () => {
	const { getYieldHalalPageMetadata } = await import('~/server/datasetCache/runtime/yields')
	const metadata = await getYieldHalalPageMetadata()

	return {
		props: { ...metadata, serverPagination: true, serverApi: YIELD_HALAL_DATASET_API },
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: Halal']

export default function YieldPlots(data) {
	const [methodologyActivated, setMethodologyActivated] = useState(false)

	return (
		<Layout
			title={`Halal DeFi Yield Opportunities - DefiLlama Yield`}
			description="Discover shariah-compliant DeFi yield opportunities from DEXs, yield farming, and liquid staking protocols. Filtered for halal compliance on DefiLlama."
			canonicalUrl={`/yields/halal`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<p className="rounded-md bg-(--cards-bg) p-3 text-center">
				This list aims to a practical tracker for halal defi yields.
				<br />
				Shariah-compliant defi is pretty subjective so our approach is to be practical and list DEXs, yield farming and
				liquid staking, excluding dexs that LP for derivatives.
				<br />
				We're not islamic scholars, this is just meant as a useful tool.
				<br />
				<button
					onClick={() => startTransition(() => setMethodologyActivated((prev) => !prev))}
					className="mx-auto block font-medium text-(--blue) hover:underline"
				>
					Full explanation of methodology
				</button>
				{methodologyActivated ? methodologyMessage : null}
			</p>
			<YieldPage {...data} />
		</Layout>
	)
}
