import ChainPage from '~/components/ChainPage'
import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'
import { getChainPageData as getChainVolume } from '~/api/categories/adaptors'
import { getChainsPageData, getOverviewItemPageData } from '~/api/categories/adaptors'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain
	const [data, volumeData, chainVolumeData, feesData, usersData] = await Promise.all([
		getChainPageData(chain),
		getChainsPageData('dexs'),
		getChainVolume('dexs', chain).catch(() => ({})),
		getOverviewItemPageData('fees', chain),
		fetch(`https://api.llama.fi/userData/users/chain$${chain}`).then((r) => r.json())
	])

	return {
		props: {
			...data.props,
			volumeData,
			chainVolumeData,
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
