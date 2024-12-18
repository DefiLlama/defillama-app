import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { getProtocol } from '~/api/categories/protocols'
import { useFetchProtocolInfows } from '~/api/categories/protocols/client'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { ProtocolChartOnly } from '~/components/ECharts/ProtocolChart/ProtocolChart'
import { useFetchAndFormatChartData } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { DEFI_SETTINGS } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const protocolData = await getProtocol(protocol)

		const data = await getProtocolData(protocol, protocolData, true)
		data.props.noContext = true
		return data
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function ProtocolChart({
	protocolData,
	protocol,
	users,
	governanceApis,
	chartDenominations = [],
	twitterHandle,
	nftVolumeData
}) {
	const router = useRouter()

	const {
		denomination,
		groupBy,
		tvl,
		mcap,
		tokenPrice,
		fdv,
		volume,
		perpsVolume,
		fees,
		revenue,
		unlocks,
		activeAddresses,
		newAddresses,
		events,
		transactions,
		gasUsed,
		staking,
		borrowed,
		medianApy,
		governance,
		treasury,
		bridgeVolume,
		tokenVolume,
		tokenLiquidity,
		usdInflows: usdInflowsParam,
		twitter,
		devMetrics,
		contributersMetrics,
		contributersCommits,
		devCommits,
		nftVolume,
		aggregators,
		premiumVolume,
		perpsAggregators,
		bridgeAggregators
	} = router.query

	const extraTvlsEnabled = {}

	for (const setting in DEFI_SETTINGS) {
		extraTvlsEnabled[DEFI_SETTINGS[setting]] = router.query[`include_${DEFI_SETTINGS[setting]}_in_tvl`]
	}

	const { data, isLoading: loading } = useFetchProtocolInfows(
		usdInflowsParam === 'true' ? protocol : null,
		extraTvlsEnabled
	)
	const { usdInflows } = data || {}

	const { fetchingTypes, isLoading, chartData, chartsUnique, unlockTokenSymbol, valueSymbol } =
		useFetchAndFormatChartData({
			isRouterReady: router.isReady,
			denomination,
			groupBy,
			tvl,
			mcap,
			tokenPrice,
			fdv,
			volume,
			perpsVolume,
			fees,
			revenue,
			unlocks,
			activeAddresses,
			newAddresses,
			events,
			transactions,
			gasUsed,
			staking,
			borrowed,
			medianApy,
			usdInflows: usdInflowsParam,
			governance,
			treasury,
			bridgeVolume,
			tokenVolume,
			tokenLiquidity,
			protocol,
			chartDenominations,
			geckoId: protocolData.gecko_id,
			metrics: protocolData.metrics,
			activeUsersId: users ? protocolData.id : null,
			governanceApis,
			protocolId: protocolData.id,
			historicalChainTvls: protocolData.historicalChainTvls,
			extraTvlEnabled: extraTvlsEnabled,
			isHourlyChart: protocolData.isHourlyChart,
			usdInflowsData: usdInflowsParam === 'true' && !loading && usdInflows?.length > 0 ? usdInflows : null,
			twitter,
			twitterHandle,
			devMetrics,
			contributersMetrics,
			contributersCommits,
			devCommits,
			nftVolume,
			nftVolumeData,
			aggregators,
			premiumVolume,
			perpsAggregators,
			bridgeAggregators
		})
	const isThemeDark = router.query.theme === 'dark' ? true : false

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
		<ProtocolChartOnly
			isRouterReady={router.isReady}
			isLoading={isLoading}
			fetchingTypes={fetchingTypes}
			chartData={chartData}
			color={'#335cd7'}
			valueSymbol={valueSymbol}
			chartsUnique={chartsUnique}
			events={events}
			hallmarks={events === 'true' ? protocolData.hallmarks : null}
			chartColors={chartColors}
			bobo={false}
			unlockTokenSymbol={unlockTokenSymbol}
			isThemeDark={isThemeDark}
			isMonthly={groupBy === 'monthly'}
		/>
	)
}

const chartColors = { TVL: '#335cd7' }
