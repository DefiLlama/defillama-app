import Layout from '~/layout'
import BridgeTransactionsPage from '~/components/BridgesPage/Transactions'
import { addMaxAgeHeaderForNext } from '~/api'
import { getBridges } from '~/api/categories/bridges'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const { bridges } = await getBridges()

	return {
		props: { bridges }
	}
}

export default function BridgeTransactions({ bridges }) {
	return (
		<Layout title={`Bridge Transactions - DefiLlama Bridges`} defaultSEO>
			<BridgeTransactionsPage bridges={bridges} />
		</Layout>
	)
}
