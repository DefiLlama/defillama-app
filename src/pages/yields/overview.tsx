import Layout from '~/layout'
import PlotsPage from '~/components/YieldsPage/indexPlots'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'

export async function getStaticProps() {
	const data = await getYieldPageData()

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
