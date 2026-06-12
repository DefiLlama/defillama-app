import type { InferGetStaticPropsType } from 'next'
import { getMetricFiltersLabel } from '~/components/Filters/options'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { ChainOverview } from '~/containers/ChainOverview'
import { ChainOverviewAnnouncement } from '~/containers/ChainOverview/Announcement'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Overview']

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	if (typeof chain !== 'string') {
		return { notFound: true }
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const { resolveChainParamFromMetadata } = await import('~/server/routeCache/chains')
	const isAllChain = chain.toLowerCase() === 'all'
	const chainRoute = isAllChain ? null : resolveChainParamFromMetadata(chain, metadataCache)
	const normalizedChain = isAllChain ? 'All' : chainRoute?.canonicalName

	if (!normalizedChain) {
		return { notFound: true }
	}

	const data = await getChainOverviewData({
		chain: normalizedChain,
		chainMetadata: metadataCache.chainMetadata,
		protocolMetadata: metadataCache.protocolMetadata,
		categoriesAndTagsMetadata: metadataCache.categoriesAndTags,
		protocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset,
		rwaChainsForActiveMcap: metadataCache.rwaList.chains
	})

	if (!data) {
		throw new Error(`Missing page data for route=/chain/[chain] chain=${normalizedChain}`)
	}

	const { questions: entityQuestions } =
		normalizedChain !== 'All' ? await fetchEntityQuestions(normalizedChain, 'chain') : { questions: [] }

	return {
		props: { ...data, entityQuestions },
		revalidate: maxAgeForNext([22])
	}
})

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

	const { getChainStaticPaths } = await import('~/server/routeCache/chains')
	const paths = await getChainStaticPaths()

	return { paths, fallback: 'blocking' }
}

export default function Chain(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={
				props.metadata.name === 'All'
					? 'DefiLlama - DeFi Dashboard & Crypto Analytics'
					: `${props.metadata.name} - DeFi TVL, Fees, & Revenue - DefiLlama`
			}
			description={props.description}
			canonicalUrl={props.metadata.name === 'All' ? '' : `/chain/${slug(props.metadata.name)}`}
			metricFilters={props.tvlAndFeesOptions}
			metricFiltersLabel={getMetricFiltersLabel(props.tvlAndFeesOptions) ?? undefined}
			pageName={pageName}
			announcement={<ChainOverviewAnnouncement chainName={props.metadata.name} />}
		>
			<ChainOverview {...props} />
		</Layout>
	)
}
