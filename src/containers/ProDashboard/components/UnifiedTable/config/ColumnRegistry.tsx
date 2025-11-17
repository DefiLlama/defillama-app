import { type ReactNode } from 'react'
import { ColumnDef, Row, type CellContext } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, formattedPercent, slug } from '~/utils'
import type { UnifiedRowHeaderType } from '../../../types'
import { ROW_HEADER_GROUPING_COLUMN_IDS } from '../core/grouping'
import {
	getAggregationContextFromLeafRows,
	getChainNameForRow,
	getGroupingKeyForRow,
	getRowDisplayProps
} from '../core/groupingUtils'
import type { MetricGroup, NormalizedRow, NumericMetrics } from '../types'
import { COLUMN_DICTIONARY_BY_ID } from './ColumnDictionary'
import { isColumnSupported } from './metricCapabilities'

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData, TValue> {
		align?: 'start' | 'center' | 'end'
		hidden?: boolean
	}
}

const renderDash = () => <span className="pro-text3">-</span>

const renderUsd = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return renderDash()
	}
	return <span className="pro-text2">{formattedNum(value, true)}</span>
}

const renderNumber = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return renderDash()
	}
	return <span className="pro-text2">{formattedNum(value, false)}</span>
}

const renderPercent = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return renderDash()
	}
	return <span className="pro-text2">{formattedPercent(value)}</span>
}

const renderRatio = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return renderDash()
	}
	return <span className="pro-text2">{`${formattedNum(value, false)}x`}</span>
}

type MetricKey = keyof NumericMetrics

const renderMetricCell = (
	ctx: CellContext<NormalizedRow, unknown>,
	renderer: (value: number | null | undefined) => ReactNode
) => {
	return renderer(ctx.getValue() as number | null | undefined)
}

const numericSorting = (a: number | null | undefined, b: number | null | undefined) => {
	if (a === null || a === undefined) {
		return b === null || b === undefined ? 0 : -1
	}
	if (b === null || b === undefined) {
		return 1
	}
	return a - b
}

const metricAccessor =
	(key: MetricKey) =>
	(row: NormalizedRow): number | null =>
		row.metrics?.[key] ?? null

const applyNumericColumnSorting = (rowA: Row<NormalizedRow>, rowB: Row<NormalizedRow>, columnId: string) => {
	const a = rowA.getValue(columnId) as number | null | undefined
	const b = rowB.getValue(columnId) as number | null | undefined
	return numericSorting(a, b)
}

const createMetricAggregationFn = (key: MetricKey) => {
	return (_columnId: string, leafRows: Row<NormalizedRow>[]): number | null => {
		if (!leafRows.length) {
			return null
		}
		const context = getAggregationContextFromLeafRows(leafRows)
		const value = context.metrics?.[key]
		return typeof value === 'number' ? value : (value ?? null)
	}
}

const createUsdMetricColumn = (key: MetricKey, header: string): ColumnDef<NormalizedRow> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end' },
	cell: (ctx) => renderMetricCell(ctx, renderUsd),
	sortingFn: applyNumericColumnSorting,
	aggregationFn: createMetricAggregationFn(key)
})

const createPercentMetricColumn = (key: MetricKey, header: string): ColumnDef<NormalizedRow> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end' },
	cell: (ctx) => renderMetricCell(ctx, renderPercent),
	sortingFn: applyNumericColumnSorting,
	aggregationFn: createMetricAggregationFn(key)
})

const createRatioMetricColumn = (key: MetricKey, header: string): ColumnDef<NormalizedRow> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end' },
	cell: (ctx) => renderMetricCell(ctx, renderRatio),
	sortingFn: applyNumericColumnSorting,
	aggregationFn: createMetricAggregationFn(key)
})

const createNumberMetricColumn = (key: MetricKey, header: string): ColumnDef<NormalizedRow> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end' },
	cell: (ctx) => renderMetricCell(ctx, renderNumber),
	sortingFn: applyNumericColumnSorting,
	aggregationFn: createMetricAggregationFn(key)
})

