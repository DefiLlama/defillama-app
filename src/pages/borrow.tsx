import Layout from '~/layout'
import YieldPageOptimizer from '~/components/YieldsPage/indexOptimizer'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { addMaxAgeHeaderForNext, getAllCGTokensList } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import { compressPageProps, decompressPageProps } from '~/utils/compress'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [23], 3600)
	const {
		props: { pools, ...data }
	} = await getLendBorrowData()

	let searchData = await getAllCGTokensList()
	// filter searchData array to include only tokens for which we have lending data
	const uniqueSymbols = [...new Set(pools.map((p) => p.symbol.split(' ')[0]?.toLowerCase()))]
	searchData = searchData?.flat().filter((s) => uniqueSymbols.includes(s.symbol?.toLowerCase())) ?? []

	const compressed = compressPageProps({
		// lend & borrow from query are uppercase only. symbols in pools are mixed case though -> without
		// setting to uppercase, we only show subset of available pools when applying `findOptimzerPools`
		pools: pools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() })),
		yieldsList: [],
		searchData,
		...data
	})

	return {
		props: { compressed }
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
