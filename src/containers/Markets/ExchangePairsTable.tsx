import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ExchangeMarketPair } from '~/containers/Cexs/markets.types'
import { segmentHasOi } from './segments'
import { ChangeCell, renderFunding8h, renderPrice, renderUsd } from './shared'
import type { Segment } from './types'
import { pctChange } from './utils'

const columnHelper = createColumnHelper<ExchangeMarketPair>()

function renderFee(value: number | null | undefined): string {
	if (value == null) return '–'
	return `${(value * 100).toFixed(3)}%`
}

function renderMaxLeverage(value: number | null | undefined): string {
	if (value == null || !(value > 0)) return '–'
	return `${value >= 10 ? value.toFixed(0) : value}×`
}

function buildColumns(segment: Segment): ColumnDef<ExchangeMarketPair, any>[] {
	const hasOi = segmentHasOi(segment)

	const columns: ColumnDef<ExchangeMarketPair, any>[] = [
		columnHelper.accessor('symbol', {
			id: 'symbol',
			header: 'Pair',
			enableSorting: false,
			cell: ({ getValue, row }) => {
				const label = <span className="text-sm uppercase">{getValue()}</span>
				return row.original.pair_url ? (
					<a
						href={row.original.pair_url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-(--link-text) hover:underline"
					>
						{label}
					</a>
				) : (
					label
				)
			},
			meta: { headerClassName: 'min-w-[140px]' }
		}),
		columnHelper.accessor((row) => row.price ?? undefined, {
			id: 'price',
			header: 'Price',
			cell: ({ row }) => renderPrice(row.original.price),
			meta: { headerClassName: 'w-[120px]', align: 'end' as const }
		}),
		columnHelper.accessor((row) => row.price_change_24h ?? undefined, {
			id: 'price_change_24h',
			header: '24h',
			cell: ({ row }) => <ChangeCell fraction={row.original.price_change_24h} />,
			meta: { headerClassName: 'w-[100px]', align: 'end' }
		}),
		columnHelper.accessor((row) => row.volume_24h ?? undefined, {
			id: 'volume_24h',
			header: '24h Volume',
			cell: ({ row }) => renderUsd(row.original.volume_24h),
			meta: { headerClassName: 'w-[120px]', align: 'end' as const }
		}),
		columnHelper.accessor((row) => pctChange(row.volume_24h, row.volume_prev_24h) ?? undefined, {
			id: 'volume_change_24h',
			header: 'Vol Δ',
			cell: ({ row }) => <ChangeCell fraction={pctChange(row.original.volume_24h, row.original.volume_prev_24h)} />,
			meta: { headerClassName: 'w-[100px]', align: 'end' }
		})
	]

	if (hasOi) {
		columns.push(
			columnHelper.accessor((row) => row.oi_usd ?? undefined, {
				id: 'oi_usd',
				header: 'Open Interest',
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
				meta: { headerClassName: 'w-[110px]', align: 'end' }
			})
		)
	}

	columns.push(
		columnHelper.accessor((row) => row.max_leverage ?? undefined, {
			id: 'max_leverage',
			header: 'Max Lev',
			cell: ({ row }) => renderMaxLeverage(row.original.max_leverage),
			meta: { headerClassName: 'w-[90px]', align: 'end' }
		}),
		columnHelper.accessor((row) => row.maker_fee ?? undefined, {
			id: 'maker_fee',
			header: 'Maker',
			cell: ({ row }) => renderFee(row.original.maker_fee),
			meta: { headerClassName: 'w-[90px]', align: 'end' }
		}),
		columnHelper.accessor((row) => row.taker_fee ?? undefined, {
			id: 'taker_fee',
			header: 'Taker',
			cell: ({ row }) => renderFee(row.original.taker_fee),
			meta: { headerClassName: 'w-[90px]', align: 'end' }
		})
	)

	return columns
}

export function ExchangePairsTable({ pairs, segment }: { pairs: ExchangeMarketPair[]; segment: Segment }) {
	const columns = React.useMemo(() => buildColumns(segment), [segment])

	return (
		<TableWithSearch
			key={segment}
			data={pairs}
			columns={columns}
			columnToSearch="symbol"
			placeholder="Search pairs..."
			header="Markets"
			csvFileName={`markets-exchange-pairs-${segment}`}
			sortingState={[{ id: 'volume_24h', desc: true }]}
		/>
	)
}
