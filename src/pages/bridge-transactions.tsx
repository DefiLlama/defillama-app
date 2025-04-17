import Layout from '~/layout'
import { BridgeTransactionsPage } from '~/containers/Bridges/Transactions'
import { maxAgeForNext } from '~/api'
import { getBridges } from '~/containers/Bridges/queries.server'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridge-transactions', async () => {
	const { bridges } = await getBridges()

	return {
		props: { bridges },
		revalidate: maxAgeForNext([22])
	}
})

export default function BridgeTransactions({ bridges }) {
	return (
		<Layout title={`Bridge Transactions - DefiLlama`} defaultSEO>
			<BridgeTransactionsPage bridges={bridges} />
		</Layout>
	)
}
