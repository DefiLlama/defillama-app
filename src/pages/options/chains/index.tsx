import { maxAgeForNext } from '~/api'
import { ADAPTOR_TYPES, getDimensionsAdaptersChainsPageData } from '~/api/categories/adaptors'
import { SEO } from '~/components/SEO'
import { ChainByAdapter, type IOverviewContainerProps } from '~/containers/DimensionAdapters/ChainByAdapter'

import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const ADAPTOR_TYPE = ADAPTOR_TYPES.OPTIONS

export const getStaticProps = withPerformanceLogging(`${ADAPTOR_TYPE}/chains`, async () => {
	const data = await getDimensionsAdaptersChainsPageData(ADAPTOR_TYPE)
	const premiumData = await getDimensionsAdaptersChainsPageData(ADAPTOR_TYPE, 'dailyPremiumVolume')
	data.premium = premiumData

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const VolumeOnAllChains = (props: IOverviewContainerProps) => {
	return (
		<Layout title="Options volume by chain - DefiLlama">
			<SEO pageType={props.type} />
			<ChainByAdapter {...props} />
		</Layout>
	)
}

export default VolumeOnAllChains
