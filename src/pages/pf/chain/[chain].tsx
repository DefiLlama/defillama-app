import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { feesOptions } from '~/components/Filters/options'

const adapterType = ADAPTER_TYPES.FEES

export const getStaticPaths = async () => {
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
			route: 'pf'
		}).catch((e) => console.info(`Chain page data not found P/F : chain:${chain}`, e))

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const FeesOnChain = (props) => {
	return (
		<Layout
			title={`P/F - ${props.chain} - DefiLlama`}
			defaultSEO
			includeInMetricsOptions={feesOptions}
			includeInMetricsOptionslabel="Include in Metrics"
		>
			<AdapterByChain {...props} type="P/F" />
		</Layout>
	)
}

export default FeesOnChain
