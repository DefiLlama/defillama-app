import { maxAgeForNext } from '~/api'
import { getPeggedOverviewPageData } from '~/containers/Stablecoins/queries.server'
import { StablecoinsByChain } from '~/containers/Stablecoins/StablecoinsByChain'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('stablecoins', async () => {
	const props = await getPeggedOverviewPageData(null)

	if (!props) {
		throw new Error('getPeggedOverviewPageData() broken')
	}

	if (!props.filteredPeggedAssets || props.filteredPeggedAssets?.length === 0) {
		throw new Error('getPeggedOverviewPageData() no filteredPeggedAssets')
	}

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Stablecoins', 'by', 'Market Cap']

export default function PeggedAssets({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	doublecountedIds,
	chain
}) {
	return (
		<Layout
			title={`Stablecoins Circulating - DefiLlama`}
			description={`Total market cap of stablecoins, their price, supply, inflows, percent off peg, and more. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`stablecoins, stablecoins circulating, defi stablecoins circulating, stablecoins market cap, stablecoins price, stablecoins supply, stablecoins inflows, stablecoins percent off peg`}
			canonicalUrl={`/stablecoins`}
			pageName={pageName}
		>
			<StablecoinsByChain
				chains={chains}
				selectedChain={chain}
				filteredPeggedAssets={filteredPeggedAssets}
				peggedAssetNames={peggedAssetNames}
				peggedNameToChartDataIndex={peggedNameToChartDataIndex}
				chartDataByPeggedAsset={chartDataByPeggedAsset}
				doublecountedIds={doublecountedIds}
			/>
		</Layout>
	)
}
