import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'
import { getBridgeOverviewPageData } from '~/api/categories/bridges'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'
import { getChainPageData as getFeesData } from '~/api/categories/adaptors'

import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { ChainContainer } from '~/containers/ChainContainer'
import { buildPeggedChartData } from '~/utils/stablecoins'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	const [data, usersData, txsData, bridgeData, stablecoinsData] = await Promise.all([
		getChainPageData(chain),
		fetch(`https://api.llama.fi/userData/users/chain$${chain}`).then((r) => r.json()),
		fetch(`https://api.llama.fi/userData/txs/chain$${chain}`).then((r) => r.json()),
		getBridgeOverviewPageData(chain).catch(() => null),
		getPeggedOverviewPageData(chain).catch(() => null)
	])

	const bridgeChartData = bridgeData
		? bridgeData?.chainVolumeData?.map((volume) => [
				volume?.date ?? null,
				volume?.Deposits ?? null,
				volume.Withdrawals ?? null
		  ])
		: null

	const { peggedAreaTotalData } = buildPeggedChartData(
		stablecoinsData?.chartDataByPeggedAsset,
		stablecoinsData?.peggedAssetNames,
		Object.values(stablecoinsData?.peggedNameToChartDataIndex || {}),
		'mcap',
		stablecoinsData?.chainTVLData,
		chain
	)

	return {
		props: {
			...data.props,
			stablecoinsChartData: peggedAreaTotalData,
			bridgeChartData,
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
