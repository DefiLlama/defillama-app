import { DefiWatchlistContainer } from '~/containers/Watchlist'
import Layout from '~/layout'
import { expiresForNext, maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'

export async function getStaticProps() {
	const { protocols } = await getSimpleProtocolsPageData(basicPropertiesToKeep)

	return {
		props: { protocols },
		revalidate: maxAgeForNext([22]),
		expires: expiresForNext([22])
	}
}

export default function Portfolio({ protocols }) {
	return (
		<Layout title={`Saved TVL Rankings - DefiLlama`} defaultSEO>
			<DefiWatchlistContainer protocolsDict={protocols} />
		</Layout>
	)
}
