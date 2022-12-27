import NFTDashboardPage from '~/components/NFTDashboardPage'
import { maxAgeForNext } from '~/api'
import {
	getNFTChainChartData,
	getNFTChainsData,
	getNFTCollectionsByChain,
	getNFTStatistics
} from '~/api/categories/nfts'

export async function getStaticProps({
	params: {
		chain: [chainName]
	}
}) {
	const collections = await getNFTCollectionsByChain(chainName)
	const chartData = await getNFTChainChartData(chainName)
	const chainData = await getNFTChainsData()
	const statistics = await getNFTStatistics(chartData)
	const { displayName } = chainData.find((c) => c.chain === chainName) || {
		displayName: ''
	}

	return {
		props: {
			chart: chartData,
			collections,
			statistics,
			chainData,
			displayName
		},
		revalidate: maxAgeForNext([22])
	}
}

// export async function getStaticPaths() {
// 	const chainData = await getNFTChainsData()

// 	const paths = chainData.slice(0, 5).map(({ chain: chainName }) => ({
// 		params: { chain: [chainName] }
// 	}))

// 	return { paths, fallback: 'blocking' }
// }

export async function getStaticPaths() {
	return { paths: [] }
}

export default function Chain({ displayName, ...props }) {
	return <NFTDashboardPage title={`${displayName} Total Volume - DefiLlama`} displayName={displayName} {...props} />
}
