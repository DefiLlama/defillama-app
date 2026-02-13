import { tvlOptions } from '~/components/Filters/options'
import { maxAgeForNext } from '~/api'
import { CompareChains } from '~/containers/CompareChains'
import { getCompareChainsPageData } from '~/containers/CompareChains/queries'
import Layout from '~/layout'
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
			title={`Compare Chains - DefiLlama`}
			description={`Compare chains on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`compare chain, compare blockchain`}
			canonicalUrl={`/compare-chains`}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<CompareChains chains={chains} />
		</Layout>
	)
}
