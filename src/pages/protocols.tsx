import { maxAgeForNext } from '~/api'
import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('protocols', async () => {
	const protocols = await getProtocolsByChain({
		chain: 'All',
		metadata: { name: 'All', stablecoins: true, fees: true, dexs: true, perps: true, id: 'all' }
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
		<Layout
			title={`Protocols - DefiLlama`}
			description={`List of all protocols on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`protocols, defi protocols, protocols on blockchain`}
			canonicalUrl={`/protocols`}
		>
			<ChainProtocolsTable protocols={protocols} />
		</Layout>
	)
}
