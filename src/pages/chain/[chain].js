import ChainPage from '~/components/ChainPage'
import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'

import { getChainPageData as getChainVolume } from '~/api/categories/adaptors'
import { getBridgeOverviewPageData } from '~/api/categories/bridges'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'
import { getChainsPageData, getOverviewItemPageData, getChainPageData as getFeesData } from '~/api/categories/adaptors'

import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	const [data, volumeData, chainVolumeData, feesData, usersData, txsData, chainFeesData, bridgeData, stablecoinsData] =
		await Promise.all([
			getChainPageData(chain),
			getChainsPageData('dexs'),
			getChainVolume('dexs', chain)
				.catch(() => ({}))
				.then((r) => (r.total24h === undefined ? {} : r)),
			getOverviewItemPageData('fees', chain).catch(() => null),
			fetch(`https://api.llama.fi/userData/users/chain$${chain}`).then((r) => r.json()),
			fetch(`https://api.llama.fi/userData/txs/chain$${chain}`).then((r) => r.json()),
			getFeesData('fees', chain)
				.catch(() => null)
				.then((r) => (r.total24h === undefined ? {} : r)),
			getBridgeOverviewPageData(chain).catch(() => null),
			getPeggedOverviewPageData(chain).catch(() => null)
		])

	return {
		props: {
			...data.props,
			volumeData: volumeData || null,
			chainVolumeData: chainVolumeData || null,
			feesData: feesData || null,
			usersData: usersData || null,
			chainFeesData: chainFeesData || null,
			txsData: txsData || null,
			bridgeData: bridgeData || null,
			stablecoinsData: stablecoinsData || null
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
