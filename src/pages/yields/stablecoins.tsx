import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
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
		<Layout title={`Stablecoins - DefiLlama Yield`} defaultSEO>
			<YieldPage {...props} />
		</Layout>
	)
}
