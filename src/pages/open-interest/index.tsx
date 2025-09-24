import { maxAgeForNext } from '~/api'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPEN_INTEREST
const dataType = ADAPTER_DATA_TYPES.OPEN_INTEREST_AT_END
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
		<Layout
			title={`${type} by Protocol - DefiLlama`}
			description={`${type} by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by protocol`}
			canonicalUrl={`/open-interest`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default OpenInterestOnAllChains
