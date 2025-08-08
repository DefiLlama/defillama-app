import { maxAgeForNext } from '~/api'
import { ProtocolsWithTokens } from '~/containers/ProtocolsWithTokens'
import { getProtocolsMarketCapsByChain } from '~/containers/ProtocolsWithTokens/queries'
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
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
