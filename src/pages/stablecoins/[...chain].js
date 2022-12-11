import Layout from '~/layout'
import PeggedList from '~/components/PeggedPage/PeggedList'
import { getPeggedColor } from '~/utils/getColor'
import { addMaxAgeHeaderForNext } from '~/api'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'

export const getServerSideProps = async ({
	params: {
		chain: [chain]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const props = await getPeggedOverviewPageData(chain)

	if (!props.filteredPeggedAssets || props.filteredPeggedAssets?.length === 0) {
		return {
			notFound: true
		}
	}

	const backgroundColor = await getPeggedColor({
		peggedAsset: props.filteredPeggedAssets[0]?.name
	})
	return {
		props: {
			...props,
			backgroundColor
		}
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
