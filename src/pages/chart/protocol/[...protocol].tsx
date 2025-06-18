import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'
import { useFetchProtocolInfows } from '~/api/categories/protocols/client'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { ProtocolChartOnly } from '~/containers/ProtocolOverview/Chart/ProtocolChart'
import { useFetchAndFormatChartData } from '~/containers/ProtocolOverview/Chart/useFetchAndFormatChartData'
import { DEFI_SETTINGS } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import { slug } from '~/utils'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'chart/protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)?.[1]

		if (!metadata) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		const data = await getProtocolData(protocol, protocolData as any, true, metadata)
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
	nftVolumeData,
	chartColors
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
		holdersRevenue,
		incentives,
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
		optionsPremiumVolume,
		optionsNotionalVolume,
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
			holdersRevenue,
			incentives,
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
			optionsPremiumVolume,
			optionsNotionalVolume,
			perpsAggregators,
			bridgeAggregators,
			incentivesData: null
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

	const finalChartColors = useMemo(() => {
		if (!chartsUnique.includes('TVL')) {
			return { ...chartColors, [chartsUnique[0]]: '#335cd7' }
		}
		return { ...chartColors, TVL: '#335cd7' }
	}, [chartColors, chartsUnique])

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
			chartColors={finalChartColors}
			bobo={false}
			unlockTokenSymbol={unlockTokenSymbol}
			isThemeDark={isThemeDark}
			groupBy={groupBy}
		/>
	)
}
