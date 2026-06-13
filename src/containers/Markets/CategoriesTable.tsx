import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { type Segment, segmentHasOi } from './segments'
import { CategoryLink, ChangeCell, renderFunding8h, renderLeverage, renderUsd } from './shared'
import type { CategoryStat } from './types'
import { pctChange } from './utils'

const columnHelper = createColumnHelper<CategoryStat>()

function renderShare(value: number, total: number): string {
	return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '–'
}

function buildColumns(segment: Segment, totalVolume: number): ColumnDef<CategoryStat, any>[] {
	const hasOi = segmentHasOi(segment)

	const columns: ColumnDef<CategoryStat, any>[] = [
		columnHelper.accessor('category', {
			id: 'category',
			header: 'Category',
			enableSorting: false,
			cell: ({ getValue }) => <CategoryLink tag={getValue()} />,
			meta: { headerClassName: 'w-[160px]' }
		}),
		columnHelper.accessor((row) => row.price_change_24h ?? undefined, {
			id: 'price_change_24h',
			header: 'Price Δ',
			cell: ({ row }) => <ChangeCell fraction={row.original.price_change_24h} />,
			meta: { headerClassName: 'w-[100px]', align: 'end' }
		}),
		columnHelper.accessor('volume_24h', {
			id: 'volume_24h',
			header: '24h Volume',
			cell: ({ getValue }) => renderUsd(getValue()),
			meta: { headerClassName: 'w-[120px]', align: 'end' as const }
		}),
		columnHelper.accessor((row) => pctChange(row.volume_24h, row.volume_prev_24h) ?? undefined, {
			id: 'volume_change_24h',
			header: 'Vol Δ',
			cell: ({ row }) => <ChangeCell fraction={pctChange(row.original.volume_24h, row.original.volume_prev_24h)} />,
			meta: { headerClassName: 'w-[100px]', align: 'end' }
		}),
		columnHelper.accessor('volume_24h', {
			id: 'share',
			header: 'Share',
			cell: ({ getValue }) => renderShare(getValue(), totalVolume),
			meta: {
				headerClassName: 'w-[90px]',
				align: 'end',
				headerHelperText: "Share of the segment's 24h volume (multi-tag tokens count in each category)"
			}
		})
	]

	if (hasOi) {
		columns.push(
			columnHelper.accessor((row) => row.oi_usd ?? undefined, {
				id: 'oi_usd',
				header: 'OI',
				cell: ({ row }) => renderUsd(row.original.oi_usd),
				meta: { headerClassName: 'w-[120px]', align: 'end' as const }
			}),
			columnHelper.accessor((row) => pctChange(row.oi_usd, row.oi_prev_usd) ?? undefined, {
				id: 'oi_change_24h',
				header: 'OI Δ',
				cell: ({ row }) => <ChangeCell fraction={pctChange(row.original.oi_usd, row.original.oi_prev_usd)} />,
				meta: { headerClassName: 'w-[100px]', align: 'end' }
			}),
			columnHelper.accessor((row) => row.funding_rate_8h ?? undefined, {
				id: 'funding_rate_8h',
				header: 'Funding 8h',
				cell: ({ row }) => renderFunding8h(row.original.funding_rate_8h),
				meta: {
					headerClassName: 'w-[110px]',
					align: 'end',
					headerHelperText: "Volume-weighted across the category's tokens"
				}
			})
		)
	}

	columns.push(
		columnHelper.accessor((row) => row.leverage_max ?? undefined, {
			id: 'leverage',
			header: 'Lev',
			cell: ({ row }) => renderLeverage(row.original.leverage_min, row.original.leverage_max),
			meta: { headerClassName: 'w-[90px]', align: 'end' }
		}),
		columnHelper.accessor('token_count', {
			id: 'token_count',
			header: 'Tokens',
			cell: ({ getValue }) => getValue() ?? '–',
			meta: { headerClassName: 'w-[90px]', align: 'end' }
		}),
		columnHelper.accessor('market_count', {
			id: 'market_count',
			header: 'Markets',
			cell: ({ getValue }) => getValue() ?? '–',
			meta: { headerClassName: 'w-[90px]', align: 'end' }
		})
	)

	return columns
}

export function CategoriesTable({ categories, segment }: { categories: CategoryStat[]; segment: Segment }) {
	const totalVolume = React.useMemo(() => {
		let total = 0
		for (const category of categories) total += category.volume_24h
		return total
	}, [categories])
	const columns = React.useMemo(() => buildColumns(segment, totalVolume), [segment, totalVolume])

	return (
		<TableWithSearch
			key={segment}
			data={categories}
			columns={columns}
			columnToSearch="category"
			placeholder="Search categories..."
			header="Categories"
			csvFileName={`markets-categories-${segment}`}
			sortingState={[{ id: 'volume_24h', desc: true }]}
		/>
	)
}
