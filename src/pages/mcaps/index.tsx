import { maxAgeForNext } from '~/api'
import { McapsByChain } from '~/containers/ProtocolMcaps/McapsByChain'
import { getProtocolsMarketCapsByChain } from '~/containers/ProtocolMcaps/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-market-caps/index`, async () => {
	const data = await getProtocolsMarketCapsByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function ProtocolsMarketCaps(props) {
	return (
		<Layout title="Market Caps - DefiLlama">
			<McapsByChain {...props} />
		</Layout>
	)
}
