import NFTDashboardPage from '~/components/NFTDashboardPage'
import { addMaxAgeHeaderForNext } from '~/api'
import {
	getNFTMarketplaceChartData,
	getNFTMarketplacesData,
	getNFTCollectionsByMarketplace,
	getNFTStatistics
} from '~/api/categories/nfts'

export async function getServerSideProps({
	params: {
		marketplace: [marketplaceName]
	},
	res
}) {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const collections = await getNFTCollectionsByMarketplace(marketplaceName)
	const chartData = await getNFTMarketplaceChartData(marketplaceName)
	const marketplaceData = await getNFTMarketplacesData()
	const statistics = await getNFTStatistics(chartData)
	const { displayName } = marketplaceData.find((c) => c.marketplace === marketplaceName) || { displayName: '' }

	return {
		props: {
			chart: chartData,
			collections,
			statistics,
			marketplaceData,
			displayName
		}
	}
}

export default function Marketplace({ displayName, ...props }) {
	return <NFTDashboardPage title={`${displayName} Total Volume - DefiLlama`} displayName={displayName} {...props} />
}
