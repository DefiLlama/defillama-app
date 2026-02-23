import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { useRouter } from 'next/router'
import * as React from 'react'
import { lazy, useMemo } from 'react'
import { Announcement } from '~/components/Announcement'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TagGroup } from '~/components/TagGroup'
import { CHART_COLORS } from '~/constants/colors'
import { PastUnlockPriceImpact } from '~/containers/Unlocks/PastUnlockPriceImpact'
import { getAllProtocolEmissions } from '~/containers/Unlocks/queries'
import { UnlocksTable } from '~/containers/Unlocks/Table'
import { TopUnlocks } from '~/containers/Unlocks/TopUnlocks'
import { useWatchlistManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'

dayjs.extend(weekOfYear)

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const calculateUnlockStatistics = (data, nowSec: number) => {
	let upcomingUnlocks30dValue = 0
	let upcomingUnlocks7dValue = 0
	const thirtyDaysLater = nowSec + 30 * 24 * 60 * 60
	const sevenDaysLater = nowSec + 7 * 24 * 60 * 60

	if (data) {
		for (const protocol of data) {
			if (!protocol.upcomingEvent || protocol.tPrice == null) {
				continue
			}

			for (const event of protocol.upcomingEvent) {
				if (event.timestamp === null || !event.noOfTokens || event.noOfTokens.length === 0) {
					continue
				}

				const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
				if (totalTokens === 0) {
					continue
				}

				const valueUSD = totalTokens * protocol.tPrice
				if (event.timestamp >= nowSec && event.timestamp <= thirtyDaysLater) {
					upcomingUnlocks30dValue += valueUSD
				}
				if (event.timestamp >= nowSec && event.timestamp <= sevenDaysLater) {
					upcomingUnlocks7dValue += valueUSD
				}
			}
		}
	}

	return {
		upcomingUnlocks7dValue,
		upcomingUnlocks30dValue,
		totalProtocols: data?.length || 0
	}
}

export const getStaticProps = withPerformanceLogging('unlocks', async () => {
	const generatedAtSec = Math.floor(Date.now() / 1000)
	const data = await getAllProtocolEmissions({
		endDate: generatedAtSec + 30 * 24 * 60 * 60
	})
	return {
		props: {
			data,
			generatedAtSec
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Token Unlocks']

const TIME_PERIODS = ['Daily', 'Weekly', 'Monthly'] as const
type TimePeriod = (typeof TIME_PERIODS)[number]

const VIEW_MODES = ['Total View', 'Breakdown View'] as const
type ViewMode = (typeof VIEW_MODES)[number]

const END_TIMESTAMP = dayjs('2031-01-01').unix()
const SECONDS_PER_DAY = 86400

function bucketTimestamp(ts: number, timePeriod: TimePeriod): number {
	if (timePeriod === 'Daily') {
		return Math.floor(ts / SECONDS_PER_DAY) * SECONDS_PER_DAY
	}
	if (timePeriod === 'Monthly') {
		const d = dayjs.unix(ts)
		return d.startOf('month').unix()
	}
	// Weekly — locale-aware week start requires dayjs
	return dayjs.unix(ts).startOf('week').unix()
}

const EMPTY_CHART_RESULT = {
	dataset: { source: [], dimensions: ['timestamp'] } satisfies MultiSeriesChart2Dataset,
	charts: [] as NonNullable<IMultiSeriesChart2Props['charts']>
}

function UpcomingUnlockVolumeChart({ protocols, initialNowSec }: { protocols: any[]; initialNowSec: number }) {
	const router = useRouter()

	const updateQueryParam = React.useCallback(
		(key: string, value: string, defaultValue: string) => {
			pushShallowQuery(router, { [key]: value === defaultValue ? undefined : value })
		},
		[router]
	)

	const chartGroupParam = readSingleQueryValue(router.query.chartGroup)
	const timePeriod: TimePeriod =
		chartGroupParam && (TIME_PERIODS as readonly string[]).includes(chartGroupParam)
			? (chartGroupParam as TimePeriod)
			: 'Weekly'

	const chartViewParam = readSingleQueryValue(router.query.chartView)
	const viewMode: ViewMode =
		chartViewParam && (VIEW_MODES as readonly string[]).includes(chartViewParam)
			? (chartViewParam as ViewMode)
			: 'Total View'

	const isFullView = false
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const now = initialNowSec
	const { dataset, charts } = useMemo(() => {
		if (!protocols || protocols.length === 0) return EMPTY_CHART_RESULT
		const endTs = isFullView ? Infinity : END_TIMESTAMP
		const isTotalView = viewMode === 'Total View'

		// Total View: bucket -> aggregated value
		const totalMap = isTotalView ? new Map<number, number>() : null
		// Breakdown View: bucket -> { protocolName -> value }
		const breakdownMap = !isTotalView ? new Map<number, Record<string, number>>() : null
		const allProtocolNames = !isTotalView ? new Set<string>() : null

		for (const protocol of protocols) {
			if (!protocol.events || protocol.tPrice == null || protocol.tPrice <= 0) continue
			const price = protocol.tPrice
			const name = protocol.name

			for (const event of protocol.events) {
				const ts = event.timestamp
				if (ts == null || ts < now || ts >= endTs) continue
				const tokens = event.noOfTokens
				if (!tokens || tokens.length === 0) continue

				let totalTokens = 0
				for (let i = 0; i < tokens.length; i++) {
					totalTokens += tokens[i] || 0
				}
				if (totalTokens === 0) continue

				const valueUSD = totalTokens * price
				if (valueUSD <= 0) continue

				const key = bucketTimestamp(ts, timePeriod)

				if (totalMap) {
					totalMap.set(key, (totalMap.get(key) || 0) + valueUSD)
				} else {
					const record = breakdownMap!.get(key) || {}
					record[name] = (record[name] || 0) + valueUSD
					breakdownMap!.set(key, record)
					allProtocolNames!.add(name)
				}
			}
		}

		if (totalMap) {
			const seriesName = 'Total Upcoming Unlock Value'
			const source = Array.from(totalMap.entries())
				.sort((a, b) => a[0] - b[0])
				.map(([date, total]) => ({
					timestamp: date * 1e3,
					[seriesName]: total
				}))

			return {
				dataset: { source, dimensions: ['timestamp', seriesName] } satisfies MultiSeriesChart2Dataset,
				charts: [
					{
						type: 'bar' as const,
						name: seriesName,
						encode: { x: 'timestamp', y: seriesName },
						color: '#8884d8'
					}
				]
			}
		}

		const sortedNames = Array.from(allProtocolNames!).sort()
		const source = Array.from(breakdownMap!.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([date, protocolValues]) => ({
				timestamp: date * 1e3,
				...protocolValues
			}))

		return {
			dataset: { source, dimensions: ['timestamp', ...sortedNames] } satisfies MultiSeriesChart2Dataset,
			charts: sortedNames.map((name, i) => ({
				type: 'bar' as const,
				name,
				encode: { x: 'timestamp', y: name },
				stack: 'A',
				color: CHART_COLORS[i % CHART_COLORS.length]
			}))
		}
	}, [protocols, timePeriod, isFullView, viewMode, now])

	return (
		<>
			{dataset.source.length > 0 ? (
				<>
					<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
						<h2 className="mr-auto text-lg font-semibold">Upcoming Unlocks</h2>
						<TagGroup
							selectedValue={timePeriod}
							setValue={(value: TimePeriod) => updateQueryParam('chartGroup', value, 'Weekly')}
							values={TIME_PERIODS as unknown as string[]}
						/>
						<TagGroup
							selectedValue={viewMode}
							setValue={(value: ViewMode) => updateQueryParam('chartView', value, 'Total View')}
							values={VIEW_MODES as unknown as string[]}
						/>
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename="upcoming-unlocks"
							title="Upcoming Unlocks"
						/>
					</div>
					<React.Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={dataset}
							charts={charts}
							hideDefaultLegend={viewMode === 'Total View'}
							groupBy={timePeriod.toLowerCase() as 'daily' | 'weekly' | 'monthly'}
							valueSymbol="$"
							onReady={handleChartReady}
						/>
					</React.Suspense>
				</>
			) : (
				<p className="flex items-center justify-center" style={{ height: '360px' }}>
					No upcoming unlock data available for the selected period.
				</p>
			)}
		</>
	)
}

export default function Protocols({ data, generatedAtSec }: { data: any[]; generatedAtSec: number }) {
	const { savedProtocols } = useWatchlistManager('defi')
	const router = useRouter()

	const showOnlyWatchlist = readSingleQueryValue(router.query.watchlist) === 'true'

	const { upcomingUnlocks7dValue, upcomingUnlocks30dValue, totalProtocols } = useMemo(
		() => calculateUnlockStatistics(data, generatedAtSec),
		[data, generatedAtSec]
	)

	return (
		<Layout
			title={`Unlocks - DefiLlama`}
			description={`Unlocks by protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`unlocks, defi unlocks, upcoming token unlocks, token emissions, emissions`}
			canonicalUrl={`/unlocks`}
			pageName={pageName}
		>
			<Announcement notCancellable>
				<span>Are we missing any protocol?</span>{' '}
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					className="font-medium text-(--blue) underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">Unlock Statistics</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Protocols Tracked</span>
						<span className="font-jetbrains text-2xl font-semibold">{totalProtocols}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Upcoming Unlocks (7d)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(upcomingUnlocks7dValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Upcoming Unlocks (30d)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(upcomingUnlocks30dValue, true)}</span>
					</p>
					<BasicLink
						href="/unlocks/calendar"
						className="mt-auto flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					>
						<span>View unlocks calendar</span>
						<Icon name="arrow-right" className="h-4 w-4" />
					</BasicLink>
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<UpcomingUnlockVolumeChart protocols={data} initialNowSec={generatedAtSec} />
				</div>
			</div>

			<div className="isolate grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
				<TopUnlocks
					data={data}
					period={1}
					title="24h Top Unlocks"
					initialNowSec={generatedAtSec}
					className="col-span-1 flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3"
				/>

				<TopUnlocks
					data={data}
					period={30}
					title="30d Top Unlocks"
					initialNowSec={generatedAtSec}
					className="col-span-1 flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3"
				/>

				<PastUnlockPriceImpact
					data={data}
					title="Post Unlock Price Impact"
					initialNowSec={generatedAtSec}
					className="col-span-1 flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3"
				/>
			</div>

			<UnlocksTable protocols={data} showOnlyWatchlist={showOnlyWatchlist} savedProtocols={savedProtocols} />
		</Layout>
	)
}
