import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.DEXS

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, route: 'dexs' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const DexsByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="DEXs by chain - DefiLlama">
			<ChainsByAdapter {...props} type="DEXs" />
		</Layout>
	)
}

export default DexsByChain
