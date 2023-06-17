import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'

import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { ChainContainer } from '~/containers/ChainContainer'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	const [data, usersData, txsData] = await Promise.all([
		getChainPageData(chain),
		fetch(`https://api.llama.fi/userData/users/chain$${chain}`).then((r) => r.json()),
		fetch(`https://api.llama.fi/userData/txs/chain$${chain}`).then((r) => r.json())
	])

	return {
		props: {
			...data.props,
			usersData,
			txsData,
			totalFundingAmount: null
		},
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const res = await fetch(PROTOCOLS_API).then((res) => res.json())

	const paths = res.chains.map((chain) => ({
		params: { chain }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Chain({ chain, ...props }) {
	return (
		<Layout title={`${chain} TVL - DefiLlama`}>
			<ChainContainer {...props} selectedChain={chain} />
		</Layout>
	)
}
