import { fetchAllCGTokensList } from '~/api'
import type { IResponseCGMarketsAPI } from '~/api/types'
import Correlations from '~/containers/Correlations'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('correlation', async () => {
	const coinsData = await fetchAllCGTokensList()
	return {
		props: {
			coinsData
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Compare({ coinsData }: { coinsData: Array<IResponseCGMarketsAPI> }) {
	return (
		<Layout
			title={`Crypto Asset Price Correlations - DefiLlama`}
			description="Analyze price correlations between crypto assets. Find diversification opportunities with DefiLlama's correlation matrix."
			canonicalUrl={`/correlation`}
		>
			<Correlations coinsData={coinsData} />
		</Layout>
	)
}
