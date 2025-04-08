import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { getChainPageData } from '~/api/categories/chains'

import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { ChainContainer } from '~/containers/ChainContainer'
import { slug } from '~/utils'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	const data = await getChainPageData(chain)

	return data
})

export async function getStaticPaths() {
	const res = await fetch(PROTOCOLS_API).then((res) => res.json())

	const paths = res.chains.map((chain) => ({
		params: { chain: slug(chain) }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Chain({ chain, ...props }) {
	return (
		<Layout title={`${chain} - DefiLlama`}>
			<ChainContainer {...props} selectedChain={chain} />
		</Layout>
	)
}
