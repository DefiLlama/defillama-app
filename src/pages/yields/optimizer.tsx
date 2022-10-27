import Layout from '~/layout'
import YieldPageOptimizer from '~/components/YieldsPage/indexOptimizer'
import { getCGMarketsDataURLs, revalidate } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import pako from 'pako'
import { arrayFetcher } from '~/utils/useSWR'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'

export async function getStaticProps() {
	const {
		props: { pools, ...data }
	} = await getLendBorrowData()

	const yieldsList = await arrayFetcher(getCGMarketsDataURLs())

	const strData = JSON.stringify({
		props: {
			// lend & borrow from query are uppercase only. symbols in pools are mixed case though -> without
			// setting to uppercase, we only show subset of available pools when applying `findOptimzerPools`
			pools: pools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() })),
			yieldsList: yieldsList?.flat(),
			...data
		}
	})

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldBorrow(compressedProps) {
	const b = new Uint8Array(Buffer.from(compressedProps.compressed, 'base64'))
	const data = JSON.parse(pako.inflate(b, { to: 'string' }))
	return (
		<Layout title={`Lend/Borrow optimizer - DefiLlama Yield`} defaultSEO>
			<Announcement notCancellable>{disclaimer}</Announcement>
			<YieldPageOptimizer {...data.props} />
		</Layout>
	)
}
