import Layout from '~/layout'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'
import { YieldsWatchlistContainer } from '~/containers/Watchlist'

export async function getStaticProps() {
	const data = await getYieldPageData()

	return {
		...data,
		revalidate: revalidate(23)
	}
}

export default function Portfolio({ pools }) {
	return (
		<Layout title={`Saved Pools - DefiLlama`} defaultSEO>
			<YieldsWatchlistContainer protocolsDict={pools} />
		</Layout>
	)
}
