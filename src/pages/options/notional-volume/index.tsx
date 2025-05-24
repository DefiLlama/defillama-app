import { maxAgeForNext } from '~/api'
import { ChainByAdapter2 } from '~/containers/DimensionAdapters/ChainByAdapter2'
import { ADAPTOR_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const ADAPTOR_TYPE = ADAPTOR_TYPES.OPTIONS
const dataType = 'dailyNotionalVolume'
const type = 'Options Notional Volume'

export const getStaticProps = withPerformanceLogging(`${slug(type)}/index`, async () => {
	const data = await getAdapterChainPageData({
		adaptorType: ADAPTOR_TYPE,
		chain: 'All',
		dataType,
		route: 'options/notional-volume'
	}).catch((e) => console.info(`Chain page data not found ${ADAPTOR_TYPE}:${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const NotionalVolumeOnAllChains = (props) => {
	return (
		<Layout title={`${type} - DefiLlama`} defaultSEO>
			<ChainByAdapter2 {...props} type={type} />
		</Layout>
	)
}

export default NotionalVolumeOnAllChains
