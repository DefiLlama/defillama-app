import type { InferGetStaticPropsType } from 'next'
import { ProtocolsWithTokens } from '~/containers/Protocols/ProtocolsWithTokens'
import { getProtocolsMarketCapsByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-market-caps/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getProtocolsMarketCapsByChain({ chain: 'All', protocolMetadata: metadataCache.protocolMetadata })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Market Cap']

export default function ProtocolsMarketCaps(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Market Cap Rankings - DeFi Protocol Token Capitalization - DefiLlama"
			description="Track DeFi protocol market cap rankings across all chains. Compare token market capitalization for 7000+ protocols on Ethereum, Solana, Base, Arbitrum, and 500+ chains. Real-time crypto market cap analytics."
			canonicalUrl={`/mcaps`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
