import { maxAgeForNext } from '~/api'
import { getTotalValueLostInHacksByProtocol } from '~/containers/Hacks/queries'
import { TotalValueLostContainer } from '~/containers/Hacks/TotalValueLost'
import type { IProtocolTotalValueLostInHacksByProtocol } from '~/containers/Hacks/types'
import Layout from '~/layout'
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
			title="Total Value Lost in Hacks - DefiLlama"
			description="Total Value Lost in Hacks by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="total value lost in hacks, defi total value lost in hacks, net user loss"
			canonicalUrl="/hacks/total-value-lost"
			pageName={pageName}
		>
			<TotalValueLostContainer {...props} />
		</Layout>
	)
}
