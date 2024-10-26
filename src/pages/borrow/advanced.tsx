import Layout from '~/layout'
import YieldPageOptimizer from '~/components/YieldsPage/indexOptimizer'
import { Announcement } from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
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
			// setting to uppercase, we only show subset of available pools when applying `findOptimzerPools`
			pools: pools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() })),
			yieldsList: [],
			searchData,
			...data
		},
		revalidate: maxAgeForNext([23])
	}
})

export default function YieldBorrow(data) {
	return (
		<Layout title={`Lend/Borrow optimizer - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPageOptimizer {...data} />
		</Layout>
	)
}
