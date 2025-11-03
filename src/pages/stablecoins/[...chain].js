import { maxAgeForNext } from '~/api'
import { getPeggedAssets, getPeggedOverviewPageData } from '~/containers/Stablecoins/queries.server'
import { StablecoinsByChain } from '~/containers/Stablecoins/StablecoinsByChain'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'stablecoins/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		const metadata = metadataCache.chainMetadata[slug(chain)]

		if (!metadata?.stablecoins) {
			return {
				notFound: true
			}
		}

		const props = await getPeggedOverviewPageData(metadata.name)

		if (!props.filteredPeggedAssets || props.filteredPeggedAssets?.length === 0) {
			return {
				notFound: true
			}
		}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const { chains } = await getPeggedAssets()

	const paths = chains.slice(0, 20).map((chain) => ({
		params: { chain: [slug(chain.name)] }
	}))

	return { paths: paths.slice(0, 11), fallback: 'blocking' }
}

const pageName = ['Stablecoins', 'by', 'Market Cap']

export default function PeggedAssets({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	doublecountedIds,
	chain
}) {
	return (
		<Layout
			title={`Stablecoins Circulating on ${chain} - DefiLlama`}
			description={`Stablecoins Circulating on ${chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`stablecoins circulating on ${chain}, stablecoins supply on ${chain}, stablecoins market cap on ${chain}, stablecoins price on ${chain}, stablecoins percent off peg on ${chain}`.toLowerCase()}
			canonicalUrl={`/stablecoins/${chain}`}
			pageName={pageName}
		>
			<StablecoinsByChain
				chains={chains}
				selectedChain={chain}
				filteredPeggedAssets={filteredPeggedAssets}
				peggedAssetNames={peggedAssetNames}
				peggedNameToChartDataIndex={peggedNameToChartDataIndex}
				chartDataByPeggedAsset={chartDataByPeggedAsset}
				doublecountedIds={doublecountedIds}
			/>
		</Layout>
	)
}
