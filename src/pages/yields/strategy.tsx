import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import YieldsStrategyPage from '~/containers/Yields/indexStrategy'
import { getLendBorrowData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/strategy', async () => {
	const {
		props: { pools, allPools, ...data }
	} = await getLendBorrowData()

	const searchData = await getAllCGTokensList()

	// restrict bororw and farming part (min apy's, noIL, single exposure only)
	// and uppercase symbols (lend and borrow strings from router are upper case only)

	// for cdp pools we filter only on borrow apy because supply apy is usually 0
	const filteredPools = pools
		.filter((p) => (p.category === 'CDP' ? p.apyBorrow !== 0 : p.apy > 0.01 && p.apyBorrow !== 0))
		.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))

	// ~1500pools
	// and uppercase symbols (lend and borrow strings from router are upper case only)
	const filteredAllPools = allPools
		.filter(
			(p) =>
				p.ilRisk === 'no' &&
				p.exposure === 'single' &&
				p.apy > 0 &&
				p.project !== 'babydogeswap' &&
				p.project !== 'cbridge'
		)
		.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))

	return {
		props: {
			pools: filteredPools,
			allPools: filteredAllPools,
			searchData: searchData?.flat() ?? [],
			...data
		},
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: Delta Neutral Strategies']

export default function YieldStrategies(data) {
	return (
		<Layout
			title={`Yield Delta Neutral Strategies - DefiLlama Yield`}
			description={`Find strategies to neutralize delta exposure and maximize yield. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`yield delta neutral strategies, defi yield delta neutral strategies, delta neutral strategies, defi delta neutral strategies`}
			canonicalUrl={`/yields/strategy`}
			pageName={pageName}
		>
			<Announcement>{disclaimer}</Announcement>
			<YieldsStrategyPage {...data} />
		</Layout>
	)
}
