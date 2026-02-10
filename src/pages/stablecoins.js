import { maxAgeForNext } from '~/api'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { stablecoinBackingOptions, stablecoinPegTypeOptions } from '~/containers/Stablecoins/Filters'
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

	const availableBackings = stablecoinBackingOptions
		.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
		.map((opt) => opt.key)

	const availablePegTypes = stablecoinPegTypeOptions
		.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
		.map((opt) => opt.key)

	const stablecoinsContext = {
		totalCount: props.filteredPeggedAssets.length,
		totalMcap: props.filteredPeggedAssets.reduce((sum, s) => sum + (s.mcap || 0), 0),
		topStablecoins: props.filteredPeggedAssets.slice(0, 15).map((s) => ({
			name: s.name,
			symbol: s.symbol,
			mcap: s.mcap,
			change_7d: s.change_7d,
			pegType: s.pegType,
			pegMechanism: s.pegMechanism,
			pegDeviation: s.pegDeviation,
			chains: s.chains?.length
		}))
	}
	const { questions: entityQuestions } = await fetchEntityQuestions('stablecoins', 'page', stablecoinsContext)

	return {
		props: { ...props, availableBackings, availablePegTypes, entityQuestions },
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
	chain,
	availableBackings,
	availablePegTypes,
	entityQuestions
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
				availableBackings={availableBackings}
				availablePegTypes={availablePegTypes}
				entityQuestions={entityQuestions}
			/>
		</Layout>
	)
}
