// import type { InferGetStaticPropsType } from 'next'
// import { EquitiesOverview } from '~/containers/Equities'
// import { getEquitiesListPageData } from '~/containers/Equities/queries'
// import Layout from '~/layout'
// import { maxAgeForNext } from '~/utils/maxAgeForNext'
// import { withPerformanceLogging } from '~/utils/perf'

import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'

// export const getStaticProps = withPerformanceLogging('equities/index', async () => {
// 	const props = await getEquitiesListPageData()

// 	return {
// 		props,
// 		revalidate: maxAgeForNext([5])
// 	}
// })

// export default function EquitiesIndexPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
// 	return (
// 		<Layout
// 			title="Equities Rankings - DefiLlama"
// 			description="Track public equities by market cap, price, trading volume, and 24h change on DefiLlama."
// 			canonicalUrl="/equities"
// 			pageName={['Equities']}
// 		>
// 			<EquitiesOverview {...props} />
// 		</Layout>
// 	)
// }

export default function EquityTickerDetailPage() {
	return (
		<TemporarilyDisabledPage
			title="Equities"
			description="This page is temporarily disabled and will be back shortly."
			canonicalUrl="/equities/[ticker]"
		>
			<p>Equity ticker data is not available on DefiLlama for the time being.</p>
			<p>We&apos;re working on bringing this page back in a future update.</p>
		</TemporarilyDisabledPage>
	)
}
