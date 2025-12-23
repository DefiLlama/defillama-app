import { lazy, Suspense, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { maxAgeForNext } from '~/api'
import { LocalLoader } from '~/components/Loaders'
import { BAR_CHARTS, protocolCharts } from '~/containers/ProtocolOverview/Chart/constants'
import { useFetchAndFormatChartData } from '~/containers/ProtocolOverview/Chart/ProtocolChart'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata, IProtocolOverviewPageData, IToggledMetrics } from '~/containers/ProtocolOverview/types'
import { DEFI_SETTINGS, FEES_SETTINGS } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const ProtocolLineBarChart = lazy(() => import('~/containers/ProtocolOverview/Chart/Chart')) as React.FC<any>

const groupByOptions = ['daily', 'weekly', 'monthly', 'cumulative'] as const

export const getStaticProps = withPerformanceLogging(
	'chart/protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

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
		const { tvl, ...rest } = router.query ?? {}
		return JSON.stringify(router.query ? (tvl === 'true' ? rest : router.query) : { protocol: [slug(props.name)] })
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
	}, [queryParamsString, props])

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
		<div className="col-span-full flex min-h-[360px] flex-col">
			{loadingCharts ? (
				<div className="flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			) : (
				<Suspense fallback={<div className="flex min-h-[360px] items-center justify-center" />}>
					<ProtocolLineBarChart
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
