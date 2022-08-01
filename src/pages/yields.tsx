import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { getYieldPageData } from '~/api/categories/yield'

export async function getStaticProps() {
	const data = await getYieldPageData()

	return {
		...data,
		revalidate: 20 * 60
	}
}

export default function ApyHomePage(props) {
	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<YieldPage {...props} />
		</Layout>
	)
}
