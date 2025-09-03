import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { feesOptions } from '~/components/Filters/options'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE
const type = 'Holders Revenue'

export const getStaticPaths = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const chains = await fetchJson(
		`${DIMENISIONS_OVERVIEW_API}/${adapterType}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=${dataType}`
	)
		.then((res) => (res.allChains ?? []).slice(0, 10))
		.catch(() => [])

	const paths = []
	for (const chain of chains) {
		paths.push({ params: { chain: slug(chain) } })
	}

	return { paths, fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`${type}/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		if (!metadataCache.chainMetadata[chain]?.fees) {
			return { notFound: true }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			dataType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'holders-revenue'
		}).catch((e) => console.info(`Chain page data not found ${adapterType}:${dataType} : chain:${chain}`, e))

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', type]

const HoldersRevenueOnChain = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`${type} by Protocol on ${props.chain} - DefiLlama`}
			description={`${type} by Protocol on ${props.chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by protocol on ${props.chain}`.toLowerCase()}
			canonicalUrl={`/holders-revenue/chain/${props.chain}`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Revenue"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default HoldersRevenueOnChain
