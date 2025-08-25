import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME
const type = 'Options Notional Volume'

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, dataType, route: 'options/notional-volume' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const OptionsNotionalVolumeByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title={`${type} by Chain - DefiLlama`} pageName={pageName}>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default OptionsNotionalVolumeByChain
