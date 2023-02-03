import Layout from '~/layout'
import ReturnsPage from '~/components/YieldsPage/indexReturns'
import { maxAgeForNext } from '~/api'
import { getReturnData } from '~/api/categories/protocols'

export async function getStaticProps() {
	const data = await getReturnData()

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
}

export default function PriceReturn(data) {
	return (
		<Layout title={`Return Calculator  - DefiLlama Yield`} defaultSEO>
			<ReturnsPage {...data} />
		</Layout>
	)
}
