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
			title={`Correlations - DefiLlama`}
			description={`Correlations Matrix between tokens on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`correlations, correlations matrix`}
			canonicalUrl={`/correlation`}
		>
			<Correlations coinsData={coinsData} />
		</Layout>
	)
}
