import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
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
			title={`${props.category} Chains DeFi TVL - DefiLlama`}
			description={props.description}
			keywords={props.keywords}
			canonicalUrl="/chains"
			metricFilters={tvlOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
		>
			<ChainsByCategory {...props} />
		</Layout>
	)
}
