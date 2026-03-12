import type { InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { OraclesByChain } from '~/containers/Oracles/OraclesByChain'
import { getOraclesListPageData } from '~/containers/Oracles/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
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
			title="DeFi Oracle Rankings - Total Value Secured - DefiLlama"
			description="Track Total Value Secured (TVS) by oracle. Compare chains and protocols secured, where oracle failure would equal TVS."
			canonicalUrl="/oracles"
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<OraclesByChain {...props} />
		</Layout>
	)
}
