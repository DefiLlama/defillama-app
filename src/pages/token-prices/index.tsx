import { maxAgeForNext } from '~/api'
import { getProtocolsTokenPricesByChain } from '~/containers/ProtocolTokenPrices/queries'
import { TokenPricesByChain } from '~/containers/ProtocolTokenPrices/TokenPricesByChain'
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
			<TokenPricesByChain {...props} />
		</Layout>
	)
}
