import Layout from '~/layout'
import ChainPage from '~/components/ChainPage'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('index', async () => {
	const data = await getChainPageData()
	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainPage {...props} />
		</Layout>
	)
}
