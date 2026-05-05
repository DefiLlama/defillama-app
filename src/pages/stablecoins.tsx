import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { stablecoinBackingOptions, stablecoinPegTypeOptions } from '~/containers/Stablecoins/Filters'
import { getStablecoinsByChainPageData } from '~/containers/Stablecoins/queries.server'
import { StablecoinsByChain } from '~/containers/Stablecoins/StablecoinsByChain'
import type { PeggedOverviewPageData } from '~/containers/Stablecoins/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinsPageProps = PeggedOverviewPageData & {
	availableBackings: string[]
	availablePegTypes: string[]
	entityQuestions?: string[]
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

	const stablecoinsContext = {
		totalCount: props.filteredPeggedAssets.length,
		totalMcap: props.filteredPeggedAssets.reduce((sum, s) => sum + (s.mcap || 0), 0),
		topStablecoins: props.filteredPeggedAssets.slice(0, 15).map((s) => {
			const symbol = typeof s.symbol === 'string' ? s.symbol : null
			const change7d = typeof s.change_7d === 'number' ? s.change_7d : null
			const pegType = typeof s.pegType === 'string' ? s.pegType : null
			const pegMechanism = typeof s.pegMechanism === 'string' ? s.pegMechanism : null
			const pegDeviation = typeof s.pegDeviation === 'number' ? s.pegDeviation : null
			const chains = Array.isArray(s.chains) ? s.chains.length : null

			return {
				name: s.name,
				symbol,
				mcap: s.mcap ?? null,
				change_7d: change7d,
				pegType,
				pegMechanism,
				pegDeviation,
				chains
			}
		})
	}
	const { questions: entityQuestions } = await fetchEntityQuestions('stablecoins', 'page', stablecoinsContext)

	return {
		props: { ...props, availableBackings, availablePegTypes, entityQuestions },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Stablecoins', 'by', 'Market Cap']

export default function StablecoinsPage({
	chains,
	filteredPeggedAssets,
	chain,
	availableBackings,
	availablePegTypes,
	defaultChartData,
	entityQuestions
}: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`Stablecoin Market Cap Chart, Supply & Peg Data - DefiLlama`}
			description={`Track the total stablecoin market cap, circulating supply, prices, inflows, and peg stability across all stablecoins. Explore stablecoin market charts and analytics with transparent data from DefiLlama.`}
			canonicalUrl="/stablecoins"
			pageName={pageName}
		>
			<StablecoinsByChain
				chains={chains}
				selectedChain={chain}
				filteredPeggedAssets={filteredPeggedAssets}
				availableBackings={availableBackings}
				availablePegTypes={availablePegTypes}
				defaultChartData={defaultChartData}
				entityQuestions={entityQuestions}
			/>
		</Layout>
	)
}
