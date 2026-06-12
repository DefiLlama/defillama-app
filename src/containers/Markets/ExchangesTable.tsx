import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { type Segment, segmentHasOi } from './segments'
import { ChangeCell, ExchangeName, renderUsd, VenueBadge } from './shared'
import type { ExchangeListRow } from './types'
import { pctChange } from './utils'

const columnHelper = createColumnHelper<ExchangeListRow>()

function renderShare(value: number, total: number): string {
	return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '–'
}

function buildColumns(segment: Segment, totalVolume: number): ColumnDef<ExchangeListRow, any>[] {
	const hasOi = segmentHasOi(segment)

	const columns: ColumnDef<ExchangeListRow, any>[] = [
		columnHelper.accessor('exchange', {
			id: 'exchange',
			header: 'Exchange',
			enableSorting: false,
			cell: ({ getValue }) => <ExchangeName exchange={getValue()} />,
			meta: { headerClassName: 'w-[150px]' }
		}),
		columnHelper.accessor('exchange_type', {
			id: 'exchange_type',
			header: 'Venue',
			cell: ({ getValue }) => <VenueBadge type={getValue()} />,
			meta: { headerClassName: 'w-[80px]' }
		}),
		columnHelper.accessor('total_volume_24h', {
			id: 'total_volume_24h',
			header: '24h Volume',
			cell: ({ getValue }) => renderUsd(getValue()),
			meta: { headerClassName: 'w-[120px]', align: 'end' as const }
		}),
		columnHelper.accessor((row) => pctChange(row.total_volume_24h, row.total_volume_prev_24h) ?? undefined, {
			id: 'volume_change_24h',
			header: 'Vol Δ',
			cell: ({ row }) => (
				<ChangeCell fraction={pctChange(row.original.total_volume_24h, row.original.total_volume_prev_24h)} />
			),
			meta: { headerClassName: 'w-[100px]', align: 'end' }
		}),
		columnHelper.accessor('total_volume_24h', {
			id: 'share',
			header: 'Share',
			cell: ({ getValue }) => renderShare(getValue(), totalVolume),
			meta: {
				headerClassName: 'w-[90px]',
				align: 'end',
				headerHelperText: "Share of the segment's total 24h volume across venues"
			}
		})
	]

	if (hasOi) {
		columns.push(
			columnHelper.accessor((row) => row.total_oi_usd ?? undefined, {
				id: 'total_oi_usd',
				header: 'OI',
				cell: ({ row }) => renderUsd(row.original.total_oi_usd),
				meta: { headerClassName: 'w-[120px]', align: 'end' as const }
			}),
			columnHelper.accessor((row) => pctChange(row.total_oi_usd, row.total_oi_prev_usd) ?? undefined, {
				id: 'oi_change_24h',
				header: 'OI Δ',
				cell: ({ row }) => (
					<ChangeCell fraction={pctChange(row.original.total_oi_usd, row.original.total_oi_prev_usd)} />
				),
				meta: { headerClassName: 'w-[100px]', align: 'end' }
			})
		)
	}

	columns.push(
		columnHelper.accessor('market_count', {
			id: 'market_count',
			header: 'Markets',
			cell: ({ getValue }) => getValue() ?? '–',
			meta: { headerClassName: 'w-[90px]', align: 'end' }
		})
	)

	return columns
}

type VenueFilter = 'all' | 'cex' | 'dex'

const VENUE_OPTIONS: ReadonlyArray<{ id: VenueFilter; label: string }> = [
	{ id: 'all', label: 'All' },
	{ id: 'cex', label: 'CEX' },
	{ id: 'dex', label: 'DEX' }
]

export function ExchangesTable({ exchanges, segment }: { exchanges: ExchangeListRow[]; segment: Segment }) {
	const [venue, setVenue] = React.useState<VenueFilter>('all')

	const { rows, totalVolume } = React.useMemo(() => {
		const rows: ExchangeListRow[] = []
		let totalVolume = 0
		for (const exchange of exchanges) {
			if (exchange.total_volume_24h <= 0 || (venue !== 'all' && exchange.exchange_type !== venue)) continue
			rows.push(exchange)
			totalVolume += exchange.total_volume_24h
		}
		rows.sort((a, b) => b.total_volume_24h - a.total_volume_24h)
		return { rows, totalVolume }
	}, [exchanges, venue])
	const columns = React.useMemo(() => buildColumns(segment, totalVolume), [segment, totalVolume])

	const leadingControls = (
		<div
			className="flex shrink-0 items-center overflow-hidden rounded-md border border-(--form-control-border) text-xs"
			role="group"
			aria-label="Venue filter"
		>
			{VENUE_OPTIONS.map((option) => (
				<button
					key={option.id}
					type="button"
					data-active={venue === option.id}
					onClick={() => setVenue(option.id)}
					className="border-l border-(--form-control-border) px-2 py-1 text-(--text-label) first:border-l-0 hover:bg-(--btn-hover-bg) data-[active=true]:bg-(--btn-hover-bg) data-[active=true]:text-(--text-primary)"
				>
					{option.label}
				</button>
			))}
		</div>
	)

	return (
		<TableWithSearch
			key={`${segment}-${venue}`}
			data={rows}
			columns={columns}
			columnToSearch="exchange"
			placeholder="Search exchanges..."
			header="Exchanges"
			leadingControls={leadingControls}
			csvFileName={`markets-exchanges-${segment}`}
			sortingState={[{ id: 'total_volume_24h', desc: true }]}
		/>
	)
}
