import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('protocols', async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const protocols = await getProtocolsByChain({
		chain: 'All',
		chainMetadata: metadataCache.chainMetadata,
		protocolMetadata: metadataCache.protocolMetadata
	}).then((data) => data.protocols)

	return {
		props: {
			protocols
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ protocols }) {
	return (
		<Layout
			title="Protocols Rankings - DeFi TVL, Fees & Revenue Analytics - DefiLlama"
			description="Complete directory of 7000+ DeFi protocols ranked by TVL, fees, and revenue. Track protocol metrics across Ethereum, Solana, Base, Arbitrum and all major chains. Filter by category, chain, and performance."
			canonicalUrl={`/protocols`}
		>
			<ChainProtocolsTable protocols={protocols} />
		</Layout>
	)
}
