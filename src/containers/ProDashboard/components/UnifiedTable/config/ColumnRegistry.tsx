import { ColumnDef } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent } from '~/utils'
import type { UnifiedRowNode } from '../types'

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
	return formattedPercent(value)
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
					node?.iconUrl ??
					normalized?.logo ??
					(nodeKind === 'parent' ? normalized?.parentProtocolLogo ?? null : null)
				const shouldShowProtocolLogo =
					strategyType === 'protocols' || nodeKind === 'parent' || header === 'protocol'

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
						{shouldShowProtocolLogo ? (
							<TokenLogo logo={iconUrl ?? undefined} fallbackLogo="/icons/placeholder.png" size={24} />
						) : (
							<span className="inline-block h-6 w-6 shrink-0" />
						)}
						<span className="font-medium text-(--text-primary)">{displayName}</span>
						{node?.metrics?.protocolCount && node.metrics.protocolCount > 1 && (
							<span className="text-xs text-(--text-tertiary)">
								{node.metrics.protocolCount} protocols
							</span>
						)}
					</div>
				)
			}
		},
		{
			id: 'tvl',
			header: 'TVL',
			accessorFn: (row) => row.metrics.tvl ?? null,
			meta: { align: 'end' },
			cell: ({ getValue }) => renderUsd(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderPercent(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderPercent(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderPercent(getValue() as number | null | undefined),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		},
		{
			id: 'fees24h',
			header: '24h Fees',
			accessorFn: (row) => row.metrics.fees24h ?? null,
			meta: { align: 'end' },
			cell: ({ getValue }) => renderUsd(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderUsd(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderUsd(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderUsd(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderUsd(getValue() as number | null | undefined),
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
			cell: ({ getValue }) => renderUsd(getValue() as number | null | undefined),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue(columnId) as number | null | undefined
				const b = rowB.getValue(columnId) as number | null | undefined
				return numericSorting(a, b)
			}
		}
	]

	if (strategyType === 'chains') {
		// For chains we skip perps/open interest columns if they are always null
		return columns.map((column) => {
			if (column.id === 'perpsVolume24h' || column.id === 'openInterest') {
				return {
					...column,
					enableHiding: true
				}
			}
			return column
		})
	}

	return columns
}
