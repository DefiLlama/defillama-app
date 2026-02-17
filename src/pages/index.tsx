import { maxAgeForNext } from '~/api'
import { ChainOverview } from '~/containers/ChainOverview'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import Link from 'next/link'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Overview']
const Announcement = () => (
	<>
		NEW!{' '}
		<Link href="/rwa" className="underline">
			RWA dashboard
		</Link>
	</>
)

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

export default function HomePage(props) {
	return (
		<Layout
			title="DefiLlama - DeFi Dashboard"
			description={props.description}
			keywords={props.keywords}
			canonicalUrl=""
			metricFilters={props.tvlAndFeesOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
			annonuncement={<Announcement />}
		>
			<ChainOverview {...props} />
		</Layout>
	)
}
