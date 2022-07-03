import Layout from '~/layout'
import PlotsPage from '~/components/YieldsPage/indexPlots'
import { getAggregatedData, revalidate } from '~/utils/dataApi'

export async function getStaticProps() {
	const data = await getAggregatedData()

	return {
		...data,
		revalidate: revalidate()
	}
}

export default function YieldPlots(props) {
	return (
		<Layout title={`Plots - DefiLlama Yield`} defaultSEO>
			<PlotsPage {...props} />
		</Layout>
	)
}
