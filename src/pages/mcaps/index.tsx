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

const pageName = ['Protocols', 'ranked by', 'Market Cap']

export default function ProtocolsMarketCaps(props) {
	return (
		<Layout
			title="Market Caps - DefiLlama"
			description={`Market Caps by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`market caps, defi market caps`}
			canonicalUrl={`/mcaps`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
