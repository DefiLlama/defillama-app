import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { getChainPageData } from '~/api/categories/chains'
import { LocalLoader } from '~/components/LocalLoader'
import { chainCoingeckoIds, chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { useFetchChainChartData } from '~/containers/ChainContainer/useFetchChainChartData'
import { DEFI_SETTINGS } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

export const getStaticProps = withPerformanceLogging(
	'chart/chain/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const data = await getChainPageData(chain === 'All' ? null : chain)
		data.props.noContext = true
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
	userData,
	devMetricsData,
	perpsData,
	chainAssets
}) {
	const router = useRouter()
	const selectedChain = chain ?? 'All'

	const { denomination, theme } = router.query

	const extraTvlsEnabled = {}

	for (const setting in DEFI_SETTINGS) {
		extraTvlsEnabled[DEFI_SETTINGS[setting]] = router.query[`include_${DEFI_SETTINGS[setting]}_in_tvl`]
	}

	let chainGeckoId = null

	if (selectedChain !== 'All') {
		let chainDenomination = chainCoingeckoIds[selectedChain] ?? chainCoingeckoIdsForGasNotMcap[selectedChain] ?? null

		chainGeckoId = chainDenomination?.geckoId ?? null
	}

	const { chartDatasets, isFetchingChartData } = useFetchChainChartData({
		denomination: typeof denomination === 'string' ? denomination : 'USD',
		selectedChain,
		chainGeckoId,
		volumeData,
		feesAndRevenueData,
		stablecoinsData,
		inflowsData,
		userData,
		raisesChart,
		chart,
		extraTvlCharts,
		extraTvlsEnabled,
		devMetricsData,
		perpsData,
		chainAssets
	})

	const isThemeDark = theme === 'dark' ? true : false

	useEffect(() => {
		if (!isThemeDark) {
			document.documentElement.classList.remove('dark')
		} else {
			document.documentElement.classList.add('dark')
		}

		const root = document.getElementById('__next')
		if (root) {
			root.setAttribute('style', 'flex-direction: column')
		}
	}, [isThemeDark])

	return (
		<>
			{isFetchingChartData || !router.isReady ? (
				<div className="flex items-center justify-center m-auto min-h-[360px]">
					<LocalLoader />
				</div>
			) : (
				<ChainChart datasets={chartDatasets} title="" denomination={denomination} isThemeDark={isThemeDark} />
			)}
		</>
	)
}
