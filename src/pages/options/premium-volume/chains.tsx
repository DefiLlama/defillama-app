import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = 'dailyPremiumVolume'

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, dataType, route: 'options/premium-volume' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const OptionsPremiumVolumeByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="Options Premium Volume by chain - DefiLlama" className="gap-2">
			<ChainsByAdapter {...props} type="Options Premium Volume" />
		</Layout>
	)
}

export default OptionsPremiumVolumeByChain
