import { maxAgeForNext } from '~/api'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { stablecoinBackingOptions, stablecoinPegTypeOptions } from '~/containers/Stablecoins/Filters'
import { getPeggedAssets, getPeggedOverviewPageData } from '~/containers/Stablecoins/queries.server'
import { StablecoinsByChain } from '~/containers/Stablecoins/StablecoinsByChain'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('stablecoins/[chain]', async ({ params }) => {
	if (!params?.chain) {
		return { notFound: true, props: null }
	}

	const chain = params.chain
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const metadata = metadataCache.chainMetadata[slug(chain)]

	if (!metadata?.stablecoins) {
		return {
			notFound: true
		}
	}

	const props = await getPeggedOverviewPageData(metadata.name)

	if (!props.filteredPeggedAssets || props.filteredPeggedAssets?.length === 0) {
		throw new Error(`[getStaticProps] [${metadata.name}] no filteredPeggedAssets`)
	}

	const availableBackings = stablecoinBackingOptions
		.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
		.map((opt) => opt.key)

	const availablePegTypes = stablecoinPegTypeOptions
		.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
		.map((opt) => opt.key)

	const { questions: entityQuestions } = await fetchEntityQuestions(slug(chain), 'chain', { subPage: 'stablecoins' })

	return {
		props: { ...props, availableBackings, availablePegTypes, entityQuestions },
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const { chains } = await getPeggedAssets()

	const paths = chains.slice(0, 20).map((chain) => ({
		params: { chain: slug(chain.name) }
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
	chain,
	availableBackings,
	availablePegTypes,
	entityQuestions
}) {
	return (
		<Layout
			title={`Stablecoins Circulating on ${chain} - DefiLlama`}
			description={`Stablecoins Circulating on ${chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${chain} stablecoins circulating on ${chain}, stablecoins supply on ${chain}, stablecoins market cap on ${chain}, stablecoins price on ${chain}, stablecoins percent off peg on ${chain}`.toLowerCase()}
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
				availableBackings={availableBackings}
				availablePegTypes={availablePegTypes}
				entityQuestions={entityQuestions}
			/>
		</Layout>
	)
}
