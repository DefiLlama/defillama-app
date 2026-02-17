import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { OraclesByChain } from '~/containers/Oracles'
import { getOraclesListPageData } from '~/containers/Oracles/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Oracles', 'ranked by', 'TVS']

export const getStaticProps = withPerformanceLogging('oracles', async () => {
	const data = await getOraclesListPageData()

	if (!data) {
		throw new Error('Failed to load /oracles page data')
	}

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function OraclesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Oracles - DefiLlama"
			description="Track total value secured by oracles on all chains. View protocols secured by the oracle, breakdown by chain, and DeFi oracles on DefiLlama."
			keywords="oracles, oracles on all chains, oracles on DeFi protocols, DeFi oracles, protocols secured by the oracle"
			canonicalUrl="/oracles"
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<OraclesByChain {...props} />
		</Layout>
	)
}