const groupingColumns: ColumnDef<NormalizedRow>[] = (
	Object.entries(ROW_HEADER_GROUPING_COLUMN_IDS) as Array<[UnifiedRowHeaderType, string]>
).map(([header, columnId]) => ({
	id: columnId,
	header,
	accessorFn: (row) => getGroupingKeyForRow(row, header),
	enableSorting: false,
	enableHiding: false,
	enableColumnFilter: false,
	enableResizing: false,
	size: 0,
	minSize: 0,
	maxSize: 0,
	aggregationFn: (_columnId, leafRows) => leafRows[0]?.getGroupingValue(columnId) ?? null,
	meta: {
		hidden: true
	}
}))

export const getUnifiedTableColumns = (strategyType: 'protocols' | 'chains'): ColumnDef<NormalizedRow>[] => {
	const columns: ColumnDef<NormalizedRow>[] = [
		{
			id: 'name',
			header: 'Name',
			accessorFn: (row) => row.displayName ?? row.name,
			size: 280,
			meta: {
				align: 'start'
			},
			cell: ({ row }) => {
				const display = getRowDisplayProps(row)
				const depth = row.depth
				const canExpand = row.getCanExpand()
				const isExpanded = row.getIsExpanded()
				const baseRow = display.original ?? row.original
				const strategyType = baseRow?.strategyType
				const shouldShowChainIcon = display.header === 'chain'
				const shouldShowProtocolLogo =
					!shouldShowChainIcon &&
					display.header !== 'category' &&
					(strategyType === 'protocols' || display.groupKind === 'parent' || display.header === 'protocol')
				const chainIcon = shouldShowChainIcon ? chainIconUrl(display.label) : null
				const iconSource = shouldShowChainIcon ? chainIcon : (display.iconUrl ?? baseRow?.logo ?? undefined)
				const protocolCountValue = row.getIsGrouped()
					? ((row.getValue('protocolCount') as number | null) ?? null)
					: (baseRow?.metrics?.protocolCount ?? null)

				return (
					<div
						className="flex items-center gap-2"
						style={{
							paddingLeft: `${depth * 16}px`
						}}
					>
						{canExpand ? (
							<button
								type="button"
								onClick={row.getToggleExpandedHandler()}
								className="rounded-md p-1 transition-colors hover:bg-(--bg-tertiary)"
							>
								<Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} height={12} width={12} />
							</button>
						) : (
							<span className="w-4" />
						)}
						{display.header !== 'category' &&
							(shouldShowProtocolLogo || shouldShowChainIcon ? (
								<TokenLogo logo={iconSource ?? undefined} fallbackLogo="/icons/placeholder.png" size={24} />
							) : (
								<span className="inline-block h-6 w-6 shrink-0" />
							))}
						<span className="font-medium text-(--text-primary)">{display.label}</span>
						{protocolCountValue && protocolCountValue > 1 && (
							<span className="text-xs text-(--text-tertiary)">{protocolCountValue} protocols</span>
						)}
					</div>
				)
			}
		},
		{
			id: 'category',
			header: 'Category',
			accessorFn: (row) => row.category ?? null,
			enableSorting: false,
			size: 160,
			meta: {
				align: 'start'
			},
			aggregationFn: (_columnId, leafRows) => {
				if (!leafRows.length) {
					return null
				}
				return getAggregationContextFromLeafRows(leafRows).category
			},
			cell: ({ getValue }) => {
				const category = getValue() as string | null | undefined
				if (!category) {
					return renderDash()
				}
				return (
					<BasicLink href={`/protocols/${category}`} className="text-sm font-medium text-(--link-text) hover:underline">
						{category}
					</BasicLink>
				)
			}
		},
		{
			id: 'chains',
			header: 'Chains',
			accessorFn: (row) => row.chains ?? [],
			enableSorting: false,
			size: 200,
			meta: {
				align: 'end'
			},
			aggregationFn: (_columnId, leafRows) => {
				if (!leafRows.length) {
					return []
				}
				return getAggregationContextFromLeafRows(leafRows).chains
			},
			cell: ({ getValue }) => {
				const chains = (getValue() as string[]) ?? []
				if (!chains.length) {
					return renderDash()
				}
				return <IconsRow links={chains} url="/chain" iconType="chain" />
			}
		},
		{
			id: 'oracles',
			header: 'Oracles',
			accessorFn: (row) => row.oracles ?? [],
			enableSorting: false,
			size: 200,
			meta: {
				align: 'end'
			},
			aggregationFn: (_columnId, leafRows) => {
				if (!leafRows.length) {
					return []
				}
				return getAggregationContextFromLeafRows(leafRows).oracles
			},
			cell: ({ getValue }) => {
				const oracles = (getValue() as string[]) ?? []
				if (!oracles.length) {
					return renderDash()
				}
				const visible = oracles.slice(0, 3)
				const extra = oracles.length - visible.length
				return (
					<span className="flex flex-wrap items-center justify-end gap-1">
						{visible.map((oracle) => (
							<BasicLink
								key={oracle}
								href={`/oracles/${slug(oracle)}`}
								className="text-sm font-medium text-(--link-text) hover:underline"
							>
								{oracle}
							</BasicLink>
						))}
						{extra > 0 ? <Tooltip content={oracles.slice(3).join(', ')}>+{extra}</Tooltip> : null}
					</span>
				)
			}
		},
		{
			id: 'tvl',
			header: 'TVL',
			accessorFn: (row) => row.metrics.tvl ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
			aggregationFn: createMetricAggregationFn('tvl' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'change1d',
			header: '1d Change',
			accessorFn: (row) => row.metrics.change1d ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderPercent),
			aggregationFn: createMetricAggregationFn('change1d' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'change7d',
			header: '7d Change',
			accessorFn: (row) => row.metrics.change7d ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderPercent),
			aggregationFn: createMetricAggregationFn('change7d' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'change1m',
			header: '30d Change',
			accessorFn: (row) => row.metrics.change1m ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderPercent),
			aggregationFn: createMetricAggregationFn('change1m' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		createUsdMetricColumn('bridgedTvl' as MetricKey, 'Bridged TVL'),
		createUsdMetricColumn('stablesMcap' as MetricKey, 'Stables'),
		createPercentMetricColumn('tvlShare' as MetricKey, 'TVL Share'),
		createPercentMetricColumn('stablesShare' as MetricKey, 'Stables Share'),
		{
			id: 'fees24h',
			header: '24h Fees',
			accessorFn: (row) => row.metrics.fees24h ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
			aggregationFn: createMetricAggregationFn('fees24h' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'revenue24h',
			header: '24h Revenue',
			accessorFn: (row) => row.metrics.revenue24h ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
			aggregationFn: createMetricAggregationFn('revenue24h' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'volume24h',
			header: '24h Volume',
			accessorFn: (row) => row.metrics.volume24h ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
			aggregationFn: createMetricAggregationFn('volume24h' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'perpsVolume24h',
			header: '24h Perps Volume',
			accessorFn: (row) => row.metrics.perpsVolume24h ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
			aggregationFn: createMetricAggregationFn('perpsVolume24h' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'openInterest',
			header: 'Open Interest',
			accessorFn: (row) => row.metrics.openInterest ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
			aggregationFn: createMetricAggregationFn('openInterest' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'mcap',
			header: 'Market Cap',
			accessorFn: (row) => row.metrics.mcap ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
			aggregationFn: createMetricAggregationFn('mcap' as MetricKey),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		}
	]

	const volumeColumns: ColumnDef<NormalizedRow>[] = [
		createUsdMetricColumn('volume_7d' as MetricKey, '7d Volume'),
		createUsdMetricColumn('volume_30d' as MetricKey, '30d Volume'),
		createUsdMetricColumn('cumulativeVolume' as MetricKey, 'Cumulative Volume'),
		createPercentMetricColumn('volumeChange_1d' as MetricKey, '1d Volume Change'),
		createPercentMetricColumn('volumeChange_7d' as MetricKey, '7d Volume Change'),
		createPercentMetricColumn('volumeChange_1m' as MetricKey, '30d Volume Change'),
		createPercentMetricColumn('volumeDominance_24h' as MetricKey, '24h Volume Share'),
		createPercentMetricColumn('volumeMarketShare7d' as MetricKey, '7d Volume Share'),
		createPercentMetricColumn('volume24hShare' as MetricKey, '24h Volume Share')
	]

	const feesColumns: ColumnDef<NormalizedRow>[] = [
		createUsdMetricColumn('fees_7d' as MetricKey, '7d Fees'),
		createUsdMetricColumn('fees_30d' as MetricKey, '30d Fees'),
		createUsdMetricColumn('fees_1y' as MetricKey, '1y Fees'),
		createUsdMetricColumn('average_1y' as MetricKey, '1y Monthly Avg Fees'),
		createUsdMetricColumn('cumulativeFees' as MetricKey, 'Cumulative Fees'),
		createUsdMetricColumn('userFees_24h' as MetricKey, '24h User Fees'),
		createUsdMetricColumn('holderRevenue_24h' as MetricKey, '24h Holder Revenue'),
		createUsdMetricColumn('holdersRevenue30d' as MetricKey, '30d Holder Revenue'),
		createUsdMetricColumn('treasuryRevenue_24h' as MetricKey, '24h Treasury Revenue'),
		createUsdMetricColumn('supplySideRevenue_24h' as MetricKey, '24h Supply-Side Revenue'),
		createPercentMetricColumn('feesChange_1d' as MetricKey, '1d Fees Change'),
		createPercentMetricColumn('feesChange_7d' as MetricKey, '7d Fees Change'),
		createPercentMetricColumn('feesChange_1m' as MetricKey, '30d Fees Change'),
		createPercentMetricColumn('feesChange_7dover7d' as MetricKey, '7d/7d Fees Change'),
		createPercentMetricColumn('feesChange_30dover30d' as MetricKey, '30d/30d Fees Change'),
		createPercentMetricColumn('holdersRevenueChange_30dover30d' as MetricKey, '30d/30d Holder Rev Change')
	]

	const revenueColumns: ColumnDef<NormalizedRow>[] = [
		createUsdMetricColumn('revenue_7d' as MetricKey, '7d Revenue'),
		createUsdMetricColumn('revenue_30d' as MetricKey, '30d Revenue'),
		createUsdMetricColumn('revenue_1y' as MetricKey, '1y Revenue'),
		createUsdMetricColumn('average_revenue_1y' as MetricKey, '1y Monthly Avg Revenue'),
		createPercentMetricColumn('revenueChange_1d' as MetricKey, '1d Revenue Change'),
		createPercentMetricColumn('revenueChange_7d' as MetricKey, '7d Revenue Change'),
		createPercentMetricColumn('revenueChange_1m' as MetricKey, '30d Revenue Change'),
		createPercentMetricColumn('revenueChange_7dover7d' as MetricKey, '7d/7d Revenue Change'),
		createPercentMetricColumn('revenueChange_30dover30d' as MetricKey, '30d/30d Revenue Change')
	]

	const perpsColumns: ColumnDef<NormalizedRow>[] = [
		createUsdMetricColumn('perps_volume_7d' as MetricKey, '7d Perps Volume'),
		createUsdMetricColumn('perps_volume_30d' as MetricKey, '30d Perps Volume'),
		createPercentMetricColumn('perps_volume_change_1d' as MetricKey, '1d Perps Volume Change'),
		createPercentMetricColumn('perps_volume_change_7d' as MetricKey, '7d Perps Volume Change'),
		createPercentMetricColumn('perps_volume_change_1m' as MetricKey, '30d Perps Volume Change'),
		createPercentMetricColumn('perps_volume_dominance_24h' as MetricKey, '24h Perps Volume Share')
	]

	const dexAggregatorColumns: ColumnDef<NormalizedRow>[] = [
		createUsdMetricColumn('aggregators_volume_24h' as MetricKey, '24h Aggregator Volume'),
		createUsdMetricColumn('aggregators_volume_7d' as MetricKey, '7d Aggregator Volume'),
		createUsdMetricColumn('aggregators_volume_30d' as MetricKey, '30d Aggregator Volume'),
		createPercentMetricColumn('aggregators_volume_change_1d' as MetricKey, '1d Aggregator Volume Change'),
		createPercentMetricColumn('aggregators_volume_change_7d' as MetricKey, '7d Aggregator Volume Change'),
		createPercentMetricColumn('aggregators_volume_dominance_24h' as MetricKey, '24h Aggregator Volume Share'),
		createPercentMetricColumn('aggregators_volume_marketShare7d' as MetricKey, '7d Aggregator Volume Share')
	]

	const derivativesAggregatorColumns: ColumnDef<NormalizedRow>[] = [
		createUsdMetricColumn('derivatives_aggregators_volume_24h' as MetricKey, '24h Derivatives Aggregator Volume'),
		createUsdMetricColumn('derivatives_aggregators_volume_7d' as MetricKey, '7d Derivatives Aggregator Volume'),
		createUsdMetricColumn('derivatives_aggregators_volume_30d' as MetricKey, '30d Derivatives Aggregator Volume'),
		createPercentMetricColumn(
			'derivatives_aggregators_volume_change_1d' as MetricKey,
			'1d Derivatives Aggregator Change'
		),
		createPercentMetricColumn(
			'derivatives_aggregators_volume_change_7d' as MetricKey,
			'7d Derivatives Aggregator Change'
		),
		createPercentMetricColumn(
			'derivatives_aggregators_volume_change_1m' as MetricKey,
			'30d Derivatives Aggregator Change'
		)
	]

	const optionsColumns: ColumnDef<NormalizedRow>[] = [
		createUsdMetricColumn('options_volume_24h' as MetricKey, '24h Options Volume'),
		createUsdMetricColumn('options_volume_7d' as MetricKey, '7d Options Volume'),
		createUsdMetricColumn('options_volume_30d' as MetricKey, '30d Options Volume'),
		createPercentMetricColumn('options_volume_change_1d' as MetricKey, '1d Options Volume Change'),
		createPercentMetricColumn('options_volume_change_7d' as MetricKey, '7d Options Volume Change'),
		createPercentMetricColumn('options_volume_dominance_24h' as MetricKey, '24h Options Volume Share')
	]

	const ratioColumns: ColumnDef<NormalizedRow>[] = [
		createRatioMetricColumn('mcaptvl' as MetricKey, 'Mcap / TVL'),
		createRatioMetricColumn('pf' as MetricKey, 'P/F'),
		createRatioMetricColumn('ps' as MetricKey, 'P/S')
	]

	const allMetricColumns = [
		...volumeColumns,
		...feesColumns,
		...revenueColumns,
		...perpsColumns,
		...dexAggregatorColumns,
		...derivativesAggregatorColumns,
		...optionsColumns,
		...ratioColumns
	]

	const allColumns = [...columns, ...allMetricColumns]

	const groupLabelMap: Record<MetricGroup, string> = {
		tvl: 'TVL',
		volume: 'Volume',
		fees: 'Fees',
		revenue: 'Revenue',
		perps: 'Perps',
		aggregators: 'Aggregators',
		'derivatives-aggregators': 'Derivatives Aggregators',
		options: 'Options',
		ratios: 'Ratios'
	}

	const nameColumn = allColumns.find((col) => col.id === 'name')
	const metaColumns = allColumns.filter((col) => {
		const columnId = String(col.id)
		const dictEntry = COLUMN_DICTIONARY_BY_ID.get(columnId)
		return dictEntry?.group === 'meta'
	})

	const columnsByGroup = new Map<MetricGroup, ColumnDef<NormalizedRow>[]>()

	allColumns.forEach((col) => {
		const columnId = String(col.id)
		const dictEntry = COLUMN_DICTIONARY_BY_ID.get(columnId)
		if (!dictEntry || dictEntry.group === 'meta') return

		const group = dictEntry.group as MetricGroup

		if (!columnsByGroup.has(group)) {
			columnsByGroup.set(group, [])
		}
		columnsByGroup.get(group)!.push(col)
	})

	const groupedColumns: ColumnDef<NormalizedRow>[] = []

	if (nameColumn) {
		groupedColumns.push(nameColumn)
	}

	const supportedMetaColumns = metaColumns.filter((col) => isColumnSupported(String(col.id), strategyType))
	groupedColumns.push(...supportedMetaColumns)

	const groupOrder: MetricGroup[] = [
		'tvl',
		'volume',
		'fees',
		'revenue',
		'perps',
		'aggregators',
		'derivatives-aggregators',
		'options',
		'ratios'
	]

	for (const groupKey of groupOrder) {
		const groupColumns = columnsByGroup.get(groupKey)
		if (!groupColumns || groupColumns.length === 0) continue

		const supportedColumns = groupColumns.filter((col) => isColumnSupported(String(col.id), strategyType))
		if (supportedColumns.length === 0) continue

		groupedColumns.push({
			id: `group_${groupKey}`,
			header: groupLabelMap[groupKey],
			columns: supportedColumns,
			meta: { align: 'center' }
		})
	}

	return [...groupingColumns, ...groupedColumns]
}
