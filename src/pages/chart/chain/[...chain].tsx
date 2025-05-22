import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { getChainPageData } from '~/api/categories/chains'
import { LocalLoader } from '~/components/LocalLoader'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { useFetchChainChartData } from '~/containers/ChainOverview/useFetchChainChartData'
import { DEFI_SETTINGS } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { slug } from '~/utils'
const { chainMetadata } = metadata

const ChainChart: any = dynamic(() => import('~/containers/ChainOverview/Chart').then((m) => m.ChainChart), {
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
		const cmetadata = chainMetadata[slug(selectedChain)]
		let chainDenomination = cmetadata?.gecko_id ?? chainCoingeckoIdsForGasNotMcap[selectedChain]?.geckoId ?? null

		chainGeckoId = chainDenomination ?? null
	}

	const { chartDatasets, isFetchingChartData } = useFetchChainChartData({
		denomination: typeof denomination === 'string' ? denomination : 'USD',
		selectedChain,
		chainGeckoId,
		dexsData: { total24h: volumeData?.totalVolume24h },
		feesData: { total24h: feesAndRevenueData?.totalFees24h },
		revenueData: { total24h: feesAndRevenueData?.totalRevenue24h },
		appRevenueData: { total24h: feesAndRevenueData?.totalAppRevenue24h },
		stablecoinsData: { stablecoinsData: stablecoinsData?.totalMcapCurrent },
		inflowsData,
		userData,
		raisesChart,
		chart,
		extraTvlCharts,
		extraTvlsEnabled,
		devMetricsData,
		perpsData: { total24h: perpsData.totalVolume24h },
		chainAssets
	})
	const isClient = useIsClient()

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
			{isFetchingChartData || !router.isReady || !isClient ? (
				<div className="flex items-center justify-center m-auto min-h-[360px]">
					<LocalLoader />
				</div>
			) : (
				<ChainChart datasets={chartDatasets} title="" denomination={denomination} isThemeDark={isThemeDark} />
			)}
		</>
	)
}
