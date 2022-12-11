import Layout from '~/layout'
import ChainPage from '~/components/ChainPage'
import { addMaxAgeHeaderForNext, revalidate } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'

export const getServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const data = await getChainPageData()
	return {
		...data
	}
}

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainPage {...props} />
		</Layout>
	)
}
