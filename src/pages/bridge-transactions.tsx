import { getBridges } from '~/containers/Bridges/queries.server'
import { BridgeTransactionsPage } from '~/containers/Bridges/Transactions'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridge-transactions', async () => {
	const { bridges } = await getBridges()

	return {
		props: { bridges },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Bridge Transactions']

export default function BridgeTransactions({ bridges }) {
	return (
		<Layout
			title={`Bridge Transactions - DefiLlama`}
			description="Download cross-chain bridge transaction data by protocol and time period. Export bridge transfer records for analysis on DefiLlama."
			canonicalUrl={`/bridge-transactions`}
			pageName={pageName}
		>
			<BridgeTransactionsPage bridges={bridges} />
		</Layout>
	)
}
