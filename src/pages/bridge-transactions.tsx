import { maxAgeForNext } from '~/api'
import { getBridges } from '~/containers/Bridges/queries.server'
import { BridgeTransactionsPage } from '~/containers/Bridges/Transactions'
import Layout from '~/layout'
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
			description={`Download transaction data across different time periods by bridge on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`bridge transactions, cross-chain transfers, bridge data download`}
			canonicalUrl={`/bridge-transactions`}
			pageName={pageName}
		>
			<BridgeTransactionsPage bridges={bridges} />
		</Layout>
	)
}
