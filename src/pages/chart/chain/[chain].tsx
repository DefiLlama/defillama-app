import type { GetStaticPropsContext } from 'next'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useMemo } from 'react'
import { DWMC_GROUPING_OPTIONS_LOWERCASE, type LowercaseDwmcGrouping } from '~/components/ECharts/ChartGroupingSelector'
import { LocalLoader } from '~/components/Loaders'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { BAR_CHARTS, type ChainChartLabels, chainCharts } from '~/containers/ChainOverview/constants'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { useFetchChainChartData } from '~/containers/ChainOverview/useFetchChainChartData'
import { TVL_SETTINGS } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks/useIsClient'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const ChainCoreChart: any = lazy(() => import('~/containers/ChainOverview/Chart'))

const normalizeChartInterval = (value: string | null | undefined): LowercaseDwmcGrouping | null => {
	const normalizedValue = value?.toLowerCase() ?? null
	if (DWMC_GROUPING_OPTIONS_LOWERCASE.some((option) => option.value === normalizedValue)) {
		return normalizedValue as LowercaseDwmcGrouping
	}
	return null
}
export const getStaticProps = withPerformanceLogging(
	'chart/chain/[chain]',
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = !params.chain || params.chain === 'all' ? 'All' : params.chain
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		if (chain !== 'All' && !metadataCache.chainMetadata[slug(chain)]) {
			return { notFound: true }
		}

		const data = await getChainOverviewData({
			chain: chain,
			chainMetadata: metadataCache.chainMetadata,
			protocolMetadata: metadataCache.protocolMetadata,
			categoriesAndTagsMetadata: metadataCache.categoriesAndTags
		})

		if (!data) {
			throw new Error(`Missing page data for route=/chart/chain/[chain] chain=${chain}`)
		}

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths = () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

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
					? { chain: props.metadata.id }
					: {}
		)
	}, [router.query, props.metadata.id])

	const { toggledCharts, chainGeckoId, gasUsedSymbol, groupBy, denomination, tvlSettings, isThemeDark } =
		useMemo(() => {
			const queryParams = JSON.parse(queryParamsString)

			let chainGeckoId = null
			let gasUsedSymbol = null

			if (selectedChain !== 'All') {
				const gasToken = chainCoingeckoIdsForGasNotMcap[selectedChain]
				let chainDenomination = props.chainTokenInfo?.gecko_id ?? gasToken?.geckoId ?? null

				chainGeckoId = chainDenomination ?? null
				gasUsedSymbol = gasToken?.symbol ?? props.chainTokenInfo?.token_symbol ?? null
			}

			const tvlSettings = {}

			for (const setting in TVL_SETTINGS) {
				tvlSettings[TVL_SETTINGS[setting]] = queryParams[`include_${TVL_SETTINGS[setting]}_in_tvl`]
			}

			const toggledCharts = props.charts.filter((tchart, index) =>
				index === 0 ? queryParams[chainCharts[tchart]] !== 'false' : queryParams[chainCharts[tchart]] === 'true'
			) as ChainChartLabels[]

			const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

			const groupBy =
				hasAtleasOneBarChart && queryParams?.groupBy
					? (normalizeChartInterval(queryParams.groupBy) ?? 'daily')
					: 'daily'

			const denomination = typeof queryParams.currency === 'string' ? queryParams.currency : 'USD'

			const isThemeDark = queryParams.theme === 'dark'

			return {
				chainGeckoId,
				gasUsedSymbol,
				toggledCharts,
				groupBy,
				denomination,
				tvlSettings,
				isThemeDark
			}
		}, [
			queryParamsString,
			props.charts,
			props.chainTokenInfo?.gecko_id,
			props.chainTokenInfo?.token_symbol,
			selectedChain
		])

	const { finalCharts, valueSymbol, isFetchingChartData } = useFetchChainChartData({
		denomination,
		selectedChain,
		tvlChart: props.tvlChart,
		tvlChartSummary: props.tvlChartSummary,
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
		<div className="col-span-full flex min-h-[360px] flex-col">
			{isFetchingChartData || !router.isReady || !isClient ? (
				<div className="flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			) : (
				<Suspense fallback={<div className="flex min-h-[360px] items-center justify-center" />}>
					<ChainCoreChart
						chartData={finalCharts}
						valueSymbol={valueSymbol}
						gasUsedValueSymbol={gasUsedSymbol ?? valueSymbol}
						isThemeDark={isThemeDark}
						groupBy={groupBy}
					/>
				</Suspense>
			)}
		</div>
	)
}
