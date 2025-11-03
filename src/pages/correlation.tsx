import { getAllCGTokensList, maxAgeForNext } from '~/api'
import Correlations from '~/containers/Correlations'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('correlation', async () => {
	const coinsData = await getAllCGTokensList()
	return {
		props: {
			coinsData
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Compare({ coinsData }) {
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
