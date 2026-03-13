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
		return { notFound: true }
	}

	const chain = Array.isArray(params.chain) ? params.chain[0] : params.chain
	const data = await getOraclesListPageData({ chain })

	if (!data) {
		return { notFound: true }
	}

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export const getStaticPaths = () => {
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
			title={`${props.chain} DeFi Oracles - Total Value Secured - DefiLlama`}
			description={`Track Total Value Secured (TVS) by oracle on ${props.chain}. Compare protocols secured, where oracle failure would equal TVS.`}
			canonicalUrl={canonicalUrl}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<OraclesByChain {...props} />
		</Layout>
	)
}
