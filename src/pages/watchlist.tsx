import { DefiWatchlistContainer } from '~/containers/Watchlist'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { groupProtocols } from '~/hooks/data/utils'

export const getStaticProps = withPerformanceLogging('watchlist', async () => {
	const { protocols, parentProtocols } = await getSimpleProtocolsPageData(basicPropertiesToKeep)

	const parentProtocolsFinal = groupProtocols(protocols, parentProtocols)
		.filter((x: any) => (x.isParentProtocol ? true : false))
		.map((x: any) => {
			if (x.subRows) {
				delete x.subRows
			}
			return x
		})

	return {
		props: { protocols: [...protocols, ...parentProtocolsFinal].sort((a, b) => b.tvl - a.tvl) },
		revalidate: maxAgeForNext([22])
	}
})

export default function Portfolio({ protocols }) {
	return (
		<Layout title={`Saved TVL Rankings - DefiLlama`} defaultSEO>
			<DefiWatchlistContainer protocolsDict={protocols} />
		</Layout>
	)
}
