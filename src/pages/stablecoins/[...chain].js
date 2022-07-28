import Layout from '~/layout'
import PeggedList from '~/components/PeggedList'
import { revalidate } from '~/api'
import { getPeggedAssets, getPeggedOverviewPageData } from '~/api/categories/stablecoins'

export async function getStaticProps({
	params: {
		chain: [chain]
	}
}) {
	const props = await getPeggedOverviewPageData(chain)

	if (!props.filteredPeggedAssets || props.filteredPeggedAssets?.length === 0) {
		return {
			notFound: true
		}
	}
	return {
		props,
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const { chains } = await getPeggedAssets()

	const paths = chains.slice(0, 20).map((chain) => ({
		params: { chain: [chain.name] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function PeggedAssets({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartData,
	chartDataByPeggedAsset,
	chain
}) {
	return (
		<Layout title={`Stablecoins Circulating - DefiLlama`} defaultSEO>
			<PeggedList
				chains={chains}
				selectedChain={chain}
				filteredPeggedAssets={filteredPeggedAssets}
				peggedAssetNames={peggedAssetNames}
				peggedNameToChartDataIndex={peggedNameToChartDataIndex}
				chartData={chartData}
				chartDataByPeggedAsset={chartDataByPeggedAsset}
			/>
		</Layout>
	)
}
