import Layout from '~/layout'
import PlotsPage from '~/components/YieldsPage/indexPlots'
import { revalidate } from '~/api'
import { getYieldPageData, getYieldMedianData } from '~/api/categories/yield'

export async function getStaticProps() {
	const data = await getYieldPageData()
	const median = await getYieldMedianData()
	data['props']['median'] = median.props

	return {
		...data,
		revalidate: revalidate(23)
	}
}

export default function YieldPlots(props) {
	return (
		<Layout title={`Overview - DefiLlama Yield`} defaultSEO>
			<PlotsPage {...props} />
		</Layout>
	)
}
