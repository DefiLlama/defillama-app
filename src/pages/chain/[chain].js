import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'

import { getChainPageData as getChainVolume } from '~/api/categories/adaptors'
import { getBridgeOverviewPageData } from '~/api/categories/bridges'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'
import { getChainsPageData, getOverviewItemPageData, getChainPageData as getFeesData } from '~/api/categories/adaptors'

import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { ChainContainer } from '~/containers/ChainContainer'

const fetch = fetchWithErrorLogging

const sum = (obj) => {
	return Object.values(obj).reduce((acc, curr) => (typeof curr === 'number' ? (acc += curr) : acc), 0)
}

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	const [data, volumeData, chainVolumeData, feesData, usersData, txsData, chainFeesData, bridgeData, stablecoinsData] =
		await Promise.all([
			getChainPageData(chain),
			chain === 'All' ? getChainsPageData('dexs') : null,
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

	// TODO remove duplicate in index.js
	const chainProtocolsVolumes = []
	if (chainVolumeData) {
		chainVolumeData?.protocols?.forEach((prototcol) =>
			chainProtocolsVolumes.push(prototcol, ...(prototcol?.subRows || []))
		)
	}

	const chainProtocolsFees = []

	if (chainFeesData) {
		chainFeesData?.protocols?.forEach((prototcol) => chainProtocolsFees.push(prototcol, ...(prototcol?.subRows || [])))
	}

	const bridgeChartData = bridgeData
		? bridgeData?.chainVolumeData?.map((volume) => [
				volume?.date ?? null,
				volume?.Deposits ?? null,
				volume.Withdrawals ?? null
		  ])
		: null

	const volumeChart =
		chain === 'All' || volumeData?.totalDataChart[0]?.[0][chain]
			? volumeData?.totalDataChart?.[0].map((val) => [val.date, (chain === 'All' ? sum(val) : val[chain]) ?? null])
			: null

	const feesChart = feesData?.totalDataChart?.[0].length
		? feesData?.totalDataChart?.[0]?.map((val) => [val.date, val.Fees ?? null, val.Revenue ?? null])
		: null

	const raisesData = null
	const raisesChart = null

	return {
		props: {
			...data.props,
			raisesData,
			stablecoinsData,
			chainProtocolsVolumes,
			chainProtocolsFees,
			bridgeChartData,
			volumeChart,
			feesChart,
			raisesChart,
			usersData,
			txsData
		},
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const res = await fetch(PROTOCOLS_API).then((res) => res.json())

	const paths = res.chains.slice(0, 20).map((chain) => ({
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
