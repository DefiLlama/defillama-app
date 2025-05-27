import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.PERPS

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, route: 'perps' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const PerpsByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="Perps by chain - DefiLlama">
			<ChainsByAdapter {...props} type="Perp Volume" />
		</Layout>
	)
}

export default PerpsByChain
