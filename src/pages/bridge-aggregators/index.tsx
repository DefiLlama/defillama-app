import { maxAgeForNext } from '~/api'
import { ADAPTOR_TYPES, getDimensionAdapterChainPageData } from '~/api/categories/adaptors'
import { SEO } from '~/components/SEO'
import { ChainByAdapter, type IOverviewContainerProps } from '~/containers/DimensionAdapters/ChainByAdapter'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const ADAPTOR_TYPE = ADAPTOR_TYPES.BRIDGE_AGGREGATORS

export const getStaticProps = withPerformanceLogging('fees/simple/index', async () => {
	const data = await getDimensionAdapterChainPageData(ADAPTOR_TYPE).catch((e) =>
		console.info(`Chain page data not found ${ADAPTOR_TYPE} : ALL_CHAINS`, e)
	)

	if (!data || !data.protocols || data.protocols.length <= 0) return { notFound: true }

	const categories = new Set<string>()

	data.protocols.forEach((p) => {
		if (p.category) {
			categories.add(p.category)
		}
	})

	return {
		props: {
			...data,
			type: ADAPTOR_TYPE,
			categories: Array.from(categories),
			title: 'Bridge Aggregators Volume - DefiLlama'
		},
		revalidate: maxAgeForNext([22])
	}
})

interface IPageProps extends IOverviewContainerProps {
	title: string
}

const VolumeOnAllChains = ({ title, ...props }: IPageProps) => {
	return (
		<Layout title={title}>
			<SEO pageType={props.type} />
			<ChainByAdapter {...props} />
		</Layout>
	)
}

export default VolumeOnAllChains
