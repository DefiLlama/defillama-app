import Layout from '~/layout'
import YieldPageOptimizer from '~/components/YieldsPage/indexOptimizer'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { getAllCGTokensList, revalidate } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import { compressPageProps, decompressPageProps } from '~/utils/compress'

export async function getStaticProps() {
	const {
		props: { pools, ...data }
	} = await getLendBorrowData()

	const searchData = await getAllCGTokensList()

	const compressed = compressPageProps({
		// lend & borrow from query are uppercase only. symbols in pools are mixed case though -> without
		// setting to uppercase, we only show subset of available pools when applying `findOptimzerPools`
		pools: pools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() })),
		yieldsList: [],
		searchData,
		...data
	})

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldBorrow({ compressed }) {
	const data = decompressPageProps(compressed)

	return (
		<Layout title={`Lend/Borrow optimizer - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPageOptimizer {...data} />
		</Layout>
	)
}
