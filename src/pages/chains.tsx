import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { withPerformanceLogging } from '~/utils/perf'

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
			tvl: c.tvl,
			change_1d: c.change_1d,
			change_7d: c.change_7d,
			protocols: c.protocols,
			totalVolume24h: c.totalVolume24h,
			totalFees24h: c.totalFees24h,
			totalRevenue24h: c.totalRevenue24h,
			stablesMcap: c.stablesMcap
		}))
	}
	const { questions: entityQuestions } = await fetchEntityQuestions('chains', 'page', chainsContext)

	return {
		props: { ...data, entityQuestions },
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains(props) {
	return <ChainsByCategory {...props} />
}
