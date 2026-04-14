import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Fragment, lazy, Suspense, useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { MetricRow, MetricSection, SubMetricRow } from '~/components/MetricPrimitives'
import { QuestionHelper } from '~/components/QuestionHelper'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { TVL_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formatNum, formattedNum } from '~/utils'
import { definitions } from '../../../public/definitions'
import {
	getProtocolCategoryDexVolumeLabel,
	getProtocolCategoryColumns,
	getProtocolCategoryDefaultSort,
	getProtocolCategoryPresentation
} from './constants'
import type { IProtocolByCategoryOrTagPageData } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

type SummaryMetricEntry = {
	key: string
	sortValue: number
	content: ReactNode
}

const getSectionSortValue = (
	metric: IProtocolByCategoryOrTagPageData['summaryMetrics'][keyof IProtocolByCategoryOrTagPageData['summaryMetrics']]
) => {
	if (metric?.total7d != null) return metric.total7d
	if (metric?.total24h != null) return metric.total24h
	if (metric?.total30d != null) return metric.total30d
	return null
}

export function ProtocolsByCategoryOrTag(props: IProtocolByCategoryOrTagPageData) {
	const name = props.category ?? props.tag ?? ''
	const namePrefix = name ? `${name}-` : ''
	const dexVolumeLabel = getProtocolCategoryDexVolumeLabel(props.effectiveCategory)
	const showDexVolumeTooltip = dexVolumeLabel === 'DEX Volume'
	const [groupBy, setGroupBy] = useState<LowercaseDwmcGrouping>('daily')
	const { chartInstance, handleChartReady } = useGetChartInstance()
	const categoryPresentation = useMemo(
		() =>
			getProtocolCategoryPresentation({
				label: name,
				effectiveCategory: props.effectiveCategory,
				isTagPage: !!props.tag && !props.category
			}),
		[name, props.effectiveCategory, props.tag, props.category]
	)

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const { finalProtocols, charts } = useMemo<{
		finalProtocols: IProtocolByCategoryOrTagPageData['protocols']
		charts: IProtocolByCategoryOrTagPageData['charts']
	}>(() => {
		const toggledSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])

		if (toggledSettings.length === 0) return { finalProtocols: props.protocols, charts: props.charts }

		const applyTvlSettings = (protocol: IProtocolByCategoryOrTagPageData['protocols'][0]) => {
			let tvl = protocol.tvl
			for (const setting of toggledSettings) {
				if (protocol.extraTvls[setting] == null) continue
				tvl = (tvl ?? 0) + (protocol.extraTvls[setting] ?? 0)
			}
			const updated = { ...protocol, tvl }
			if (updated.subRows?.length > 0) {
				updated.subRows = updated.subRows.map(applyTvlSettings)
			}
			return updated
		}

		const finalProtocols = props.protocols.map(applyTvlSettings)

		const shouldMirrorBorrowedChart = props.effectiveCategory === 'Lending' && toggledSettings.includes('borrowed')

		const finalSource: IProtocolByCategoryOrTagPageData['charts']['dataset']['source'] =
			props.charts.dataset.source.map((row) => {
				const timestampKey = row.timestamp
				const extraSum =
					timestampKey == null
						? 0
						: toggledSettings.reduce((sum, e) => sum + (props.extraTvlCharts[e]?.[timestampKey] ?? 0), 0)
				const currentTvlValue = typeof row.TVL === 'number' ? row.TVL : Number(row.TVL ?? 0)
				const safeCurrentTvlValue = Number.isFinite(currentTvlValue) ? currentTvlValue : 0
				const nextTvlValue = safeCurrentTvlValue + extraSum
				const timestamp = row.timestamp

				if (shouldMirrorBorrowedChart) {
					return { ...row, timestamp, TVL: nextTvlValue, Borrowed: nextTvlValue }
				}

				return { ...row, timestamp, TVL: nextTvlValue }
			})

		return {
			finalProtocols,
			charts: {
				...props.charts,
				dataset: { ...props.charts.dataset, source: finalSource }
			}
		}
	}, [tvlSettings, props.protocols, props.charts, props.extraTvlCharts, props.effectiveCategory])

	const chartSeries = useMemo(() => charts.charts ?? [], [charts.charts])

	const categoryColumns = useMemo(() => {
		return getColumnsForCategory({
			effectiveCategory: props.effectiveCategory,
			metrics: props.capabilities
		})
	}, [props.effectiveCategory, props.capabilities])

	const sortingState = useMemo(() => {
		const sortId = getProtocolCategoryDefaultSort({
			effectiveCategory: props.effectiveCategory,
			metrics: props.capabilities
		})
		return [{ id: sortId, desc: true }]
	}, [props.effectiveCategory, props.capabilities])

	const hasBarCharts = useMemo(() => {
		return chartSeries.some((series) => {
			if (series.type !== 'bar') return false
			const yDimension = typeof series.encode.y === 'string' ? series.encode.y : null
			if (!yDimension) return false

			return charts.dataset.source.some((row) => {
				const rawValue = row[yDimension]
				if (rawValue == null) return false
				const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
				return Number.isFinite(value)
			})
		})
	}, [chartSeries, charts.dataset.source])

	const groupedCharts = useMemo(() => {
		if (!hasBarCharts) return charts

		const dataBySeries = new Map<string, Map<number, number | null>>()
		const dimensionOrder: string[] = []
		const groupedSeries: Array<(typeof chartSeries)[number]> = []
		for (const series of chartSeries) {
			const yDimension = typeof series.encode.y === 'string' ? series.encode.y : null

			if (!yDimension) {
				groupedSeries.push(series)
				continue
			}

			dimensionOrder.push(yDimension)

			const rawData: Array<[number, number]> = []
			for (const row of charts.dataset.source) {
				const timestamp = Number(row.timestamp)
				const rawValue = row[yDimension]
				if (rawValue == null) continue
				const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
				if (!Number.isFinite(timestamp) || !Number.isFinite(value)) continue
				rawData.push([timestamp, value])
			}

			const groupedData =
				series.type === 'bar'
					? formatBarChart({
							data: rawData,
							groupBy,
							dateInMs: true,
							denominationPriceHistory: null
						})
					: formatLineChart({
							data: rawData,
							groupBy,
							dateInMs: true,
							denominationPriceHistory: null
						})

			dataBySeries.set(yDimension, new Map(groupedData.map(([timestamp, value]) => [timestamp, value])))

			groupedSeries.push({
				...series,
				type: series.type === 'bar' && groupBy === 'cumulative' ? 'line' : series.type
			})
		}

		const timestamps = new Set<number>()
		for (const points of dataBySeries.values()) {
			for (const timestamp of points.keys()) {
				timestamps.add(timestamp)
			}
		}

		const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b)

		return {
			...charts,
			dataset: {
				source: sortedTimestamps.map((timestamp) => {
					const row: Record<string, number | null> = { timestamp }
					for (const dimension of dimensionOrder) {
						row[dimension] = dataBySeries.get(dimension)?.get(timestamp) ?? null
					}
					return row
				}),
				dimensions: ['timestamp', ...dimensionOrder]
			},
			charts: groupedSeries
		}
	}, [charts, chartSeries, groupBy, hasBarCharts])
	const deferredGroupedCharts = useDeferredValue(groupedCharts)

	const chartGroupBy = groupBy
	const sortedSummaryEntries = useMemo(() => {
		const entries: SummaryMetricEntry[] = []
		const latestTvl = charts.dataset?.source[charts.dataset?.source.length - 1]?.TVL
		const tvlValue = typeof latestTvl === 'number' ? latestTvl : Number(latestTvl ?? NaN)

		if (Number.isFinite(tvlValue)) {
			entries.push({
				key: 'tvl',
				sortValue: tvlValue,
				content: (
					<MetricRow
						label="Total Value Locked"
						tooltip="Sum of value of all coins held in smart contracts of all the protocols on the chain"
						value={formattedNum(tvlValue, true)}
					/>
				)
			})
		}

		const pushSection = ({
			key,
			label,
			metric,
			primaryTooltip,
			subtooltips
		}: {
			key: string
			label: string
			metric: IProtocolByCategoryOrTagPageData['summaryMetrics'][keyof IProtocolByCategoryOrTagPageData['summaryMetrics']]
			primaryTooltip?: string
			subtooltips?: Partial<Record<'24h' | '30d', string>>
		}) => {
			const sortValue = getSectionSortValue(metric)
			if (sortValue == null) return

			entries.push({
				key,
				sortValue,
				content: (
					<SummaryMetricSection
						label={label}
						metric={metric}
						primaryTooltip={primaryTooltip}
						subtooltips={subtooltips}
					/>
				)
			})
		}

		pushSection({
			key: 'fees',
			label: 'Fees',
			metric: props.summaryMetrics.fees,
			primaryTooltip: definitions.fees.chain['7d'],
			subtooltips: { '24h': definitions.fees.chain['24h'], '30d': definitions.fees.chain['30d'] }
		})
		pushSection({
			key: 'revenue',
			label: 'Revenue',
			metric: props.summaryMetrics.revenue,
			primaryTooltip: definitions.revenue.chain['7d'],
			subtooltips: { '24h': definitions.revenue.chain['24h'], '30d': definitions.revenue.chain['30d'] }
		})
		pushSection({
			key: 'dexVolume',
			label: dexVolumeLabel,
			metric: props.summaryMetrics.dexVolume,
			primaryTooltip: showDexVolumeTooltip ? definitions.dexs.chain['7d'] : undefined,
			subtooltips: showDexVolumeTooltip
				? { '24h': definitions.dexs.chain['24h'], '30d': definitions.dexs.chain['30d'] }
				: undefined
		})
		pushSection({
			key: 'dexAggregatorsVolume',
			label: 'DEX Aggregator Volume',
			metric: props.summaryMetrics.dexAggregatorsVolume,
			primaryTooltip: definitions.dexAggregators.chain['7d'],
			subtooltips: {
				'24h': definitions.dexAggregators.chain['24h'],
				'30d': definitions.dexAggregators.chain['30d']
			}
		})
		pushSection({
			key: 'perpVolume',
			label: 'Perp Volume',
			metric: props.summaryMetrics.perpVolume,
			primaryTooltip: definitions.perps.protocol['7d'],
			subtooltips: { '24h': definitions.perps.protocol['24h'], '30d': definitions.perps.protocol['30d'] }
		})
		pushSection({
			key: 'perpsAggregatorsVolume',
			label: 'Perp Aggregator Volume',
			metric: props.summaryMetrics.perpsAggregatorsVolume,
			primaryTooltip: definitions.perpsAggregators.protocol['7d'],
			subtooltips: {
				'24h': definitions.perpsAggregators.protocol['24h'],
				'30d': definitions.perpsAggregators.protocol['30d']
			}
		})
		pushSection({
			key: 'bridgeAggregatorsVolume',
			label: 'Bridge Aggregator Volume',
			metric: props.summaryMetrics.bridgeAggregatorsVolume,
			primaryTooltip: definitions.bridgeAggregators.chain['7d'],
			subtooltips: {
				'24h': definitions.bridgeAggregators.chain['24h'],
				'30d': definitions.bridgeAggregators.chain['30d']
			}
		})
		pushSection({
			key: 'normalizedVolume',
			label: 'Normalized Volume',
			metric: props.summaryMetrics.normalizedVolume,
			primaryTooltip: definitions.normalizedVolume.protocol['7d'],
			subtooltips: {
				'24h': definitions.normalizedVolume.protocol['24h'],
				'30d': definitions.normalizedVolume.protocol['30d']
			}
		})

		if (props.summaryMetrics.openInterest?.total24h != null) {
			entries.push({
				key: 'openInterest',
				sortValue: props.summaryMetrics.openInterest.total24h,
				content: (
					<MetricRow
						label="Open Interest"
						tooltip={definitions.openInterest.common}
						value={formattedNum(props.summaryMetrics.openInterest.total24h, true)}
					/>
				)
			})
		}

		pushSection({
			key: 'optionsPremiumVolume',
			label: 'Premium Volume',
			metric: props.summaryMetrics.optionsPremiumVolume,
			primaryTooltip: definitions.optionsPremium.protocol['7d'],
			subtooltips: {
				'24h': definitions.optionsPremium.protocol['24h'],
				'30d': definitions.optionsPremium.protocol['30d']
			}
		})
		pushSection({
			key: 'optionsNotionalVolume',
			label: 'Notional Volume',
			metric: props.summaryMetrics.optionsNotionalVolume,
			primaryTooltip: definitions.optionsNotional.protocol['7d'],
			subtooltips: {
				'24h': definitions.optionsNotional.protocol['24h'],
				'30d': definitions.optionsNotional.protocol['30d']
			}
		})

		return entries
			.sort((a, b) => b.sortValue - a.sortValue)
			.map((entry) => <Fragment key={entry.key}>{entry.content}</Fragment>)
	}, [charts.dataset, dexVolumeLabel, props.summaryMetrics, showDexVolumeTooltip])

	return (
		<>
			{props.chains.length > 1 ? <RowLinksWithDropdown links={props.chains} activeLink={props.chain} /> : null}
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					{props.chain === 'All' ? (
						<h1 className="text-lg font-semibold">{categoryPresentation.headingLabel}</h1>
					) : (
						<h1 className="text-lg font-semibold">{`${categoryPresentation.headingLabel} on ${props.chain}`}</h1>
					)}
					<div className="mb-auto flex flex-1 flex-col">{sortedSummaryEntries}</div>
				</div>
				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-2 p-2 pb-0">
						{hasBarCharts ? (
							<ChartGroupingSelector value={groupBy} setValue={setGroupBy} options={DWMC_GROUPING_OPTIONS_LOWERCASE} />
						) : null}
						<ChartExportButtons
							chartInstance={chartInstance}
							filename={`protocols-${namePrefix}${props.chain || 'all'}`}
							title={
								props.chain === 'All'
									? categoryPresentation.headingLabel
									: `${categoryPresentation.headingLabel} on ${props.chain}`
							}
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={deferredGroupedCharts.dataset}
							charts={deferredGroupedCharts.charts}
							groupBy={chartGroupBy}
							hideDefaultLegend={false}
							valueSymbol="$"
							onReady={handleChartReady}
						/>
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={finalProtocols}
				columns={categoryColumns}
				placeholder={categoryPresentation.searchPlaceholder}
				columnToSearch="name"
				header={categoryPresentation.tableHeader}
				sortingState={sortingState}
				showColumnSelect
				csvFileName={`defillama-${namePrefix}${props.chain || 'all'}-protocols`}
			/>
		</>
	)
}

