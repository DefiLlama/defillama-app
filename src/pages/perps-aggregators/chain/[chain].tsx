import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import metadataCache from '~/utils/metadata'
import { fetchWithErrorLogging } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { TMetric } from '~/components/Metrics'

const adapterType = ADAPTER_TYPES.PERPS_AGGREGATOR
const type: TMetric = 'Perp Aggregator Volume'

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

	const chains = await fetchWithErrorLogging(
		`${DIMENISIONS_OVERVIEW_API}/${adapterType}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	)
		.then((res) => res.json())
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
		if (!metadataCache.chainMetadata[chain]['aggregator-derivatives']) {
			return { notFound: true }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'perps-aggregators'
		}).catch((e) => console.info(`Chain page data not found ${adapterType} : chain:${chain}`, e))

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const PerpsAggregatorsVolumeOnChain = (props) => {
	return (
		<Layout title={`${props.chain} - ${type} - DefiLlama`} defaultSEO className="gap-2">
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default PerpsAggregatorsVolumeOnChain
