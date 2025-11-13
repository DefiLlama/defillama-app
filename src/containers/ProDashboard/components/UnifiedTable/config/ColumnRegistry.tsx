import { type ReactNode } from 'react'
import { ColumnDef, Row, type CellContext } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainIconUrl, formattedNum, formattedPercent, slug } from '~/utils'
import { SkeletonCell } from '../core/SkeletonCell'
import type { PriorityMetric } from '../strategies/hooks/usePriorityChainDatasets'
import type { NumericMetrics, UnifiedRowNode } from '../types'
import { isColumnSupported } from './metricCapabilities'

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData, TValue> {
		metricDeps?: PriorityMetric[]
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

type TableMeta = {
	chainLoadingStates?: Map<string, Set<PriorityMetric>>
	explodeByChain?: boolean
}

type ColumnMeta = {
	align?: 'start' | 'end'
	metricDeps?: PriorityMetric[]
}

type MetricKey = keyof NumericMetrics

const normalizeChainName = (value: string | null | undefined) => (value ? value.trim().toLowerCase() : '')

const METRIC_DEPENDENCIES: Partial<Record<MetricKey, PriorityMetric[]>> = {
	volume24h: ['volume'],
	volume_7d: ['volume'],
	volume_30d: ['volume'],
	cumulativeVolume: ['volume'],
	volumeChange_1d: ['volume'],
	volumeChange_7d: ['volume'],
	volumeChange_1m: ['volume'],
	volumeDominance_24h: ['volume'],
	volumeMarketShare7d: ['volume'],
	fees24h: ['fees'],
	fees_7d: ['fees'],
	fees_30d: ['fees'],
	fees_1y: ['fees'],
	average_1y: ['fees'],
	cumulativeFees: ['fees'],
	userFees_24h: ['fees'],
	holderRevenue_24h: ['fees'],
	holdersRevenue30d: ['fees'],
	holdersRevenueChange_30dover30d: ['fees'],
	treasuryRevenue_24h: ['fees'],
	supplySideRevenue_24h: ['fees'],
	feesChange_1d: ['fees'],
	feesChange_7d: ['fees'],
	feesChange_1m: ['fees'],
	feesChange_7dover7d: ['fees'],
	feesChange_30dover30d: ['fees'],
	revenue24h: ['fees'],
	revenue_7d: ['fees'],
	revenue_30d: ['fees'],
	revenue_1y: ['fees'],
	average_revenue_1y: ['fees'],
	revenueChange_1d: ['fees'],
	revenueChange_7d: ['fees'],
	revenueChange_1m: ['fees'],
	revenueChange_7dover7d: ['fees'],
	revenueChange_30dover30d: ['fees'],
	perpsVolume24h: ['perps'],
	perps_volume_7d: ['perps'],
	perps_volume_30d: ['perps'],
	perps_volume_change_1d: ['perps'],
	perps_volume_change_7d: ['perps'],
	perps_volume_change_1m: ['perps'],
	perps_volume_dominance_24h: ['perps'],
	openInterest: ['open-interest']
}

const getMetricDependencies = (columnId: string, meta: ColumnMeta | undefined): PriorityMetric[] => {
	if (meta?.metricDeps?.length) {
		return meta.metricDeps
	}
	const deps = METRIC_DEPENDENCIES[columnId as MetricKey]
	return deps ?? []
}

const getChainMetricLoadingState = (
	ctx: CellContext<UnifiedRowNode, unknown>
): { normalized: string; metrics: Set<PriorityMetric> } | null => {
	const meta = ctx.table.options.meta as TableMeta | undefined
	if (!meta?.chainLoadingStates || meta.chainLoadingStates.size === 0) {
		return null
	}

	const node = ctx.row.original
	if (!node) return null

	let chainName: string | null = null
	if (node.header === 'chain' && typeof node.label === 'string') {
		chainName = node.label
	} else if (node.type === 'leaf') {
		chainName = node.original?.chain ?? null
	}

	if (!chainName || chainName === 'All Chains') {
		return null
	}

	const normalized = normalizeChainName(chainName)
	const loadingSet = normalized ? (meta.chainLoadingStates.get(normalized) ?? null) : null
	if (!loadingSet || loadingSet.size === 0) {
		return null
	}

	return { normalized, metrics: loadingSet }
}

const renderMetricCell = (
	ctx: CellContext<UnifiedRowNode, unknown>,
	renderer: (value: number | null | undefined) => ReactNode
) => {
	const columnId = typeof ctx.column.id === 'string' ? ctx.column.id : ''
	const metricDeps = getMetricDependencies(columnId, ctx.column.columnDef.meta as ColumnMeta)
	if (metricDeps.length) {
		const chainLoadingState = getChainMetricLoadingState(ctx)
		if (chainLoadingState && metricDeps.some((metric) => chainLoadingState.metrics.has(metric))) {
			return <SkeletonCell />
		}
	}

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
	(row: UnifiedRowNode): number | null =>
		row.metrics?.[key] ?? null

const applyNumericColumnSorting = (rowA: Row<UnifiedRowNode>, rowB: Row<UnifiedRowNode>, columnId: string) => {
	const a = rowA.getValue(columnId) as number | null | undefined
	const b = rowB.getValue(columnId) as number | null | undefined
	return numericSorting(a, b)
}

const createUsdMetricColumn = (key: MetricKey, header: string): ColumnDef<UnifiedRowNode> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end', metricDeps: METRIC_DEPENDENCIES[key] },
	cell: (ctx) => renderMetricCell(ctx, renderUsd),
	sortingFn: applyNumericColumnSorting
})

