import Layout from '~/layout'
import PeggedList from '~/containers/PeggedPage/PeggedList'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getPeggedOverviewPageData } from '~/containers/Stablecoins/queries.server'
import { peggedAssetIconPalleteUrl } from '~/utils'
import { primaryColor } from '~/constants/colors'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('stablecoins', async () => {
	const props = await getPeggedOverviewPageData(null)

	props.filteredPeggedAssets = props.filteredPeggedAssets || []
	const name = props.filteredPeggedAssets?.[0]?.name

	const backgroundColor = name ? await getColor(peggedAssetIconPalleteUrl(name)) : primaryColor

	return {
		props: {
			...props,
			backgroundColor
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function PeggedAssets({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	doublecountedIds,
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
				doublecountedIds={doublecountedIds}
				backgroundColor={backgroundColor}
			/>
		</Layout>
	)
}
