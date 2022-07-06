import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { revalidate, getYieldPageData } from '~/utils/dataApi'

export async function getStaticProps() {
	const data = await getYieldPageData()

	return {
		...data,
		revalidate: revalidate(23)
	}
}

export default function ApyHomePage(props) {
	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<YieldPage {...props} />
		</Layout>
	)
}
