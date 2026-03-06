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

export const getStaticProps = withPerformanceLogging('oracles/[oracle]', async ({ params }) => {
	if (!params?.oracle) {
		return { notFound: true }
	}

	const oracle = Array.isArray(params.oracle) ? params.oracle[0] : params.oracle
	const data = await getOracleDetailPageData({ oracle })

	if (!data) {
		return { notFound: true }
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
	const canonicalUrl = props.oracle ? `/oracles/${slug(props.oracle)}` : '/oracles'
	return (
		<Layout
			title={`${props.oracle ?? 'Oracles'} - DefiLlama`}
			description={`Track total value secured by ${props.oracle ?? 'Oracles'} oracle across all chains. View protocol breakdown and TVS rankings on DefiLlama.`}
			canonicalUrl={canonicalUrl}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<OracleOverview {...props} />
		</Layout>
	)
}
