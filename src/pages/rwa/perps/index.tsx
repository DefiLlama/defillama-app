import type { InferGetStaticPropsType } from 'next'
import { getDefaultRWAPerpsChartView } from '~/containers/RWA/Perps/chartState'
import { RWAPerpsDashboard } from '~/containers/RWA/Perps/Dashboard'
import { getRWAPerpsOverview } from '~/containers/RWA/Perps/queries'
import { RWAPerpsTabNav } from '~/containers/RWA/Perps/TabNav'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/perps/index`, async () => {
	const data = await getRWAPerpsOverview({
		activeView: getDefaultRWAPerpsChartView('overview'),
		excludeAssetClass: 'Forex Perps'
	})

	return {
		props: { data },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Perps']

export default function RWAPerpsPage({ data }: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="RWA Perps Dashboard & Analytics - DefiLlama"
			description="Track RWA perpetual markets across venues. Compare open interest, 24h volume, market counts, and venue-level breakdowns."
			pageName={pageName}
			canonicalUrl="/rwa/perps"
		>
			<RWAPerpsTabNav active="overview" />
			<RWAPerpsDashboard mode="overview" data={data} />
		</Layout>
	)
}
