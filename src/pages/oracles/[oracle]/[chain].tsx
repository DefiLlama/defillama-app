import type { InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { OracleOverview } from '~/containers/Oracles/OracleOverview'
import { getOracleDetailPageData } from '~/containers/Oracles/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Protocols TVS', 'by', 'Oracle']

export const getStaticProps = withPerformanceLogging('oracles/[oracle]/[chain]', async ({ params }) => {
	if (!params?.oracle || !params?.chain) {
		return { notFound: true, props: null }
	}

	const oracle = Array.isArray(params.oracle) ? params.oracle[0] : params.oracle
	const chain = Array.isArray(params.chain) ? params.chain[0] : params.chain
	const data = await getOracleDetailPageData({ oracle, chain })

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

export default function OraclesOracleChainPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const canonicalUrl = props.oracle && props.chain ? `/oracles/${slug(props.oracle)}/${slug(props.chain)}` : '/oracles'
	return (
		<Layout
			title={`${props.oracle ?? 'Oracles'} - DefiLlama`}
			description="Total Value Secured by Oracles. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="blockchain oracles , total value secured by oracles, defi total value secured by oracles"
			canonicalUrl={canonicalUrl}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<OracleOverview {...props} />
		</Layout>
	)
}
