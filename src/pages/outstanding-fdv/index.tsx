import type { InferGetStaticPropsType } from 'next'
import { ProtocolsWithTokens } from '~/containers/Protocols/ProtocolsWithTokens'
import { getProtocolsAdjustedFDVsByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-aFDV/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getProtocolsAdjustedFDVsByChain({ chain: 'All', protocolMetadata: metadataCache.protocolMetadata })

	if (!data) throw new Error('Missing page data')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Outstanding FDV']

export default function ProtocolsMarketCaps(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Outstanding FDV Rankings - DeFi Valuations - DefiLlama"
			description="Track DeFi protocol outstanding FDV rankings across all chains. Compare outstanding fully diluted valuations (circulating supply only) for 7000+ protocols on Ethereum, Solana, Base, Arbitrum, and 500+ chains. Real-time crypto oFDV analytics."
			canonicalUrl={`/outstanding-fdv`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
