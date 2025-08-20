import { maxAgeForNext } from '~/api'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.PERPS
const dataType = ADAPTER_DATA_TYPES.OPEN_INTEREST
const type = 'Open Interest'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		dataType,
		chain: 'All',
		route: 'open-interest'
	}).catch((e) => console.info(`Chain page data not found ${adapterType} ${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const OpenInterestOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout title={`${type} by Protocol - DefiLlama`} pageName={pageName}>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default OpenInterestOnAllChains