function SummaryMetricSection({
	label,
	metric,
	primaryTooltip,
	subtooltips
}: {
	label: string
	metric: IProtocolByCategoryOrTagPageData['summaryMetrics'][keyof IProtocolByCategoryOrTagPageData['summaryMetrics']]
	primaryTooltip?: string
	subtooltips?: Partial<Record<'24h' | '30d', string>>
}) {
	if (!metric?.total7d && !metric?.total24h && !metric?.total30d) return null

	return (
		<MetricSection
			label={`${label} (7d)`}
			tooltip={primaryTooltip ?? null}
			value={metric.total7d != null ? formattedNum(metric.total7d, true) : '—'}
		>
			{metric.total24h != null ? (
				<SubMetricRow
					label={`${label} (24h)`}
					tooltip={subtooltips?.['24h']}
					value={formattedNum(metric.total24h, true)}
				/>
			) : null}
			{metric.total30d != null ? (
				<SubMetricRow
					label={`${label} (30d)`}
					tooltip={subtooltips?.['30d']}
					value={formattedNum(metric.total30d, true)}
				/>
			) : null}
		</MetricSection>
	)
}

type ProtocolRow = IProtocolByCategoryOrTagPageData['protocols'][0]

const columnHelper = createColumnHelper<ProtocolRow>()

