import Layout from '~/layout'
import ChainPage from '~/components/ChainPage'
import { expiresForNext, maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'

export async function getStaticProps() {
	const data = await getChainPageData()
	return {
		...data,
		revalidate: maxAgeForNext([22]),
		expires: expiresForNext([22])
	}
}

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainPage {...props} />
		</Layout>
	)
}
