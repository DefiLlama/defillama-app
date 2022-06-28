import Layout from '~/layout'
import ChainPage from '~/components/ChainPage'
import { getChainPageData, revalidate } from '~/utils/dataApi'

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
