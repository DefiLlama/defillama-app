import Layout from '~/layout'
import YieldsStrategyPage from '~/components/YieldsPage/indexStrategy'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { getAllCGTokensList, revalidate } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import { compressPageProps, decompressPageProps } from '~/utils/compress'

export async function getStaticProps() {
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
		.filter((p) => p.ilRisk === 'no' && p.exposure === 'single' && p.apy > 0 && p.project !== 'babydogeswap')
		.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))

	const compressed = compressPageProps({
		pools: filteredPools,
		allPools: filteredAllPools,
		searchData: searchData?.flat() ?? [],
		...data
	})

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldStrategies({ compressed }) {
	const data = decompressPageProps(compressed)

	return (
		<Layout title={`Yield Strategies - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldsStrategyPage {...data} />
		</Layout>
	)
}
