import { lazy, Suspense, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { maxAgeForNext } from '~/api'
import { LocalLoader } from '~/components/Loaders'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { BAR_CHARTS, ChainChartLabels, chainCharts } from '~/containers/ChainOverview/constants'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { useFetchChainChartData } from '~/containers/ChainOverview/useFetchChainChartData'
import { DEFI_SETTINGS } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { withPerformanceLogging } from '~/utils/perf'

const ChainChart: any = lazy(() => import('~/containers/ChainOverview/Chart'))

const groupByOptions = ['daily', 'weekly', 'monthly', 'cumulative']

export const getStaticProps = withPerformanceLogging(
	'chart/chain/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		if (typeof chain !== 'string') {
			return { notFound: true }
		}

		const data = await getChainOverviewData({ chain })

		if (!data) {
			return { notFound: true }
		}

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function ChainChartPage(props) {
	const router = useRouter()
	const selectedChain = props.metadata.name
	const queryParamsString = useMemo(() => {
		const { tvl, ...rest } = router.query ?? {}
		return JSON.stringify(
			router.query
				? tvl === 'true'
					? rest
					: router.query
				: props.metadata.id !== 'all'
					? { chain: [props.metadata.id] }
					: {}
		)
	}, [router.query, props.metadata.id])

	const { toggledCharts, chainGeckoId, groupBy, denomination, tvlSettings, isThemeDark } = useMemo(() => {
		const queryParams = JSON.parse(queryParamsString)

		let chainGeckoId = null

		if (selectedChain !== 'All') {
			let chainDenomination =
				props.chainTokenInfo?.gecko_id ?? chainCoingeckoIdsForGasNotMcap[selectedChain]?.geckoId ?? null

			chainGeckoId = chainDenomination ?? null
		}

		const tvlSettings = {}

		for (const setting in DEFI_SETTINGS) {
			tvlSettings[DEFI_SETTINGS[setting]] = queryParams[`include_${DEFI_SETTINGS[setting]}_in_tvl`]
		}

		const toggledCharts = props.charts.filter((tchart, index) =>
			index === 0 ? queryParams[chainCharts[tchart]] !== 'false' : queryParams[chainCharts[tchart]] === 'true'
		) as ChainChartLabels[]

		const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

		const groupBy =
			hasAtleasOneBarChart && queryParams?.groupBy
				? groupByOptions.includes(queryParams.groupBy as any)
					? (queryParams.groupBy as any)
					: 'daily'
				: 'daily'

		const denomination = typeof queryParams.currency === 'string' ? queryParams.currency : 'USD'

		const isThemeDark = queryParams.theme === 'dark' ? true : false

		return {
			chainGeckoId,
			toggledCharts,
			groupBy,
			denomination,
			tvlSettings,
			isThemeDark
		}
	}, [queryParamsString])

	const { finalCharts, valueSymbol, isFetchingChartData } = useFetchChainChartData({
		denomination,
		selectedChain,
		tvlChart: props.tvlChart,
		extraTvlCharts: props.extraTvlChart,
		tvlSettings,
		chainGeckoId,
		toggledCharts,
		groupBy
	})

	const isClient = useIsClient()

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
				<div className="col-span-full m-auto flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			) : (
				<Suspense fallback={<div className="col-span-full m-auto flex min-h-[360px] items-center justify-center" />}>
					<ChainChart chartData={finalCharts} valueSymbol={valueSymbol} isThemeDark={isThemeDark} groupBy={groupBy} />
				</Suspense>
			)}
		</>
	)
}
