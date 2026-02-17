import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { ForksOverview } from '~/containers/Forks/ForksOverview'
import { getForksListPageData } from '~/containers/Forks/queries'
import Layout from '~/layout'
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
			title="Forks - DefiLlama"
			description="Overview of protocols by their forks value. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="forks, protocol forks, forks on blockchain"
			canonicalUrl="/forks"
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<ForksOverview {...props} />
		</Layout>
	)
}
