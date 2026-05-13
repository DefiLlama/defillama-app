import type { InferGetStaticPropsType } from 'next'
import { getDefaultRWAPerpsChartView } from '~/containers/RWA/Perps/chartState'
import { RWAPerpsDashboard } from '~/containers/RWA/Perps/Dashboard'
import { getRWAPerpsOverview } from '~/containers/RWA/Perps/queries'
import { RWAPerpsTabNav } from '~/containers/RWA/Perps/TabNav'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/perps/forex`, async () => {
	const data = await getRWAPerpsOverview({
		activeView: getDefaultRWAPerpsChartView('overview'),
		assetClass: 'Forex Perps'
	})

	return {
		props: { data },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Perps']

export default function RWAPerpsForexPage({ data }: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="RWA Forex Perps Dashboard & Analytics - DefiLlama"
			description="Track tokenized forex perpetual markets across venues. Compare open interest, 24h volume, market counts, and venue-level breakdowns for forex pairs."
			pageName={pageName}
			canonicalUrl="/rwa/perps/forex"
		>
			<RWAPerpsTabNav active="forex" />
			<RWAPerpsDashboard mode="overview" data={data} assetClassFilter="Forex Perps" />
		</Layout>
	)
}
