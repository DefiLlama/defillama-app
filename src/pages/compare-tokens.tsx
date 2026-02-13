import { maxAgeForNext } from '~/api'
import type { IResponseCGMarketsAPI } from '~/api/types'
import { CompareTokens } from '~/containers/CompareTokens'
import { getCompareTokensPageData } from '~/containers/CompareTokens/queries'
import type { Protocol } from '~/containers/CompareTokens/types'
import Layout from '~/layout'
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
	protocols: Protocol[]
}) {
	return (
		<Layout
			title={`Compare Tokens - DefiLlama`}
			description={`Compare tokens with price, fdv, volume and other metrics on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`compare tokens, compare tokens on blockchain`}
			canonicalUrl={`/compare-tokens`}
		>
			<CompareTokens coinsData={coinsData} protocols={protocols} />
		</Layout>
	)
}
