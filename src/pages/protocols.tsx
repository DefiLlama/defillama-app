import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'

export const getStaticProps = withPerformanceLogging('protocols', async () => {
	const protocols = await getProtocolsByChain({
		chain: 'All',
		metadata: { name: 'All', stablecoins: true, fees: true, dexs: true, derivatives: true, id: 'all' }
	}).then((data) => data.protocols)

	return {
		props: {
			protocols
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ protocols }) {
	return (
		<Layout title={`TVL Rankings - DefiLlama`} defaultSEO>
			<ChainProtocolsTable protocols={protocols} />
		</Layout>
	)
}
