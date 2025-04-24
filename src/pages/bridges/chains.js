import Layout from '~/layout'
import { BridgeChainsOverview } from '~/containers/Bridges/BridgeChainsOverview'
import { maxAgeForNext } from '~/api'
import { getBridgeChainsPageData } from '~/containers/Bridges/queries.server'
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

export default function BridgeChains(props) {
	return (
		<Layout title={`Bridges - DefiLlama`} defaultSEO>
			<BridgeChainsOverview {...props} />
		</Layout>
	)
}
