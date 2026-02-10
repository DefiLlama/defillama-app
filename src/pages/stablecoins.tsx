import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { stablecoinBackingOptions, stablecoinPegTypeOptions } from '~/containers/Stablecoins/Filters'
import { getStablecoinsByChainPageData } from '~/containers/Stablecoins/queries.server'
import { StablecoinsByChain } from '~/containers/Stablecoins/StablecoinsByChain'
import type { PeggedOverviewPageData } from '~/containers/Stablecoins/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinsPageProps = PeggedOverviewPageData & {
	availableBackings: string[]
	availablePegTypes: string[]
}

export const getStaticProps: GetStaticProps<StablecoinsPageProps> = withPerformanceLogging('stablecoins', async () => {
	const props = await getStablecoinsByChainPageData(null)

	if (!props) {
		throw new Error('getStablecoinsByChainPageData() broken')
	}

	if (!props.filteredPeggedAssets || props.filteredPeggedAssets.length === 0) {
		throw new Error('getStablecoinsByChainPageData() no filteredPeggedAssets')
	}

	const availableBackings = stablecoinBackingOptions
		.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
		.map((opt) => opt.key)

	const availablePegTypes = stablecoinPegTypeOptions
		.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
		.map((opt) => opt.key)

	return {
		props: { ...props, availableBackings, availablePegTypes },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Stablecoins', 'by', 'Market Cap']

export default function StablecoinsPage({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	doublecountedIds,
	chain,
	availableBackings,
	availablePegTypes
}: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Stablecoins Circulating - DefiLlama"
			description="Total market cap of stablecoins, their price, supply, inflows, percent off peg, and more. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="stablecoins, stablecoins circulating, defi stablecoins circulating, stablecoins market cap, stablecoins price, stablecoins supply, stablecoins inflows, stablecoins percent off peg"
			canonicalUrl="/stablecoins"
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
				availableBackings={availableBackings}
				availablePegTypes={availablePegTypes}
			/>
		</Layout>
	)
}
