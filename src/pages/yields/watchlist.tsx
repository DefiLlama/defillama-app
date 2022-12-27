import Layout from '~/layout'
import { YieldsWatchlistContainer } from '~/containers/Watchlist'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { maxAgeForNext } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'

export async function getStaticProps() {
	const data = await getYieldPageData()

	return {
		props: { pools: data.props.pools },
		revalidate: maxAgeForNext([23])
	}
}

export default function Portfolio({ pools }) {
	return (
		<Layout title={`Saved Pools - DefiLlama`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldsWatchlistContainer protocolsDict={pools} />
		</Layout>
	)
}
