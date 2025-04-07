import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainOverview } from '~/ChainOverview'
import { getChainOverviewData } from '~/ChainOverview/queries'

export const getStaticProps = withPerformanceLogging('index', async () => {
	const data = await getChainOverviewData({
		chain: 'All',
		metadata: { name: 'All Chains', tvl: true, stablecoins: true, dexs: true }
	})

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainOverview {...props} />
		</Layout>
	)
}
