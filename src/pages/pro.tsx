import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import ProDashboard from '~/containers/ProDashboard'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage() {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ProDashboard />
		</Layout>
	)
}
