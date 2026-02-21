import type { InferGetStaticPropsType } from 'next'
import Link from 'next/link'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { PROTOCOLS_API } from '~/constants/index'
import { ChainOverview } from '~/containers/ChainOverview'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Overview']
const Announcement = () => (
	<>
		NEW!{' '}
		<Link href="/rwa" className="underline">
			RWA dashboard
		</Link>
	</>
)

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	if (typeof chain !== 'string') {
		return { notFound: true }
	}

	const metadataModule = await import('~/utils/metadata')
	await metadataModule.refreshMetadataIfStale()
	const metadataCache = metadataModule.default

	const data = await getChainOverviewData({
		chain,
		chainMetadata: metadataCache.chainMetadata,
		protocolMetadata: metadataCache.protocolMetadata
	})

	if (!data) {
		return { notFound: true }
	}

	const { questions: entityQuestions } =
		chain.toLowerCase() !== 'all' ? await fetchEntityQuestions(chain, 'chain') : { questions: [] }

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

	const res = await fetchJson(PROTOCOLS_API)

	const paths = res.chains.map((chain) => ({
		params: { chain: slug(chain) }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Chain(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={props.metadata.name === 'All' ? 'DefiLlama - DeFi Dashboard' : `${props.metadata.name} - DefiLlama`}
			description={props.description}
			keywords={props.keywords}
			canonicalUrl={props.metadata.name === 'All' ? '' : `/chain/${slug(props.metadata.name)}`}
			metricFilters={props.tvlAndFeesOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
			announcement={<Announcement />}
		>
			<ChainOverview {...props} />
		</Layout>
	)
}
