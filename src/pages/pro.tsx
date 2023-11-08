import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainContainer } from '~/containers/ChainContainer/ProChain'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	const data = await getChainPageData()

	return {
		props: {
			...data.props,
			totalFundingAmount: data.props.raisesChart
				? Object.values(data.props.raisesChart).reduce((acc, curr) => (acc += curr), 0) * 1e6
				: null
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainContainer {...props} />
		</Layout>
	)
}
