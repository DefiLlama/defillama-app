import Correlations from '~/components/Correlations'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { getAllCGTokensList, maxAgeForNext } from '~/api'

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
		<Layout title={`Correlations - DefiLlama`}>
			<Correlations coinsData={coinsData} />
		</Layout>
	)
}
