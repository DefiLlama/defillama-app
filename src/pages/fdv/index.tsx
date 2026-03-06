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
			title="FDV Rankings - DeFi Protocol Fully Diluted Valuation - DefiLlama"
			description="Track DeFi protocol FDV rankings across all chains. Compare fully diluted valuations for 7000+ protocols on Ethereum, Solana, Base, Arbitrum, and 500+ chains. Real-time crypto FDV analytics and token valuation data."
			canonicalUrl={`/fdv`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
