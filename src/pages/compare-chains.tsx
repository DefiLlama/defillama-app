import { tvlOptions } from '~/components/Filters/options'
import { CompareChains } from '~/containers/CompareChains'
import { getCompareChainsPageData } from '~/containers/CompareChains/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('compare-chains', async () => {
	const data = await getCompareChainsPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Compare Chains']

export default function CompareChainsPage({
	chains
}: {
	chains: Array<{ value: string; label: string; logo: string }>
}) {
	return (
		<Layout
			title="Chain Comparison Tool - TVL, Fees & DeFi Activity - DefiLlama"
			description="Compare blockchains side-by-side by TVL, fees, DeFi activity, and protocol counts. Analyze chain performance metrics for Ethereum, Solana, Base, Arbitrum, and 500+ networks. Chain comparison analytics."
			canonicalUrl={`/compare-chains`}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<CompareChains chains={chains} />
		</Layout>
	)
}
