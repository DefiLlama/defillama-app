import Layout from '~/layout'
import ChainPage from '~/components/ChainPage'
import { revalidate } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'

export async function getStaticProps() {
	const data = await getChainPageData()
	return {
		...data,
		revalidate: revalidate()
	}
}

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainPage {...props} />
		</Layout>
	)
}
