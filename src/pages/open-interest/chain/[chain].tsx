import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { fetchJson } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { TMetric } from '~/components/Metrics'

const adapterType = ADAPTER_TYPES.PERPS
const dataType = ADAPTER_DATA_TYPES.OPEN_INTEREST
const type: TMetric = 'Open Interest'

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

		if (!metadataCache.chainMetadata[chain]?.perps) {
			return { notFound: true }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'open-interest'
		}).catch((e) => console.info(`Chain page data not found ${adapterType} ${dataType} : chain:${chain}`, e))

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const OpenInterestOnChain = (props) => {
	return (
		<Layout title={`${props.chain} - ${type} - DefiLlama`} defaultSEO>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default OpenInterestOnChain
