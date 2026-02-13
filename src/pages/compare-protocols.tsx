import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { CompareProtocols } from '~/containers/CompareProtocols'
import { getCompareProtocolsPageData } from '~/containers/CompareProtocols/queries'
import type { CompareProtocolsProps } from '~/containers/CompareProtocols/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('comparison', async () => {
	const data = await getCompareProtocolsPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Compare Protocols']

export default function CompareProtocolsPage({ protocols, protocolsList }: CompareProtocolsProps) {
	return (
		<Layout
			title={`Compare Protocols - DefiLlama`}
			description={`Compare protocols on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`compare protocols, compare protocols on blockchain`}
			canonicalUrl={`/compare-protocols`}
			pageName={pageName}
			metricFilters={tvlOptions}
		>
			<CompareProtocols protocols={protocols} protocolsList={protocolsList} />
		</Layout>
	)
}
