import type { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { stablecoinBackingOptions, stablecoinPegTypeOptions } from '~/containers/Stablecoins/Filters'
import { getStablecoinsByChainPageData } from '~/containers/Stablecoins/queries.server'
import { StablecoinsByChain } from '~/containers/Stablecoins/StablecoinsByChain'
import type { PeggedOverviewPageData } from '~/containers/Stablecoins/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinsByChainRouteParams = {
	chain: string
}

type StablecoinsByChainPageProps = PeggedOverviewPageData & {
	availableBackings: string[]
	availablePegTypes: string[]
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

		return {
			props: { ...props, availableBackings, availablePegTypes },
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths: GetStaticPaths<StablecoinsByChainRouteParams> = async () => {
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
	availablePegTypes
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
			/>
		</Layout>
	)
}
