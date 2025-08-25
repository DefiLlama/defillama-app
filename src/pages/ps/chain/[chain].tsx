import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { feesOptions } from '~/components/Filters/options'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_REVENUE
const type = 'P/S'

export const getStaticPaths = async () => {
	return { paths: [], fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`revenue/ps/chain/[chain]`,
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
			route: 'ps'
		}).catch((e) => console.info(`Chain page data not found P/S : chain:${chain}`, e))

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', type]

const RevenueOnChain = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`P/S - ${props.chain} - DefiLlama`}
			includeInMetricsOptions={feesOptions}
			includeInMetricsOptionslabel="Include in Metrics"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default RevenueOnChain
