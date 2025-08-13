import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = ADAPTER_DATA_TYPES.NOTIONAL_VOLUME

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, dataType, route: 'options/notional-volume' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const OptionsNotionalVolumeByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="Options Notional Volume by Chain - DefiLlama">
			<ChainsByAdapter {...props} type="Options Notional Volume" />
		</Layout>
	)
}

export default OptionsNotionalVolumeByChain
