import type { InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { ForksOverview } from '~/containers/Forks/ForksOverview'
import { getForksListPageData } from '~/containers/Forks/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Protocols', 'ranked by', 'TVL in Forks']

export const getStaticProps = withPerformanceLogging('forks', async () => {
	const data = await getForksListPageData()

	if (!data) {
		throw new Error('Failed to load /forks page data')
	}

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function ForksPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
		return (
		<Layout
			title="Protocol Forks Rankings - DeFi TVL by Forks - DefiLlama"
			description="Track DeFi protocol forks and derivatives. Compare original protocols vs their forks by TVL, user count, and market share. Analysis of SushiSwap, PancakeSwap, and 500+ DeFi forks across all chains."
			canonicalUrl="/forks"
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<ForksOverview {...props} />
		</Layout>
	)
}
