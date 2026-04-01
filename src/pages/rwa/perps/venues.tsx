import type { InferGetStaticPropsType } from 'next'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { getRWAPerpsVenuesOverview } from '~/containers/RWA/Perps/queries'
import { RWAPerpsTabNav } from '~/containers/RWA/Perps/TabNav'
import { RWAPerpsVenuesOverview } from '~/containers/RWA/Perps/Venues'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/perps/venues`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const { rows: venues, initialChartDataset } = await getRWAPerpsVenuesOverview()

	return {
		props: {
			venues,
			initialChartDataset,
			venueLinks: [
				{ label: 'All', to: '/rwa/perps/venues' },
				...metadataCache.rwaPerpsList.venues.map((venue) => ({
					label: venue,
					to: `/rwa/perps/venue/${encodeURIComponent(venue)}`
				}))
			]
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Perps', 'Venues']

export default function RWAPerpsVenuesPage({
	venues,
	initialChartDataset,
	venueLinks
}: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="RWA Perps by Venue - DefiLlama"
			description="Compare RWA perpetuals venues by open interest, 24h volume, and market counts."
			pageName={pageName}
			canonicalUrl="/rwa/perps/venues"
		>
			<RWAPerpsTabNav active="venues" />
			<RowLinksWithDropdown links={venueLinks} activeLink="All" />
			<RWAPerpsVenuesOverview venues={venues} initialChartDataset={initialChartDataset} />
		</Layout>
	)
}
