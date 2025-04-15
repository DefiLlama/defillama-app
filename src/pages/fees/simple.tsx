import { maxAgeForNext } from '~/api'
import { ADAPTOR_TYPES, getDimensionAdapterChainPageData } from '~/api/categories/adaptors'
import { SEO } from '~/components/SEO'
import OverviewContainer, { IOverviewContainerProps } from '~/containers/DimensionAdapters'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const ADAPTOR_TYPE = ADAPTOR_TYPES.FEES

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
			isSimpleFees: true,
			title: 'Fees - DefiLlama'
		},
		revalidate: maxAgeForNext([22])
	}
})

interface IPageProps extends IOverviewContainerProps {
	isSimpleFees: boolean
	title: string
}

const SimpleFeesOnAllChains = ({ title, ...props }: IPageProps) => {
	return (
		<Layout title={title}>
			<SEO pageType={props.type} />
			<OverviewContainer {...props} />
		</Layout>
	)
}

export default SimpleFeesOnAllChains
