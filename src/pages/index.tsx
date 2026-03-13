import type { InferGetStaticPropsType } from 'next/types'
import { ChainOverview } from '~/containers/ChainOverview'
import { ChainOverviewAnnouncement } from '~/containers/ChainOverview/Announcement'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Overview']

export const getStaticProps = withPerformanceLogging('index', async () => {
	const metadataModule = await import('~/utils/metadata')
	await metadataModule.refreshMetadataIfStale()
	const metadataCache = metadataModule.default
	const data = await getChainOverviewData({
		chain: 'All',
		chainMetadata: metadataCache.chainMetadata,
		protocolMetadata: metadataCache.protocolMetadata
	})

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="DefiLlama - DeFi Dashboard & Crypto Analytics"
			description="Track Total Value Locked (TVL), revenue, fees, volume, and yields across 7000+ DeFi protocols on 500+ chains. Real-time DeFi analytics including protocol earnings, profit metrics, DEX volume, and transparent crypto data without ads."
			canonicalUrl=""
			metricFilters={props.tvlAndFeesOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
			announcement={<ChainOverviewAnnouncement />}
		>
			<ChainOverview {...props} />
		</Layout>
	)
}
