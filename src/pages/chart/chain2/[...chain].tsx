import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { getChainPageData } from '~/api/categories/chains'
import LocalLoader from '~/components/LocalLoader'
import { chainCoingeckoIds, chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { useFetchChainChartData } from '~/containers/ChainContainer/useFetchChainChartData'
import { DEFI_SETTINGS } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

export const getStaticProps = withPerformanceLogging(
	'chain/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const data = await getChainPageData(chain === 'All' ? null : chain)

		return data
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function ChainChartPage({
	chain,
	chart,
	extraTvlCharts = {},
	raisesChart,
	volumeData,
	feesAndRevenueData,
	stablecoinsData,
	inflowsData,
	userData
}) {
	// const router = useRouter()
	// const selectedChain = chain ?? 'All'

	// const { denomination, theme } = router.query

	// const extraTvlsEnabled = {}

	// for (const setting in DEFI_SETTINGS) {
	// 	extraTvlsEnabled[DEFI_SETTINGS[setting]] = router.query[`include_${DEFI_SETTINGS[setting]}_in_tvl`]
	// }

	// let chainGeckoId = null

	// if (selectedChain !== 'All') {
	// 	let chainDenomination = chainCoingeckoIds[selectedChain] ?? chainCoingeckoIdsForGasNotMcap[selectedChain] ?? null

	// 	chainGeckoId = chainDenomination?.geckoId ?? null
	// }

	// const { chartDatasets, isFetchingChartData } = useFetchChainChartData({
	// 	denomination: typeof denomination === 'string' ? denomination : 'USD',
	// 	selectedChain,
	// 	chainGeckoId,
	// 	volumeData,
	// 	feesAndRevenueData,
	// 	stablecoinsData,
	// 	inflowsData,
	// 	userData,
	// 	raisesChart,
	// 	chart,
	// 	extraTvlCharts,
	// 	extraTvlsEnabled
	// })

	// const isThemeDark = theme === 'dark' ? true : false

	return (
		<>
			{/* {isFetchingChartData ? (
				<LocalLoader style={{ margin: 'auto', height: '360px' }} />
			) : (
				router.isReady && (
					<ChainChart
						datasets={chartDatasets}
						title=""
						denomination={denomination}
						isThemeDark={isThemeDark}
						hideTooltip
					/>
				)
			)} */}
		</>
	)
}
