import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'chains/[category]',
	async ({ params }: GetStaticPropsContext<{ category: string }>) => {
		if (!params?.category) {
			return { notFound: true, props: null }
		}

		const { category } = params
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const data = await getChainsByCategory({ chainMetadata: metadataCache.chainMetadata, category })
		const { questions: entityQuestions } = await fetchEntityQuestions('chains', 'page', {
			category,
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
		})
		return {
			props: { ...data, entityQuestions },
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function Chains(props) {
	return <ChainsByCategory {...props} />
}
