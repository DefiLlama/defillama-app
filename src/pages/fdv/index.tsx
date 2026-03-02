import type { InferGetStaticPropsType } from 'next'
import { ProtocolsWithTokens } from '~/containers/Protocols/ProtocolsWithTokens'
import { getProtocolsFDVsByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-fdv/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getProtocolsFDVsByChain({ chain: 'All', protocolMetadata: metadataCache.protocolMetadata })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Fully Diluted Valuation']

export default function ProtocolsFdv(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Fully Diluted Valuations - DefiLlama"
			description={`Compare Fully Diluted Valuations across 6,000+ protocols and categories. Real-time fundamental FDV data for token research. Filter by category and chain.`}
			keywords={`fully diluted valuations, defi fully diluted valuations`}
			canonicalUrl={`/fdv`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
