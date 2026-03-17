import { createColumnHelper } from '@tanstack/react-table'
import { lazy, startTransition, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { TVL_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { definitions } from '~/public/definitions'
import { formatNum, formattedNum } from '~/utils'
import {
	getProtocolCategoryColumns,
	getProtocolCategoryDefaultSort,
	getProtocolCategoryPresentation
} from './constants'
import type { IProtocolByCategoryOrTagPageData } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const CHART_INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const
type ChartInterval = (typeof CHART_INTERVALS_LIST)[number]

export function ProtocolsByCategoryOrTag(props: IProtocolByCategoryOrTagPageData) {
	const name = props.category ?? props.tag ?? ''
	const namePrefix = name ? `${name}-` : ''
	const [groupBy, setGroupBy] = useState<ChartInterval>('daily')
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
		return getColumnsForCategory(props.effectiveCategory)
	}, [props.effectiveCategory])

	const sortingState = useMemo(() => {
		const sortId = getProtocolCategoryDefaultSort(props.effectiveCategory)
		return [{ id: sortId, desc: true }]
	}, [props.effectiveCategory])

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

	const chartGroupBy = groupBy === 'cumulative' ? 'daily' : groupBy

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
					<div className="mb-auto flex flex-1 flex-col gap-2">
						{props.charts.dataset?.source.length > 0 ? (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content="Sum of value of all coins held in smart contracts of all the protocols on the chain"
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Total Value Locked
								</Tooltip>

								<span className="text-right font-jetbrains">
									{formattedNum(charts.dataset?.source[charts.dataset?.source.length - 1]?.TVL, true)}
								</span>
							</p>
						) : null}
						{props.optionsPremium7d != null ? (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.optionsPremium.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Premium Volume (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.optionsPremium7d, true)}</span>
							</p>
						) : null}
						{props.optionsNotional7d != null ? (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.optionsNotional.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Notional Volume (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.optionsNotional7d, true)}</span>
							</p>
						) : null}
						{props.fees7d != null ? (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.fees.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Fees (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.fees7d, true)}</span>
							</p>
						) : null}
						{props.revenue7d != null ? (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.revenue.chain['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Revenue (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.revenue7d, true)}</span>
							</p>
						) : null}
						{props.dexVolume7d != null ? (
							<>
								{props.effectiveCategory === 'Dexs' ? (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<Tooltip
											content={definitions.dexs.protocol['7d']}
											className="font-normal text-(--text-label) underline decoration-dotted"
										>
											DEX Volume (7d)
										</Tooltip>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								) : props.effectiveCategory === 'DEX Aggregators' || props.effectiveCategory === 'DEX Aggregator' ? (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<Tooltip
											content={definitions.dexAggregators.protocol['7d']}
											className="font-normal text-(--text-label) underline decoration-dotted"
										>
											DEX Aggregator Volume (7d)
										</Tooltip>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								) : props.effectiveCategory === 'Prediction Market' ? (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<span className="font-normal text-(--text-label)">Prediction Market Volume (7d)</span>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								) : (
									<p className="flex flex-wrap items-center justify-between gap-4 text-base">
										<span className="font-normal text-(--text-label)">Volume (7d)</span>
										<span className="text-right font-jetbrains">{formattedNum(props.dexVolume7d, true)}</span>
									</p>
								)}
							</>
						) : null}
						{props.perpVolume7d != null ? (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.perps.protocol['7d']}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Perp Volume (7d)
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.perpVolume7d, true)}</span>
							</p>
						) : null}
						{props.openInterest != null ? (
							<p className="flex flex-wrap items-center justify-between gap-4 text-base">
								<Tooltip
									content={definitions.openInterest.common}
									className="font-normal text-(--text-label) underline decoration-dotted"
								>
									Open Interest
								</Tooltip>
								<span className="text-right font-jetbrains">{formattedNum(props.openInterest, true)}</span>
							</p>
						) : null}
					</div>
				</div>
				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-2 p-2 pb-0">
						{hasBarCharts ? (
							<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
								{CHART_INTERVALS_LIST.map((dataInterval) => (
									<Tooltip
										content={`${dataInterval.slice(0, 1).toUpperCase()}${dataInterval.slice(1)}`}
										render={<button />}
										className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
										data-active={groupBy === dataInterval}
										onClick={() => {
											startTransition(() => setGroupBy(dataInterval))
										}}
										key={`${name}-category-groupBy-${dataInterval}`}
									>
										{dataInterval.slice(0, 1).toUpperCase()}
									</Tooltip>
								))}
							</div>
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
				csvFileName={`defillama-${namePrefix}${props.chain || 'all'}-protocols`}
			/>
		</>
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

const COLUMN_REGISTRY: Record<string, any> = {
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
	'mcap/tvl': columnHelper.accessor((p) => (p.mcap && p.tvl ? formatNum(p.mcap / p.tvl) : null), {
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
	dex_aggregator_volume_7d: columnHelper.accessor((p) => p.dexVolume?.total7d, {
		id: 'dex_aggregator_volume_7d',
		header: 'DEX Aggregator Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['7d'] },
		size: 140
	}),
	dex_aggregator_volume_30d: columnHelper.accessor((p) => p.dexVolume?.total30d, {
		id: 'dex_aggregator_volume_30d',
		header: 'DEX Aggregator Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['30d'] },
		size: 148
	}),
	dex_aggregator_volume_24h: columnHelper.accessor((p) => p.dexVolume?.total24h, {
		id: 'dex_aggregator_volume_24h',
		header: 'DEX Aggregator Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['24h'] },
		size: 148
	}),
	prediction_market_volume_7d: columnHelper.accessor((p) => p.dexVolume?.total7d, {
		id: 'prediction_market_volume_7d',
		header: 'Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 140
	}),
	prediction_market_volume_30d: columnHelper.accessor((p) => p.dexVolume?.total30d, {
		id: 'prediction_market_volume_30d',
		header: 'Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 148
	}),
	prediction_market_volume_24h: columnHelper.accessor((p) => p.dexVolume?.total24h, {
		id: 'prediction_market_volume_24h',
		header: 'Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 148
	}),
	crypto_card_issuer_volume_7d: columnHelper.accessor((p) => p.dexVolume?.total7d, {
		id: 'crypto_card_issuer_volume_7d',
		header: 'Volume 7d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 140
	}),
	crypto_card_issuer_volume_30d: columnHelper.accessor((p) => p.dexVolume?.total30d, {
		id: 'crypto_card_issuer_volume_30d',
		header: 'Volume 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 148
	}),
	crypto_card_issuer_volume_24h: columnHelper.accessor((p) => p.dexVolume?.total24h, {
		id: 'crypto_card_issuer_volume_24h',
		header: 'Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end' },
		size: 148
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

function getColumnsForCategory(effectiveCategory: string | null) {
	const columnIds = getProtocolCategoryColumns(effectiveCategory)
	return columnIds.map((id) => COLUMN_REGISTRY[id]).filter(Boolean)
}
