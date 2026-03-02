import type { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { stablecoinBackingOptions, stablecoinPegTypeOptions } from '~/containers/Stablecoins/Filters'
import { getStablecoinsByChainPageData } from '~/containers/Stablecoins/queries.server'
import { StablecoinsByChain } from '~/containers/Stablecoins/StablecoinsByChain'
import type { PeggedOverviewPageData } from '~/containers/Stablecoins/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinsByChainRouteParams = {
	chain: string
}

type StablecoinsByChainPageProps = PeggedOverviewPageData & {
	availableBackings: string[]
	availablePegTypes: string[]
	entityQuestions?: string[]
}

export const getStaticProps = withPerformanceLogging<StablecoinsByChainPageProps>(
	'stablecoins/[chain]',
	async ({ params }: GetStaticPropsContext<StablecoinsByChainRouteParams>) => {
		const chain = params?.chain
		if (typeof chain !== 'string') {
			return { notFound: true }
		}

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const metadata = metadataCache.chainMetadata[slug(chain)]

		if (!metadata?.stablecoins) {
			return { notFound: true }
		}

		const props = await getStablecoinsByChainPageData(metadata.name)
		if (!props.filteredPeggedAssets || props.filteredPeggedAssets.length === 0) {
			throw new Error(`[getStaticProps] [${metadata.name}] no filteredPeggedAssets`)
		}

		const availableBackings = stablecoinBackingOptions
			.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
			.map((opt) => opt.key)

		const availablePegTypes = stablecoinPegTypeOptions
			.filter((opt) => props.filteredPeggedAssets.some((asset) => opt.filterFn(asset)))
			.map((opt) => opt.key)

		const stablecoinsContext = {
			subPage: 'stablecoins',
			totalCount: props.filteredPeggedAssets.length,
			totalMcap: props.filteredPeggedAssets.reduce((sum, s) => sum + (s.mcap || 0), 0),
			topStablecoins: props.filteredPeggedAssets.slice(0, 15).map((s) => {
				const symbol = typeof s.symbol === 'string' ? s.symbol : null
				const change7d = typeof s.change_7d === 'number' ? s.change_7d : null
				const pegType = typeof s.pegType === 'string' ? s.pegType : null
				const pegMechanism = typeof s.pegMechanism === 'string' ? s.pegMechanism : null
				const pegDeviation = typeof s.pegDeviation === 'number' ? s.pegDeviation : null
				const chains = Array.isArray(s.chains) ? s.chains.length : null

				return {
					name: s.name,
					symbol,
					mcap: s.mcap ?? null,
					change_7d: change7d,
					pegType,
					pegMechanism,
					pegDeviation,
					chains
				}
			})
		}
		const { questions: entityQuestions } = await fetchEntityQuestions(slug(chain), 'chain', stablecoinsContext)

		return {
			props: { ...props, availableBackings, availablePegTypes, entityQuestions },
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths: GetStaticPaths<StablecoinsByChainRouteParams> = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const { chains } = await fetchStablecoinAssetsApi()

	const paths = chains.slice(0, 20).map((chain) => ({
		params: { chain: slug(chain.name) }
	}))

	return { paths: paths.slice(0, 11), fallback: 'blocking' }
}

const pageName = ['Stablecoins', 'by', 'Market Cap']

export default function StablecoinsByChainPage({
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
}: InferGetStaticPropsType<typeof getStaticProps>) {
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
