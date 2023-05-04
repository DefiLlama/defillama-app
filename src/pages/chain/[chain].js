import ChainPage from '~/components/ChainPage'
import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'
import { getChainsPageData, getOverviewItemPageData } from '~/api/categories/adaptors'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('aggregators/[item]', async ({ params }) => {
	const chain = params.chain
	const data = await getChainPageData(chain)

	const volumeData = await getChainsPageData('dexs')
	const feesData = await getOverviewItemPageData('fees', chain)
	const usersData = await fetch(`https://api.llama.fi/userData/users/chain$${chain}`).then((r) => r.json())

	return {
		props: {
			...data.props,
			volumeData,
			feesData,
			usersData
		},
		revalidate: maxAgeForNext([22])
	}
})

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
