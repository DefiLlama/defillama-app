import { maxAgeForNext } from '~/api'
import { ProtocolsWithTokens } from '~/containers/ProtocolsWithTokens'
import { getProtocolsAdjustedFDVsByChain } from '~/containers/ProtocolsWithTokens/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`protocols-aFDV/index`, async () => {
	const data = await getProtocolsAdjustedFDVsByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Outstanding FDV']

export default function ProtocolsMarketCaps(props) {
	return (
		<Layout title="Outstanding FDV - DefiLlama" pageName={pageName}>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
