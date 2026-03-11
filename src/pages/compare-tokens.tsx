import type { IResponseCGMarketsAPI } from '~/api/types'
import { CompareTokens } from '~/containers/CompareTokens'
import { getCompareTokensPageData } from '~/containers/CompareTokens/queries'
import type { CompareTokenProtocol } from '~/containers/CompareTokens/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('compare-tokens', async () => {
	const data = await getCompareTokensPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function Compare({
	coinsData,
	protocols
}: {
	coinsData: Array<IResponseCGMarketsAPI & { label: string; value: string }>
	protocols: CompareTokenProtocol[]
}) {
	return (
		<Layout
			title="Compare Crypto Tokens - Price, FDV & Market Data - DefiLlama"
			description="Compare crypto tokens side-by-side with price, FDV, volume, and other metrics on DefiLlama."
			canonicalUrl={`/compare-tokens`}
		>
			<CompareTokens coinsData={coinsData} protocols={protocols} />
		</Layout>
	)
}
