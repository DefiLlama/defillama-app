import type { InferGetStaticPropsType } from 'next'
import { EquitiesOverview } from '~/containers/Equities'
import { getEquitiesListPageData } from '~/containers/Equities/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('equities/index', async () => {
	const props = await getEquitiesListPageData()

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

export default function EquitiesIndexPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Equities Rankings - DefiLlama"
			description="Track public equities by market cap, price, trading volume, and 24h change on DefiLlama."
			canonicalUrl="/equities"
			pageName={['Equities']}
		>
			<EquitiesOverview {...props} />
		</Layout>
	)
}
