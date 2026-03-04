import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Chains']

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
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function Chains(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.category} Chains DeFi TVL - DefiLlama`}
			description={props.description}
			keywords={props.keywords}
			canonicalUrl={`/chains${props.category === 'All' ? '' : `/${props.category}`}`}
			metricFilters={tvlOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
		>
			<ChainsByCategory {...props} />
		</Layout>
	)
}