const ProtocolChainsComponent = ({ chains }: { chains: string[] }) => (
	<span className="flex flex-col gap-1">
		{chains.map((chain) => (
			<span key={`chain${chain}-of-protocol`} className="flex items-center gap-1">
				<TokenLogo name={chain} kind="chain" size={14} alt={`Logo of ${chain}`} />
				<span>{chain}</span>
			</span>
		))}
	</span>
)

const perpVolumeCell = (info: any) => {
	if (info.getValue() == null) return null
	const helpers: string[] = []
	if (info.row.original.perpVolume?.zeroFeePerp) {
		helpers.push('This protocol charges no fees for most of its users')
	}
	if (helpers.length > 0) {
		return (
			<span className="flex items-center justify-end gap-1">
				{helpers.map((helper) => (
					<QuestionHelper key={`${info.row.original.name}-${helper}`} text={helper} />
				))}
				<span className={info.row.original.perpVolume?.doublecounted ? 'text-(--text-disabled)' : ''}>
					{formattedNum(info.getValue(), true)}
				</span>
			</span>
		)
	}
	return formattedNum(info.getValue(), true)
}

const COLUMN_REGISTRY: Record<string, ColumnDef<ProtocolRow, any>> = {
	name: columnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()
			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-8' : 'pl-4'}`}>
					{row.subRows?.length > 0 ? (
						<button className="absolute -left-0.5" onClick={row.getToggleExpandedHandler()}>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					) : null}
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo src={row.original.logo} data-lgonly alt={`Logo of ${row.original.name}`} />
					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/protocol/${row.original.slug}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>
						<Tooltip
							content={<ProtocolChainsComponent chains={row.original.chains} />}
							className="text-[0.7rem] text-(--text-disabled)"
						>
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
				</span>
			)
		},
		size: 280
	}),
	tvl: columnHelper.accessor((p) => p.tvl, {
		id: 'tvl',
		header: 'TVL',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'Sum of value of all coins held in smart contracts of the protocol' },
		size: 120
	}),
	'mcap/tvl': columnHelper.accessor((p) => (p.mcap != null && p.tvl != null ? formatNum(p.mcap / p.tvl) : null), {
		id: 'mcap/tvl',
		header: 'Mcap/TVL',
		cell: (info) => (info.getValue() != null ? info.getValue() : null),
		meta: { align: 'end', headerHelperText: 'Market cap / TVL ratio' },
		size: 110
	}),
	fees_7d: columnHelper.accessor((p) => p.fees?.total7d, {
		id: 'fees_7d',
		header: 'Fees 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.fees.protocol['7d'] },
		size: 100
	}),
	revenue_7d: columnHelper.accessor((p) => p.revenue?.total7d, {
		id: 'revenue_7d',
		header: 'Revenue 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.revenue.protocol['7d'] },
		size: 128
	}),
	fees_30d: columnHelper.accessor((p) => p.fees?.total30d, {
		id: 'fees_30d',
		header: 'Fees 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.fees.protocol['30d'] },
		size: 100
	}),
	revenue_30d: columnHelper.accessor((p) => p.revenue?.total30d, {
		id: 'revenue_30d',
		header: 'Revenue 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.revenue.protocol['30d'] },
		size: 128
	}),
	fees_24h: columnHelper.accessor((p) => p.fees?.total24h, {
		id: 'fees_24h',
		header: 'Fees 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.fees.protocol['24h'] },
		size: 100
	}),
	revenue_24h: columnHelper.accessor((p) => p.revenue?.total24h, {
		id: 'revenue_24h',
		header: 'Revenue 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.revenue.protocol['24h'] },
		size: 128
	}),
	perp_volume_24h: columnHelper.accessor((p) => p.perpVolume?.total24h, {
		id: 'perp_volume_24h',
		header: 'Perp Volume 24h',
		cell: perpVolumeCell,
		meta: { align: 'end', headerHelperText: definitions.perps.protocol['24h'] },
		size: 160
	}),
	perp_volume_7d: columnHelper.accessor((p) => p.perpVolume?.total7d, {
		id: 'perp_volume_7d',
		header: 'Perp Volume 7d',
		cell: perpVolumeCell,
		meta: { align: 'end', headerHelperText: definitions.perps.protocol['7d'] },
		size: 160
	}),
	perp_volume_30d: columnHelper.accessor((p) => p.perpVolume?.total30d, {
		id: 'perp_volume_30d',
		header: 'Perp Volume 30d',
		cell: perpVolumeCell,
		meta: { align: 'end', headerHelperText: definitions.perps.protocol['30d'] },
		size: 160
	}),
	perp_aggregator_volume_24h: columnHelper.accessor((p) => p.perpsAggregatorsVolume?.total24h, {
		id: 'perp_aggregator_volume_24h',
		header: 'Perp Aggregator Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.perpsAggregators.protocol['24h'] },
		size: 220
	}),
	perp_aggregator_volume_7d: columnHelper.accessor((p) => p.perpsAggregatorsVolume?.total7d, {
		id: 'perp_aggregator_volume_7d',
		header: 'Perp Aggregator Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.perpsAggregators.protocol['7d'] },
		size: 220
	}),
	perp_aggregator_volume_30d: columnHelper.accessor((p) => p.perpsAggregatorsVolume?.total30d, {
		id: 'perp_aggregator_volume_30d',
		header: 'Perp Aggregator Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.perpsAggregators.protocol['30d'] },
		size: 220
	}),
	bridge_aggregator_volume_24h: columnHelper.accessor((p) => p.bridgeAggregatorsVolume?.total24h, {
		id: 'bridge_aggregator_volume_24h',
		header: 'Bridge Aggregator Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['24h'] },
		size: 220
	}),
	bridge_aggregator_volume_7d: columnHelper.accessor((p) => p.bridgeAggregatorsVolume?.total7d, {
		id: 'bridge_aggregator_volume_7d',
		header: 'Bridge Aggregator Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['7d'] },
		size: 220
	}),
	bridge_aggregator_volume_30d: columnHelper.accessor((p) => p.bridgeAggregatorsVolume?.total30d, {
		id: 'bridge_aggregator_volume_30d',
		header: 'Bridge Aggregator Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['30d'] },
		size: 220
	}),
	normalized_volume_24h: columnHelper.accessor((p) => p.normalizedVolume?.total24h, {
		id: 'normalized_volume_24h',
		header: 'Normalized Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.normalizedVolume.protocol['24h'] },
		size: 190
	}),
	normalized_volume_7d: columnHelper.accessor((p) => p.normalizedVolume?.total7d, {
		id: 'normalized_volume_7d',
		header: 'Normalized Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.normalizedVolume.protocol['7d'] },
		size: 190
	}),
	normalized_volume_30d: columnHelper.accessor((p) => p.normalizedVolume?.total30d, {
		id: 'normalized_volume_30d',
		header: 'Normalized Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.normalizedVolume.protocol['30d'] },
		size: 190
	}),
	openInterest: columnHelper.accessor((p) => p.openInterest?.total24h, {
		id: 'openInterest',
		header: 'Open Interest',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.openInterest.protocol },
		size: 160
	}),
	dex_volume_7d: columnHelper.accessor((p) => p.dexVolume?.total7d, {
		id: 'dex_volume_7d',
		header: 'DEX Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexs.protocol['7d'] },
		size: 140
	}),
	dex_volume_30d: columnHelper.accessor((p) => p.dexVolume?.total30d, {
		id: 'dex_volume_30d',
		header: 'DEX Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexs.protocol['30d'] },
		size: 148
	}),
	dex_volume_24h: columnHelper.accessor((p) => p.dexVolume?.total24h, {
		id: 'dex_volume_24h',
		header: 'DEX Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexs.protocol['24h'] },
		size: 148
	}),
	dex_aggregator_volume_7d: columnHelper.accessor((p) => p.dexAggregatorsVolume?.total7d, {
		id: 'dex_aggregator_volume_7d',
		header: 'DEX Aggregator Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['7d'] },
		size: 220
	}),
	dex_aggregator_volume_30d: columnHelper.accessor((p) => p.dexAggregatorsVolume?.total30d, {
		id: 'dex_aggregator_volume_30d',
		header: 'DEX Aggregator Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['30d'] },
		size: 220
	}),
	dex_aggregator_volume_24h: columnHelper.accessor((p) => p.dexAggregatorsVolume?.total24h, {
		id: 'dex_aggregator_volume_24h',
		header: 'DEX Aggregator Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['24h'] },
		size: 220
	}),
	prediction_volume_7d: columnHelper.accessor((p) => p.dexVolume?.total7d, {
		id: 'prediction_volume_7d',
		header: 'Prediction Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 180
	}),
	prediction_volume_30d: columnHelper.accessor((p) => p.dexVolume?.total30d, {
		id: 'prediction_volume_30d',
		header: 'Prediction Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 195
	}),
	prediction_volume_24h: columnHelper.accessor((p) => p.dexVolume?.total24h, {
		id: 'prediction_volume_24h',
		header: 'Prediction Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 195
	}),
	payment_volume_7d: columnHelper.accessor((p) => p.dexVolume?.total7d, {
		id: 'payment_volume_7d',
		header: 'Payment Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 180
	}),
	payment_volume_30d: columnHelper.accessor((p) => p.dexVolume?.total30d, {
		id: 'payment_volume_30d',
		header: 'Payment Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 180
	}),
	payment_volume_24h: columnHelper.accessor((p) => p.dexVolume?.total24h, {
		id: 'payment_volume_24h',
		header: 'Payment Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 180
	}),
	spot_volume_7d: columnHelper.accessor((p) => p.dexVolume?.total7d, {
		id: 'spot_volume_7d',
		header: 'Spot Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 160
	}),
	spot_volume_30d: columnHelper.accessor((p) => p.dexVolume?.total30d, {
		id: 'spot_volume_30d',
		header: 'Spot Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 160
	}),
	spot_volume_24h: columnHelper.accessor((p) => p.dexVolume?.total24h, {
		id: 'spot_volume_24h',
		header: 'Spot Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 160
	}),
	options_premium_7d: columnHelper.accessor((p) => p.optionsPremium?.total7d, {
		id: 'options_premium_7d',
		header: 'Premium Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['7d'] },
		size: 180
	}),
	options_premium_30d: columnHelper.accessor((p) => p.optionsPremium?.total30d, {
		id: 'options_premium_30d',
		header: 'Premium Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['30d'] },
		size: 180
	}),
	options_premium_24h: columnHelper.accessor((p) => p.optionsPremium?.total24h, {
		id: 'options_premium_24h',
		header: 'Premium Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['24h'] },
		size: 180
	}),
	options_notional_7d: columnHelper.accessor((p) => p.optionsNotional?.total7d, {
		id: 'options_notional_7d',
		header: 'Notional Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.optionsNotional.protocol['7d'] },
		size: 180
	}),
	options_notional_30d: columnHelper.accessor((p) => p.optionsNotional?.total30d, {
		id: 'options_notional_30d',
		header: 'Notional Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.optionsNotional.protocol['30d'] },
		size: 180
	}),
	options_notional_24h: columnHelper.accessor((p) => p.optionsNotional?.total24h, {
		id: 'options_notional_24h',
		header: 'Notional Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.optionsNotional.protocol['24h'] },
		size: 180
	}),
	borrowed: columnHelper.accessor((p) => p.borrowed, {
		id: 'borrowed',
		header: 'Borrowed',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'Total amount borrowed from the protocol' },
		size: 100
	}),
	supplied: columnHelper.accessor((p) => p.supplied, {
		id: 'supplied',
		header: 'Supplied',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'Total amount supplied to the protocol' },
		size: 100
	}),
	'supplied/tvl': columnHelper.accessor((p) => p.suppliedTvl, {
		id: 'supplied/tvl',
		header: 'Supplied/TVL',
		cell: (info) => info.getValue(),
		meta: { align: 'end', headerHelperText: '(Total amount supplied / Total value locked) ratio' },
		size: 140
	})
}

export function getColumnsForCategory({
	effectiveCategory,
	metrics
}: {
	effectiveCategory: string | null
	metrics: IProtocolByCategoryOrTagPageData['capabilities']
}) {
	const columnIds = getProtocolCategoryColumns({ effectiveCategory, metrics })
	return columnIds.map((id) => COLUMN_REGISTRY[id]).filter(Boolean)
}
