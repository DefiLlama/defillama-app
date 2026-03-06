import { getTotalValueLostInHacksByProtocol } from '~/containers/Hacks/queries'
import { TotalValueLostContainer } from '~/containers/Hacks/TotalValueLost'
import type { IProtocolTotalValueLostInHacksByProtocol } from '~/containers/Hacks/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Protocols', 'ranked by', 'Total Value Lost in Hacks']

export const getStaticProps = withPerformanceLogging('protocols/total-value-lost-in-hacks', async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getTotalValueLostInHacksByProtocol({
		protocolMetadata: metadataCache.protocolMetadata
	})
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function TotalLostInHacks(props: IProtocolTotalValueLostInHacksByProtocol) {
	return (
		<Layout
			title="Protocols by Hack Loss - DeFi Total Value Lost Rankings - DefiLlama"
			description="Track total value lost in DeFi hacks ranked by protocol. Compare cumulative hack losses across 500+ protocols. Historical security incident analytics showing which protocols lost the most to exploits and breaches."
			canonicalUrl="/hacks/total-value-lost"
			pageName={pageName}
		>
			<TotalValueLostContainer {...props} />
		</Layout>
	)
}
