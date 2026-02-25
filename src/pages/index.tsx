import type { InferGetStaticPropsType } from 'next/types'
import { BasicLink } from '~/components/Link'
import { ChainOverview } from '~/containers/ChainOverview'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Overview']
const Announcement = () => (
	<>
		NEW!{' '}
		<BasicLink href="/rwa" className="underline">
			RWA dashboard
		</BasicLink>
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

export default function HomePage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="DefiLlama - DeFi Dashboard"
			description={props.description}
			keywords={props.keywords}
			canonicalUrl=""
			metricFilters={props.tvlAndFeesOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
			announcement={<Announcement />}
		>
			<ChainOverview {...props} />
		</Layout>
	)
}
