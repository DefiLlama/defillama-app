import type { GetStaticPropsContext } from 'next'
import { useRouter } from 'next/router'
import { type ComponentType, lazy, Suspense, useEffect, useMemo } from 'react'
import { DWMC_GROUPING_OPTIONS_LOWERCASE, type LowercaseDwmcGrouping } from '~/components/ECharts/ChartGroupingSelector'
import { LocalLoader } from '~/components/Loaders'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { BAR_CHARTS, protocolCharts } from '~/containers/ProtocolOverview/constants'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import type { IProtocolOverviewPageData, IToggledMetrics } from '~/containers/ProtocolOverview/types'
import { useFetchProtocolChartData } from '~/containers/ProtocolOverview/useFetchProtocolChartData'
import { TVL_SETTINGS, FEES_SETTINGS } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const ProtocolCoreChart = lazy(() => import('~/containers/ProtocolOverview/Chart')) as ComponentType<any>

const normalizeChartInterval = (value: string | null | undefined): LowercaseDwmcGrouping | null => {
	const normalizedValue = value?.toLowerCase() ?? null
	if (DWMC_GROUPING_OPTIONS_LOWERCASE.some((option) => option.value === normalizedValue)) {
		return normalizedValue as LowercaseDwmcGrouping
	}
	return null
}
export const getStaticProps = withPerformanceLogging(
	'chart/protocol/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true }
		}

		const protocol = params.protocol
		const normalizedName = slug(protocol)
		const metadataModule = await import('~/utils/metadata')
		const metadataCache = metadataModule.default
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata) {
			return { notFound: true }
		}

		const data = await getProtocolOverviewPageData({
			protocolId: metadata[0],
			currentProtocolMetadata: metadata[1],
			chainMetadata: metadataCache.chainMetadata,
			tokenlist: metadataCache.tokenlist,
			cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers
		})

		if (!data) {
			return { notFound: true }
		}

		return { props: data, revalidate: maxAgeForNext([22]) }
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

export default function ProtocolChartPage(props: IProtocolOverviewPageData) {
	const router = useRouter()

	const queryParamsString = useMemo(() => {
		const { tvl, ...rest } = router.query ?? {}
		return JSON.stringify(router.query ? (tvl === 'true' ? rest : router.query) : { protocol: slug(props.name) })
	}, [router.query, props.name])

	const { toggledMetrics, groupBy, tvlSettings, feesSettings } = useMemo(() => {
		const queryParams = JSON.parse(queryParamsString)
		const chartsByVisibility = {}
		for (const chartLabel in protocolCharts) {
			const chartKey = protocolCharts[chartLabel]
			chartsByVisibility[chartKey] = queryParams[chartKey] === 'true' ? 'true' : 'false'
		}

		const toggledMetrics = {
			...chartsByVisibility,
			denomination: typeof queryParams.denomination === 'string' ? queryParams.denomination : null
		} as IToggledMetrics

		for (const chartLabel of props.defaultToggledCharts) {
			const chartKey = protocolCharts[chartLabel]
			toggledMetrics[chartKey] = queryParams[chartKey] === 'false' ? 'false' : 'true'
		}

		const toggledCharts = props.availableCharts.filter((chart) => toggledMetrics[protocolCharts[chart]] === 'true')

		const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

		const tvlSettings = {}

		for (const setting in TVL_SETTINGS) {
			tvlSettings[TVL_SETTINGS[setting]] = queryParams[`include_${TVL_SETTINGS[setting]}_in_tvl`]
		}

		const feesSettings = {}
		for (const setting in FEES_SETTINGS) {
			feesSettings[FEES_SETTINGS[setting]] = queryParams[`include_${FEES_SETTINGS[setting]}_in_fees`]
		}

		return {
			toggledMetrics,
			toggledCharts,
			hasAtleasOneBarChart,
			groupBy: hasAtleasOneBarChart ? (normalizeChartInterval(queryParams.groupBy) ?? 'daily') : 'daily',
			tvlSettings,
			feesSettings
		}
	}, [queryParamsString, props])

	const isThemeDark = router.query.theme === 'dark'

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

	const { finalCharts, valueSymbol, loadingCharts } = useFetchProtocolChartData({
		...props,
		toggledMetrics,
		groupBy: groupBy,
		tvlSettings,
		feesSettings
	})
	const hasVisibleCharts = Object.keys(finalCharts).length > 0

	return (
		<div className="col-span-full flex min-h-[360px] flex-col">
			{!hasVisibleCharts && loadingCharts.length > 0 ? (
				<div className="flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			) : (
				<Suspense fallback={<div className="flex min-h-[360px] items-center justify-center" />}>
					<ProtocolCoreChart
						chartData={finalCharts}
						chartColors={props.chartColors}
						isThemeDark={isThemeDark}
						valueSymbol={valueSymbol}
						groupBy={groupBy}
						hallmarks={toggledMetrics.events === 'true' ? props.hallmarks : null}
						unlockTokenSymbol={props.token.symbol}
					/>
				</Suspense>
			)}
		</div>
	)
}
