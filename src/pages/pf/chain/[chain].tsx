import type { GetStaticPropsContext } from 'next'
import { feesOptions } from '~/components/Filters/options'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { AdapterByChain } from '~/containers/AdapterMetrics/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { getAdapterByChainPageData } from '~/containers/AdapterMetrics/queries'
import { addDimensionChainRouteTelemetry } from '~/containers/AdapterMetrics/telemetry'
import type { IAdapterByChainPageData } from '~/containers/AdapterMetrics/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const type = 'P/F'

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

export const getStaticProps = withPerformanceLogging(
	`fees/pf/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const metadata = metadataCache.chainMetadata[chain]

		addDimensionChainRouteTelemetry({
			adapterType,
			chain: metadata?.name ?? chain,
			canonicalRoute: '/pf/chain/[chain]',
			metadataFlag: 'fees'
		})

		if (!metadata?.fees) {
			return { notFound: true, revalidate: maxAgeForNext([22]) }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			chain: metadata.name,
			route: 'pf',
			metricName: type
		})

		if (!data) throw new Error(`Missing page data for route=/pf/chain/[chain] chain=${chain}`)

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', type]

const FeesOnChain = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`Price to Fees (P/F) Ratio on ${props.chain} - DefiLlama`}
			description={`Compare Price to Fees (P/F) ratios for DeFi protocols on ${props.chain}. Evaluate valuations relative to fees generated.`}
			canonicalUrl={`/pf/chain/${slug(props.chain)}`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Metrics"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default FeesOnChain
