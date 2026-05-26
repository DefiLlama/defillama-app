import type { InferGetStaticPropsType } from 'next/types'
import { getMetricFiltersLabel } from '~/components/Filters/options'
import { ChainOverview } from '~/containers/ChainOverview'
import { ChainOverviewAnnouncement } from '~/containers/ChainOverview/Announcement'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { createRoutePhaseTimer, withPerformanceLogging } from '~/utils/perf'

const pageName = ['Overview']

export const getStaticProps = withPerformanceLogging(
	'index',
	async () => {
		const phaseTimer = createRoutePhaseTimer()
		const stopGetStaticProps = phaseTimer.start('get_static_props_total')

		try {
			const metadataModule = await phaseTimer.time('metadata_import', () => import('~/utils/metadata'))
			await phaseTimer.time('metadata_refresh_dispatch', () =>
				metadataModule.refreshMetadataInBackgroundIfStale('homepage')
			)
			const metadataCache = metadataModule.default
			const data = await phaseTimer.time('chain_overview_total', () =>
				getChainOverviewData({
					chain: 'All',
					chainMetadata: metadataCache.chainMetadata,
					protocolMetadata: metadataCache.protocolMetadata,
					categoriesAndTagsMetadata: metadataCache.categoriesAndTags,
					protocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset,
					phaseTimer
				})
			)

			return {
				props: data,
				revalidate: maxAgeForNext([22])
			}
		} finally {
			stopGetStaticProps()
			phaseTimer.record()
		}
	},
	{ jitterRevalidate: false }
)

export default function HomePage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const metricFiltersLabel = getMetricFiltersLabel(props.tvlAndFeesOptions)

	return (
		<Layout
			title="DefiLlama - DeFi Dashboard & Crypto Analytics"
			description="Track Total Value Locked (TVL), revenue, fees, volume, and yields across 7000+ DeFi protocols on 500+ chains. Real-time DeFi analytics including protocol earnings, profit metrics, DEX volume, and transparent crypto data without ads."
			canonicalUrl=""
			metricFilters={props.tvlAndFeesOptions}
			metricFiltersLabel={metricFiltersLabel}
			pageName={pageName}
			announcement={<ChainOverviewAnnouncement />}
		>
			<ChainOverview {...props} />
		</Layout>
	)
}
