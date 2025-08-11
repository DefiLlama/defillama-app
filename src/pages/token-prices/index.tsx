import { maxAgeForNext } from '~/api'
import { ProtocolsWithTokens } from '~/containers/ProtocolsWithTokens'
import { getProtocolsTokenPricesByChain } from '~/containers/ProtocolsWithTokens/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-token-prices/index`, async () => {
	const data = await getProtocolsTokenPricesByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function ProtocolsTokenPrices(props) {
	return (
		<Layout title="Token Prices - DefiLlama">
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
