import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'
import { DEFI_SETTINGS, FEES_SETTINGS } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import { slug } from '~/utils'
import { IProtocolOverviewPageData, IToggledMetrics } from '~/containers/ProtocolOverview/types'
import { maxAgeForNext } from '~/api'
import dynamic from 'next/dynamic'
import { useFetchAndFormatChartData } from '~/containers/ProtocolOverview/Chart/ProtocolChartNew'
import { BAR_CHARTS, protocolCharts } from '~/containers/ProtocolOverview/Chart/constants'
const { protocolMetadata } = metadata

const ProtocolLineBarChart = dynamic(() => import('~/containers/ProtocolOverview/Chart/Chart2'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<any>

const groupByOptions = ['daily', 'weekly', 'monthly', 'cumulative'] as const

export const getStaticProps = withPerformanceLogging(
	'chart/protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)

		if (!metadata) {
			return { notFound: true, props: null }
		}

		const data = await getProtocolOverviewPageData({
			protocolId: metadata[0],
			metadata: metadata[1]
		})

		if (!data) {
			return { notFound: true, props: null }
		}

		return { props: data, revalidate: maxAgeForNext([22]) }
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function ProtocolChart(props: IProtocolOverviewPageData) {
	const router = useRouter()

	const queryParamsString = useMemo(() => {
		return JSON.stringify(router.query ?? {})
	}, [router.query])

	const { toggledMetrics, groupBy, tvlSettings, feesSettings } = useMemo(() => {
		const queryParams = JSON.parse(queryParamsString)
		const chartsByStaus = {}
		for (const pchart in protocolCharts) {
			const chartKey = protocolCharts[pchart]
			chartsByStaus[chartKey] = queryParams[chartKey] === 'true' ? 'true' : 'false'
		}
		const toggled = {
			...chartsByStaus,
			...((!props.metrics.tvl
				? props.metrics.dexs
					? { dexVolume: queryParams.dexVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perps
					? { perpVolume: queryParams.perpVolume === 'false' ? 'false' : 'true' }
					: props.metrics.options
					? {
							optionsPremiumVolume: queryParams.optionsPremiumVolume === 'false' ? 'false' : 'true',
							optionsNotionalVolume: queryParams.optionsNotionalVolume === 'false' ? 'false' : 'true'
					  }
					: props.metrics.dexAggregators
					? { dexAggregatorVolume: queryParams.dexAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridgeAggregators
					? { bridgeAggregatorVolume: queryParams.bridgeAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perpsAggregators
					? { perpAggregatorVolume: queryParams.perpAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridge
					? { bridgeVolume: queryParams.bridgeVolume === 'false' ? 'false' : 'true' }
					: props.metrics.fees
					? {
							fees: queryParams.fees === 'false' ? 'false' : 'true'
					  }
					: props.metrics.revenue
					? {
							revenue: queryParams.revenue === 'false' ? 'false' : 'true',
							holdersRevenue: queryParams.holdersRevenue === 'false' ? 'false' : 'true'
					  }
					: props.metrics.unlocks
					? { unlocks: queryParams.unlocks === 'false' ? 'false' : 'true' }
					: props.metrics.treasury
					? { treasury: queryParams.treasury === 'false' ? 'false' : 'true' }
					: {}
				: {}) as Record<string, 'true' | 'false'>)
		} as Record<typeof protocolCharts[keyof typeof protocolCharts], 'true' | 'false'>

		const toggledMetrics = {
			...toggled,
			tvl: queryParams.tvl === 'false' ? 'false' : 'true',
			events: queryParams.events === 'false' ? 'false' : 'true',
			denomination: typeof queryParams.denomination === 'string' ? queryParams.denomination : null
		} as IToggledMetrics

		const toggledCharts = props.availableCharts.filter((chart) => toggledMetrics[protocolCharts[chart]] === 'true')

		const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

		const tvlSettings = {}

		for (const setting in DEFI_SETTINGS) {
			tvlSettings[DEFI_SETTINGS[setting]] = queryParams[`include_${DEFI_SETTINGS[setting]}_in_tvl`]
		}

		const feesSettings = {}
		for (const setting in FEES_SETTINGS) {
			feesSettings[FEES_SETTINGS[setting]] = queryParams[`include_${FEES_SETTINGS[setting]}_in_fees`]
		}

		return {
			toggledMetrics,
			toggledCharts,
			hasAtleasOneBarChart,
			groupBy: hasAtleasOneBarChart
				? typeof queryParams.groupBy === 'string' && groupByOptions.includes(queryParams.groupBy as any)
					? (queryParams.groupBy as any)
					: 'daily'
				: 'daily',
			tvlSettings,
			feesSettings
		}
	}, [queryParamsString, props.availableCharts, props.metrics])

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

	const { finalCharts, valueSymbol, loadingCharts } = useFetchAndFormatChartData({
		...props,
		toggledMetrics,
		groupBy: groupBy,
		tvlSettings,
		feesSettings
	})

	return (
		<div className="flex flex-col min-h-[360px]">
			{loadingCharts ? (
				<p className="text-center text-xs my-auto min-h-[360px] flex flex-col items-center justify-center">
					fetching {loadingCharts}...
				</p>
			) : (
				<ProtocolLineBarChart
					chartData={finalCharts}
					chartColors={props.chartColors}
					isThemeDark={isThemeDark}
					valueSymbol={valueSymbol}
					groupBy={groupBy}
					hallmarks={toggledMetrics.events === 'true' ? props.hallmarks : null}
					unlockTokenSymbol={props.token.symbol}
				/>
			)}
		</div>
	)
}
