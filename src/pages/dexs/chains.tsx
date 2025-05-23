import { maxAgeForNext } from '~/api'
import { ADAPTOR_TYPES, getDimensionsAdaptersChainsPageData } from '~/api/categories/adaptors'
import { SEO } from '~/components/SEO'
import { ChainByAdapter, type IOverviewContainerProps } from '~/containers/DimensionAdapters/ChainByAdapter'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const ADAPTOR_TYPE = ADAPTOR_TYPES.DEXS

export const getStaticProps = withPerformanceLogging(`${ADAPTOR_TYPE}/chains`, async () => {
	const data = await getDimensionsAdaptersChainsPageData(ADAPTOR_TYPE)

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const VolumeOnAllChains = (props: IOverviewContainerProps) => {
	return (
		<Layout title="DEXs volume by chain - DefiLlama">
			<SEO pageType={props.type} />
			<ChainByAdapter {...props} />
		</Layout>
	)
}

export default VolumeOnAllChains
