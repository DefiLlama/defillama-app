import Layout from '~/layout'
import BridgeTransactionsPage from '~/components/BridgesPage/Transactions'
import { maxAgeForNext } from '~/api'
import { getBridges } from '~/api/categories/bridges'

export async function getStaticProps() {
	const { bridges } = await getBridges()

	return {
		props: { bridges },
		revalidate: maxAgeForNext([22])
	}
}

export default function BridgeTransactions({ bridges }) {
	return (
		<Layout title={`Bridge Transactions - DefiLlama Bridges`} defaultSEO>
			<BridgeTransactionsPage bridges={bridges} />
		</Layout>
	)
}
