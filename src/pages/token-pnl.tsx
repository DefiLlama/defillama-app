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
			title={`Token PNL - DefiLlama`}
			description={`Token PNL on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`token pnl, defi token pnl, pnl by token, profit and loss by token`}
			canonicalUrl={`/token-pnl`}
			pageName={pageName}
		>
			<TokenPnl coinsData={coinsData} />
		</Layout>
	)
}
