import type { InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { OraclesByChain } from '~/containers/Oracles/OraclesByChain'
import { getOraclesListPageData } from '~/containers/Oracles/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Oracles', 'ranked by', 'TVS']

export const getStaticProps = withPerformanceLogging('oracles/[chain]', async ({ params }) => {
	if (!params?.chain) {
		return { notFound: true, props: null }
	}

	const chain = Array.isArray(params.chain) ? params.chain[0] : params.chain
	const data = await getOraclesListPageData({ chain })

	if (!data) {
		return { notFound: true, props: null }
	}

	return {
		props: data,
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

	return { paths: [], fallback: 'blocking' }
}

export default function OraclesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const canonicalUrl = props.chain ? `/oracles/chain/${slug(props.chain)}` : '/oracles'
	return (
		<Layout
			title="Oracles - DefiLlama"
			description="Track total value secured by oracles on all chains. View protocols secured by the oracle, breakdown by chain, and DeFi oracles on DefiLlama."
			keywords="oracles, oracles on all chains, oracles on DeFi protocols, DeFi oracles, protocols secured by the oracle"
			canonicalUrl={canonicalUrl}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<OraclesByChain {...props} />
		</Layout>
	)
}
