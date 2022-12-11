import ChainPage from '~/components/ChainPage'
import Layout from '~/layout'
import { addMaxAgeHeaderForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'

export const getServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const chain = params.chain
	const data = await getChainPageData(chain)
	return { ...data }
}

export default function Chain({ chain, ...props }) {
	return (
		<Layout title={`${chain} TVL - DefiLlama`}>
			<ChainPage {...props} selectedChain={chain} />
		</Layout>
	)
}
