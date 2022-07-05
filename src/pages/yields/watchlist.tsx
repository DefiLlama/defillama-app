import Layout from '~/layout'
import PortfolioContainer from '~/containers/YieldPortfolioContainer'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'

export async function getStaticProps() {
	const data = await getYieldPageData()

	return {
		...data,
		revalidate: revalidate()
	}
}

export default function Portfolio({ pools }) {
	return (
		<Layout title={`Saved Pools - DefiLlama`} defaultSEO>
			<PortfolioContainer protocolsDict={pools} />
		</Layout>
	)
}
