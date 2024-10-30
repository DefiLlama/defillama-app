import Layout from '~/layout'
import PeggedList from '~/containers/PeggedPage/PeggedList'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getPeggedAssets, getPeggedOverviewPageData } from '~/api/categories/stablecoins'
import { primaryColor } from '~/constants/colors'
import { peggedAssetIconPalleteUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'stablecoins/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const props = await getPeggedOverviewPageData(chain)

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
		params: { chain: [chain.name] }
	}))

	return { paths: paths.slice(0, 11), fallback: 'blocking' }
}

export default function PeggedAssets({
	chains,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
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
				backgroundColor={backgroundColor}
			/>
		</Layout>
	)
}
