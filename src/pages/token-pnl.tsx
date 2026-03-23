import { fetchAllCGTokensList } from '~/api'
import { TokenPnl } from '~/containers/TokenPnl'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('token-pnl', async () => {
	const coinsData = await fetchAllCGTokensList()
	return {
		props: {
			coinsData
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Token PNL']

export default function TokenPnlPage({ coinsData }) {
	return (
		<Layout
			title={`Token Profit & Loss (PnL) Tracker - DefiLlama`}
			description="Calculate profit and loss for any DeFi token. Track entry price, current value, and returns on DefiLlama."
			canonicalUrl={`/token-pnl`}
			pageName={pageName}
		>
			<TokenPnl coinsData={coinsData} />
		</Layout>
	)
}