const createPercentMetricColumn = (key: MetricKey, header: string): ColumnDef<UnifiedRowNode> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end', metricDeps: METRIC_DEPENDENCIES[key] },
	cell: (ctx) => renderMetricCell(ctx, renderPercent),
	sortingFn: applyNumericColumnSorting
})

const createRatioMetricColumn = (key: MetricKey, header: string): ColumnDef<UnifiedRowNode> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end', metricDeps: METRIC_DEPENDENCIES[key] },
	cell: (ctx) => renderMetricCell(ctx, renderRatio),
	sortingFn: applyNumericColumnSorting
})

const createNumberMetricColumn = (key: MetricKey, header: string): ColumnDef<UnifiedRowNode> => ({
	id: key,
	header,
	accessorFn: metricAccessor(key),
	meta: { align: 'end', metricDeps: METRIC_DEPENDENCIES[key] },
	cell: (ctx) => renderMetricCell(ctx, renderNumber),
	sortingFn: applyNumericColumnSorting
})

export const getUnifiedTableColumns = (strategyType: 'protocols' | 'chains'): ColumnDef<UnifiedRowNode>[] => {
	const columns: ColumnDef<UnifiedRowNode>[] = [
		{
			id: 'name',
			header: 'Name',
			accessorFn: (row) => row.label,
			size: 280,
			meta: {
				align: 'start'
			},
			cell: ({ row, getValue }) => {
				const value = getValue() as string
				const depth = row.depth
				const node = row.original
				const normalized = node?.original
				const canExpand = row.getCanExpand()
				const isExpanded = row.getIsExpanded()
				const displayName = normalized?.displayName ?? value
				const strategyType = normalized?.strategyType
				const nodeKind = node?.groupKind
				const header = node?.header
				const iconUrl =
					node?.iconUrl ?? normalized?.logo ?? (nodeKind === 'parent' ? (normalized?.parentProtocolLogo ?? null) : null)
				const shouldShowProtocolLogo = strategyType === 'protocols' || nodeKind === 'parent' || header === 'protocol'
				const shouldShowChainIcon = header === 'chain'
				const chainIcon = shouldShowChainIcon ? chainIconUrl(value) : null

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
						{shouldShowProtocolLogo || shouldShowChainIcon ? (
							<TokenLogo
								logo={shouldShowChainIcon ? chainIcon : (iconUrl ?? undefined)}
								fallbackLogo="/icons/placeholder.png"
								size={24}
							/>
						) : (
							<span className="inline-block h-6 w-6 shrink-0" />
						)}
						<span className="font-medium text-(--text-primary)">{displayName}</span>
						{node?.metrics?.protocolCount && node.metrics.protocolCount > 1 && (
							<span className="text-xs text-(--text-tertiary)">{node.metrics.protocolCount} protocols</span>
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
			// Prefer normalized row-level oracles (which include chain-specific values when exploded),
			// fallback to the underlying original protocol payload if missing.
			accessorFn: (row) => row.original?.oracles ?? row.original?.original?.oracles ?? [],
			enableSorting: false,
			size: 200,
			meta: {
				align: 'end'
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
		createNumberMetricColumn('protocolCount' as MetricKey, 'Protocols'),
		createNumberMetricColumn('users' as MetricKey, 'Active Addresses'),
		{
			id: 'tvl',
			header: 'TVL',
			accessorFn: (row) => row.metrics.tvl ?? null,
			meta: { align: 'end' },
			cell: (ctx) => renderMetricCell(ctx, renderUsd),
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
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		}
	]

	const volumeColumns: ColumnDef<UnifiedRowNode>[] = [
		createUsdMetricColumn('volume_7d' as MetricKey, '7d Volume'),
		createUsdMetricColumn('volume_30d' as MetricKey, '30d Volume'),
		createUsdMetricColumn('cumulativeVolume' as MetricKey, 'Cumulative Volume'),
		createPercentMetricColumn('volumeChange_1d' as MetricKey, '1d Volume Change'),
		createPercentMetricColumn('volumeChange_7d' as MetricKey, '7d Volume Change'),
		createPercentMetricColumn('volumeChange_1m' as MetricKey, '30d Volume Change'),
		createPercentMetricColumn('volumeDominance_24h' as MetricKey, '24h Volume Share'),
		createPercentMetricColumn('volumeMarketShare7d' as MetricKey, '7d Volume Share'),
		createUsdMetricColumn('nftVolume' as MetricKey, 'NFT Volume'),
		createPercentMetricColumn('volume24hShare' as MetricKey, '24h Volume Share')
	]

	const feesColumns: ColumnDef<UnifiedRowNode>[] = [
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

	const revenueColumns: ColumnDef<UnifiedRowNode>[] = [
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

	const perpsColumns: ColumnDef<UnifiedRowNode>[] = [
		createUsdMetricColumn('perps_volume_7d' as MetricKey, '7d Perps Volume'),
		createUsdMetricColumn('perps_volume_30d' as MetricKey, '30d Perps Volume'),
		createPercentMetricColumn('perps_volume_change_1d' as MetricKey, '1d Perps Volume Change'),
		createPercentMetricColumn('perps_volume_change_7d' as MetricKey, '7d Perps Volume Change'),
		createPercentMetricColumn('perps_volume_change_1m' as MetricKey, '30d Perps Volume Change'),
		createPercentMetricColumn('perps_volume_dominance_24h' as MetricKey, '24h Perps Volume Share')
	]

	const earningsColumns: ColumnDef<UnifiedRowNode>[] = [
		createUsdMetricColumn('earnings_24h' as MetricKey, '24h Earnings'),
		createUsdMetricColumn('earnings_7d' as MetricKey, '7d Earnings'),
		createUsdMetricColumn('earnings_30d' as MetricKey, '30d Earnings'),
		createUsdMetricColumn('earnings_1y' as MetricKey, '1y Earnings'),
		createPercentMetricColumn('earningsChange_1d' as MetricKey, '1d Earnings Change'),
		createPercentMetricColumn('earningsChange_7d' as MetricKey, '7d Earnings Change'),
		createPercentMetricColumn('earningsChange_1m' as MetricKey, '30d Earnings Change')
	]

	const dexAggregatorColumns: ColumnDef<UnifiedRowNode>[] = [
		createUsdMetricColumn('aggregators_volume_24h' as MetricKey, '24h Aggregator Volume'),
		createUsdMetricColumn('aggregators_volume_7d' as MetricKey, '7d Aggregator Volume'),
		createUsdMetricColumn('aggregators_volume_30d' as MetricKey, '30d Aggregator Volume'),
		createPercentMetricColumn('aggregators_volume_change_1d' as MetricKey, '1d Aggregator Volume Change'),
		createPercentMetricColumn('aggregators_volume_change_7d' as MetricKey, '7d Aggregator Volume Change'),
		createPercentMetricColumn('aggregators_volume_dominance_24h' as MetricKey, '24h Aggregator Volume Share'),
		createPercentMetricColumn('aggregators_volume_marketShare7d' as MetricKey, '7d Aggregator Volume Share')
	]

	const bridgeAggregatorColumns: ColumnDef<UnifiedRowNode>[] = [
		createUsdMetricColumn('bridge_aggregators_volume_24h' as MetricKey, '24h Bridge Aggregator Volume'),
		createUsdMetricColumn('bridge_aggregators_volume_7d' as MetricKey, '7d Bridge Aggregator Volume'),
		createUsdMetricColumn('bridge_aggregators_volume_30d' as MetricKey, '30d Bridge Aggregator Volume'),
		createPercentMetricColumn('bridge_aggregators_volume_change_1d' as MetricKey, '1d Bridge Aggregator Volume Change'),
		createPercentMetricColumn('bridge_aggregators_volume_change_7d' as MetricKey, '7d Bridge Aggregator Volume Change'),
		createPercentMetricColumn('bridge_aggregators_volume_dominance_24h' as MetricKey, '24h Bridge Aggregator Share')
	]

	const optionsColumns: ColumnDef<UnifiedRowNode>[] = [
		createUsdMetricColumn('options_volume_24h' as MetricKey, '24h Options Volume'),
		createUsdMetricColumn('options_volume_7d' as MetricKey, '7d Options Volume'),
		createUsdMetricColumn('options_volume_30d' as MetricKey, '30d Options Volume'),
		createPercentMetricColumn('options_volume_change_1d' as MetricKey, '1d Options Volume Change'),
		createPercentMetricColumn('options_volume_change_7d' as MetricKey, '7d Options Volume Change'),
		createPercentMetricColumn('options_volume_dominance_24h' as MetricKey, '24h Options Volume Share')
	]

	const ratioColumns: ColumnDef<UnifiedRowNode>[] = [
		createRatioMetricColumn('mcaptvl' as MetricKey, 'Mcap / TVL'),
		createRatioMetricColumn('pf' as MetricKey, 'P/F'),
		createRatioMetricColumn('ps' as MetricKey, 'P/S')
	]

	columns.push(
		...volumeColumns,
		...feesColumns,
		...revenueColumns,
		...perpsColumns,
		...earningsColumns,
		...dexAggregatorColumns,
		...bridgeAggregatorColumns,
		...optionsColumns,
		...ratioColumns
	)

	return columns.filter((col) => isColumnSupported(String(col.id), strategyType))
}
