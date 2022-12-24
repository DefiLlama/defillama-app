import ChainPage from '~/components/ChainPage'
import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { expiresForNext, maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'

export async function getStaticProps({ params }) {
	const chain = params.chain
	const data = await getChainPageData(chain)
	return {
		...data,
		revalidate: maxAgeForNext([22]),
		expires: expiresForNext([22])
	}
}

export async function getStaticPaths() {
	const res = await fetch(PROTOCOLS_API)

	const paths = (await res.json()).chains.slice(0, 20).map((chain) => ({
		params: { chain }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Chain({ chain, ...props }) {
	return (
		<Layout title={`${chain} TVL - DefiLlama`}>
			<ChainPage {...props} selectedChain={chain} />
		</Layout>
	)
}
