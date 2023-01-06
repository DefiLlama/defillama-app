import Layout from '~/layout'
import PeggedList from '~/components/PeggedPage/PeggedList'
import { getColor, getPeggedColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'
import { peggedAssetIconPalleteUrl } from '~/utils'
import { primaryColor } from '~/constants/colors'

export async function getStaticProps({}) {
	const props = await getPeggedOverviewPageData(null)

	const name = props.filteredPeggedAssets[0]?.name

	const backgroundColor = name ? await getColor(peggedAssetIconPalleteUrl(name)) : primaryColor

	return {
		props: {
			...props,
			backgroundColor
		},
		revalidate: maxAgeForNext([22])
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
