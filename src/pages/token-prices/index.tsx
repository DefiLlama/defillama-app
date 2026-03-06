import type { InferGetStaticPropsType } from 'next'
import { ProtocolsWithTokens } from '~/containers/Protocols/ProtocolsWithTokens'
import { getProtocolsTokenPricesByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-token-prices/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getProtocolsTokenPricesByChain({ chain: 'All', protocolMetadata: metadataCache.protocolMetadata })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Token Price']

export default function ProtocolsTokenPrices(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Token Price Rankings - DeFi Protocol Prices - DefiLlama"
			description="Track DeFi protocol token price rankings across all chains. Compare token prices for 7000+ protocols on Ethereum, Solana, Base, Arbitrum, and 500+ chains. Real-time crypto token price analytics."
			canonicalUrl={`/token-prices`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
