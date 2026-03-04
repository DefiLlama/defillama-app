import type { InferGetStaticPropsType } from 'next'
import { BridgeChainsOverview } from '~/containers/Bridges/BridgeChainsOverview'
import { getBridgeChainsPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
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

export default function BridgeChains(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`Bridges Inflows by Chain - DefiLlama`}
			description={`Bridge activity by chain, including net flow rankings, deposit and withdrawal data, top tokens, and multi-timeframe comparisons.`}
			canonicalUrl={`/bridges/chains`}
			pageName={pageName}
		>
			<BridgeChainsOverview {...props} />
		</Layout>
	)
}
