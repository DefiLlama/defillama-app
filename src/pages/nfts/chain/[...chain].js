import NFTDashboardPage from '~/components/NFTDashboardPage'
import { addMaxAgeHeaderForNext } from '~/api'
import {
	getNFTChainChartData,
	getNFTChainsData,
	getNFTCollectionsByChain,
	getNFTStatistics
} from '~/api/categories/nfts'

export const getServerSideProps = async ({
	params: {
		chain: [chainName]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
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
		}
	}
}

export default function Chain({ displayName, ...props }) {
	return <NFTDashboardPage title={`${displayName} Total Volume - DefiLlama`} displayName={displayName} {...props} />
}
