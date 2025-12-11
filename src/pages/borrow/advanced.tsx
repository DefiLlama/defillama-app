import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import { BorrowAggregatorAdvanced } from '~/containers/Yields/indexOptimizer'
import { UNBOUNDED_DEBT_CEILING_PROJECTS } from '~/containers/Yields/queries'
import { getLendBorrowData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('borrow', async () => {
	const {
		props: { pools, ...data }
	} = await getLendBorrowData()

	let cgList = await getAllCGTokensList()
	const cgPositions = cgList.reduce((acc, e, i) => ({ ...acc, [e.symbol]: i }), {} as any)
	const searchData = data.symbols
		.sort((a, b) => cgPositions[a] - cgPositions[b])
		.map((sRaw) => {
			const s = sRaw.replaceAll(/\(.*\)/g, '').trim()
			return {
				name: s,
				symbol: s,
				image: '',
				image2: ''
			}
		})

	return {
		props: {
			// lend & borrow from query are uppercase only. symbols in pools are mixed case though -> without
			// setting to uppercase, we only show subset of available pools when applying `findOptimizerPools`
			pools: pools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() })),
			yieldsList: [],
			searchData,
			unboundedDebtCeilingProjects: [...UNBOUNDED_DEBT_CEILING_PROJECTS],
			...data
		},
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Borrow Aggregator: Advanced']

export default function YieldBorrow(data) {
	return (
		<Layout
			title={`Lend/Borrow optimizer - DefiLlama Yield`}
			description={`Lend/Borrow optimizer on DefiLlama. Advanced view of optimal lending routes by collateral to borrow assets. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`lend/borrow optimizer, defi lend/borrow optimizer, advanced view of optimal lending routes by collateral to borrow assets`}
			canonicalUrl={`/borrow/advanced`}
			pageName={pageName}
		>
			<Announcement>{disclaimer}</Announcement>
			<BorrowAggregatorAdvanced {...data} />
		</Layout>
	)
}
