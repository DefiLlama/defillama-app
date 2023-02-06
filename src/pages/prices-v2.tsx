import Layout from '~/layout'
import ReturnsPage from '~/components/YieldsPage/indexReturns'
import { maxAgeForNext } from '~/api'
import { getReturnData } from '~/api/categories/protocols'
import { useRouter } from 'next/router'

export async function getStaticProps() {
	const data = await getReturnData()

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
}

export default function PriceReturn(data) {
	const { query } = useRouter()

	const priceData = query.coin ? data.priceData.coins[`coingecko:${query.coin}`] : {}
	const prices = priceData.prices ? priceData.prices : []
	const symbol = priceData.symbol ? priceData.symbol : ''

	return (
		<Layout title={`Return Calculator  - DefiLlama Yield`} defaultSEO>
			<ReturnsPage symbol={symbol} prices={prices} key={`${prices[0]?.price} ${prices.slice(-1)[0]?.price}`} />
		</Layout>
	)
}
