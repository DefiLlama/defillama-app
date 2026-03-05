import type { InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Chains']

export const getStaticProps = withPerformanceLogging('chains', async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByCategory({
		chainMetadata: metadataCache.chainMetadata,
		category: 'All',
		sampledChart: true
	})

	const chainsContext = {
		totalChains: data.chains.length,
		topChains: data.chains.slice(0, 15).map((c) => ({
			name: c.name,
			tvl: c.tvl ?? null,
			change_1d: c.change_1d ?? null,
			change_7d: c.change_7d ?? null,
			protocols: c.protocols ?? null,
			totalVolume24h: c.totalVolume24h ?? null,
			totalFees24h: c.totalFees24h ?? null,
			totalRevenue24h: c.totalRevenue24h ?? null,
			stablesMcap: c.stablesMcap ?? null
		}))
	}
	const { questions: entityQuestions } = await fetchEntityQuestions('chains', 'page', chainsContext)

	return {
		props: { ...data, entityQuestions },
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Blockchain DeFi Rankings by TVL - Compare All Chains - DefiLlama"
			description="Compare 500+ blockchains by Total Value Locked (TVL), fees, and DeFi activity. Track chain rankings, protocol counts, and cross-chain analytics. Real-time layer-1 and layer-2 blockchain metrics."
			canonicalUrl="/chains"
			metricFilters={tvlOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
		>
			<ChainsByCategory {...props} />
		</Layout>
	)
}
