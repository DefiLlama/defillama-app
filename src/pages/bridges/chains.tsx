import { maxAgeForNext } from '~/api'
import { BridgeChainsOverview } from '~/containers/Bridges/BridgeChainsOverview'
import { getBridgeChainsPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridges/chains', async () => {
	const props = await getBridgeChainsPageData()

	if (!props.tableData || props.tableData?.length === 0) {
		// TODO: Remove
		throw new Error('getBridgeChainsPageData() broken')
	}
	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Bridge Inflows', 'by', 'Chain']

export default function BridgeChains(props) {
	return (
		<Layout
			title={`Bridges Inflows by Chain - DefiLlama`}
			description={`Track bridges inflows by Chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`bridges inflows by chain, bridge inflows`}
			canonicalUrl={`/bridges/chains`}
			pageName={pageName}
		>
			<BridgeChainsOverview {...props} />
		</Layout>
	)
}
