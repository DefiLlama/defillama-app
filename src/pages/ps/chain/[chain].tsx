import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.REVENUE

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

const RevenueOnChain = (props) => {
	return (
		<Layout title={`P/S - ${props.chain} - DefiLlama`} defaultSEO>
			<AdapterByChain {...props} type="P/S" />
		</Layout>
	)
}

export default RevenueOnChain
