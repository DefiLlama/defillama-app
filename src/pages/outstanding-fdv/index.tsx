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
		<Layout
			title="Outstanding FDV - DefiLlama"
			description={`Outstanding FDV by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`outstanding fdv, defi outstanding fdv`}
			canonicalUrl={`/outstanding-fdv`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
