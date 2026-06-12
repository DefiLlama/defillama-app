import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { MarketPair } from './api.types'
import { FundingCell } from './marketMetrics'
import { type Segment, segmentHasOi } from './segments'
import { ChangeCell, renderFunding8h, renderPrice, renderUsd } from './shared'
import { pctChange } from './utils'

const columnHelper = createColumnHelper<MarketPair>()

type MarketPairColumnConfig = {
	pairHeaderClassName: string
	priceHeaderClassName: string
	oiHeaderClassName: string
	fundingHeader: string
	fundingHeaderClassName: string
	fundingCell: (rate: number | null | undefined) => ReactNode
	maxLeverageHeader: string
	maxLeverageHeaderClassName: string
	maxLeverageCell: (value: number | null | undefined) => ReactNode
	makerHeader: string
	makerHeaderClassName: string
	takerHeader: string
	takerHeaderClassName: string
}

export function renderMarketPairFee(value: number | null | undefined): string {
	if (value == null) return '–'
	return `${(value * 100).toFixed(3)}%`
}

export function renderCompactMarketPairLeverage(value: number | null | undefined): string {
	if (value == null || !(value > 0)) return '–'
	return `${value >= 10 ? value.toFixed(0) : value}×`
}

export function renderExactMarketPairLeverage(value: number | null | undefined): string {
	if (value == null) return '–'
	return `${value}x`
}

const EXCHANGE_PAIR_COLUMN_CONFIG: MarketPairColumnConfig = {
	pairHeaderClassName: 'min-w-[140px]',
	priceHeaderClassName: 'w-[120px]',
	oiHeaderClassName: 'w-[120px]',
	fundingHeader: 'Funding 8h',
	fundingHeaderClassName: 'w-[110px]',
	fundingCell: renderFunding8h,
	maxLeverageHeader: 'Max Lev',
	maxLeverageHeaderClassName: 'w-[90px]',
	maxLeverageCell: renderCompactMarketPairLeverage,
	makerHeader: 'Maker',
	makerHeaderClassName: 'w-[90px]',
	takerHeader: 'Taker',
	takerHeaderClassName: 'w-[90px]'
}

const CEX_MARKETS_COLUMN_CONFIG: MarketPairColumnConfig = {
	pairHeaderClassName: 'w-[140px]',
	priceHeaderClassName: 'w-[110px]',
	oiHeaderClassName: 'w-[140px]',
	fundingHeader: 'Funding (8h)',
	fundingHeaderClassName: 'w-[130px]',
	fundingCell: (rate) => <FundingCell rate={rate} />,
	maxLeverageHeader: 'Max Leverage',
	maxLeverageHeaderClassName: 'w-[130px]',
	maxLeverageCell: renderExactMarketPairLeverage,
	makerHeader: 'Maker Fee',
	makerHeaderClassName: 'w-[110px]',
	takerHeader: 'Taker Fee',
	takerHeaderClassName: 'w-[110px]'
}

function buildMarketPairColumns(segment: Segment, config: MarketPairColumnConfig): ColumnDef<MarketPair, any>[] {
	const columns: ColumnDef<MarketPair, any>[] = [
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
			meta: { headerClassName: config.pairHeaderClassName }
		}),
		columnHelper.accessor((row) => row.price ?? undefined, {
			id: 'price',
			header: 'Price',
			cell: ({ row }) => renderPrice(row.original.price),
			meta: { headerClassName: config.priceHeaderClassName, align: 'end' as const }
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

	if (segmentHasOi(segment)) {
		columns.push(
			columnHelper.accessor((row) => row.oi_usd ?? undefined, {
				id: 'oi_usd',
				header: 'Open Interest',
				cell: ({ row }) => renderUsd(row.original.oi_usd),
				meta: { headerClassName: config.oiHeaderClassName, align: 'end' as const }
			}),
			columnHelper.accessor((row) => pctChange(row.oi_usd, row.oi_prev_usd) ?? undefined, {
				id: 'oi_change_24h',
				header: 'OI Δ',
				cell: ({ row }) => <ChangeCell fraction={pctChange(row.original.oi_usd, row.original.oi_prev_usd)} />,
				meta: { headerClassName: 'w-[100px]', align: 'end' }
			}),
			columnHelper.accessor((row) => row.funding_rate_8h ?? undefined, {
				id: 'funding_rate_8h',
				header: config.fundingHeader,
				cell: ({ row }) => config.fundingCell(row.original.funding_rate_8h),
				meta: { headerClassName: config.fundingHeaderClassName, align: 'end' }
			}),
			columnHelper.accessor((row) => row.max_leverage ?? undefined, {
				id: 'max_leverage',
				header: config.maxLeverageHeader,
				cell: ({ row }) => config.maxLeverageCell(row.original.max_leverage),
				meta: { headerClassName: config.maxLeverageHeaderClassName, align: 'end' }
			})
		)
	}

	columns.push(
		columnHelper.accessor((row) => row.maker_fee ?? undefined, {
			id: 'maker_fee',
			header: config.makerHeader,
			cell: ({ row }) => renderMarketPairFee(row.original.maker_fee),
			meta: { headerClassName: config.makerHeaderClassName, align: 'end' }
		}),
		columnHelper.accessor((row) => row.taker_fee ?? undefined, {
			id: 'taker_fee',
			header: config.takerHeader,
			cell: ({ row }) => renderMarketPairFee(row.original.taker_fee),
			meta: { headerClassName: config.takerHeaderClassName, align: 'end' }
		})
	)

	return columns
}

export function buildExchangePairColumns(segment: Segment): ColumnDef<MarketPair, any>[] {
	return buildMarketPairColumns(segment, EXCHANGE_PAIR_COLUMN_CONFIG)
}

export function buildCexMarketPairColumns(segment: Segment): ColumnDef<MarketPair, any>[] {
	return buildMarketPairColumns(segment, CEX_MARKETS_COLUMN_CONFIG)
}
