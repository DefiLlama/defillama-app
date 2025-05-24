import Layout from '~/layout'
import PeggedList from '~/containers/Stablecoins/StablecoinsByChain'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getPeggedAssets, getPeggedOverviewPageData } from '~/containers/Stablecoins/queries.server'
import { primaryColor } from '~/constants/colors'
import { peggedAssetIconPalleteUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import metadataCache from '~/utils/metadata'
import { slug } from '~/utils'

export const getStaticProps = withPerformanceLogging(
	'stablecoins/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const metadata = metadataCache.chainMetadata[slug(chain)]

		if (!metadata)
			return {
				notFound: true
			}

		const props = await getPeggedOverviewPageData(metadata.name)

		if (!props.filteredPeggedAssets || props.filteredPeggedAssets?.length === 0) {
			return {
				notFound: true
			}
		}

		const name = props.filteredPeggedAssets[0]?.name

		const backgroundColor = name ? await getColor(peggedAssetIconPalleteUrl(name)) : primaryColor

		return {
			props: {
				...props,
				backgroundColor
			},
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

export default function PeggedAssets({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	doublecountedIds,
	chain,
	backgroundColor
}) {
	return (
		<Layout title={`Stablecoins Circulating - DefiLlama`} defaultSEO>
			<PeggedList
				chains={chains}
				selectedChain={chain}
				filteredPeggedAssets={filteredPeggedAssets}
				peggedAssetNames={peggedAssetNames}
				peggedNameToChartDataIndex={peggedNameToChartDataIndex}
				chartDataByPeggedAsset={chartDataByPeggedAsset}
				doublecountedIds={doublecountedIds}
				backgroundColor={backgroundColor}
			/>
		</Layout>
	)
}
