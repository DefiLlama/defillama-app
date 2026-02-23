import type { GetStaticPropsContext } from 'next'
import { feesOptions } from '~/components/Filters/options'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const type = 'P/F'

export const getStaticPaths = async () => {
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

		if (!metadataCache.chainMetadata[chain]?.fees) {
			return { notFound: true }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'pf',
			metricName: type
		}).catch((e) => console.info(`Chain page data not found P/F : chain:${chain}`, e))

		if (!data) return { notFound: true }

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
			title={`P/F - ${props.chain} - DefiLlama`}
			description={`P/F by Protocol on ${props.chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`p/f by protocol on ${props.chain}`}
			canonicalUrl={`/pf/chain/${props.chain}`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Metrics"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default FeesOnChain
