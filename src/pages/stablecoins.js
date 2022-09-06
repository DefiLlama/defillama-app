import Layout from '~/layout'
import PeggedList from '~/components/PeggedPage/PeggedList'
import { getPeggedColor } from '~/utils/getColor'
import { revalidate } from '~/api'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'

export async function getStaticProps({}) {
	const props = await getPeggedOverviewPageData(null)

	const backgroundColor = await getPeggedColor({
		peggedAsset: props.filteredPeggedAssets[0]?.name
	})
	return {
		props: {
			...props,
			backgroundColor
		},
		revalidate: revalidate()
	}
}

export default function PeggedAssets({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	chainTVLData,
	chain,
	backgroundColor
}) {
	return (
		<Layout title={`Stablecoins Circulating - DefiLlama`} defaultSEO>
			<PeggedList
				chains={chains}
				selectedChain={chain}
				filteredPeggedAssets={filteredPeggedAssets}
				peggedAssetNames={peggedAssetNames}
				peggedNameToChartDataIndex={peggedNameToChartDataIndex}
				chartDataByPeggedAsset={chartDataByPeggedAsset}
				chainTVLData={chainTVLData}
				backgroundColor={backgroundColor}
			/>
		</Layout>
	)
}
