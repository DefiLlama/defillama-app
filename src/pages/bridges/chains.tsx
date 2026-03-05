import type { InferGetStaticPropsType } from 'next'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'
import { BridgeChainsOverview } from '~/containers/Bridges/BridgeChainsOverview'
import { getBridgeChainsPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridges/chains', async () => {
	const props = await getBridgeChainsPageData()

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Bridge Inflows', 'by', 'Chain']

export default function BridgeChains(props: InferGetStaticPropsType<typeof getStaticProps>) {
	if (!props.tableData || props.tableData.length === 0) {
		return (
			<TemporarilyDisabledPage
				title="Bridges Inflows by Chain - DefiLlama"
				description="This bridge chains page is temporarily unavailable and will be back shortly."
				canonicalUrl="/bridges/chains"
				heading="Bridge chains data temporarily unavailable"
			>
				<p>We could not load bridge chain table data right now.</p>
				<p>Please try again in a few minutes.</p>
			</TemporarilyDisabledPage>
		)
	}

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
