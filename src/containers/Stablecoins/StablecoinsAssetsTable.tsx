import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { VirtualTable } from '~/components/Table/Table'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import type { useCalcCirculating } from '~/containers/Stablecoins/hooks'
import { formattedNum, peggedAssetIconUrl as stablecoinAssetIconUrl, renderPercentChange, slug } from '~/utils'

type StablecoinDeviationInfo = {
	timestamp: number
	price: number
	priceSource: string | number
}

type StablecoinsTableInputRow = {
	name: string
	symbol?: string
	deprecated?: boolean
	yieldBearing?: boolean
	depeggedTwoPercent?: boolean
	floatingPeg?: boolean
	chains?: string[]
	pegDeviation?: number | null
	pegDeviation_1m?: number | null
	pegDeviationInfo?: StablecoinDeviationInfo | null
	price?: number | null
	change_1d?: number | null
	change_7d?: number | null
	change_1m?: number | null
	change_1d_nol?: string | null
	change_7d_nol?: string | null
	change_1m_nol?: string | null
	mcap?: number | null
	pegType?: string | null
	unreleased?: number | null
	delisted?: boolean
	circulating?: number | null
	subRows?: StablecoinsTableInputRow[]
}
type StablecoinRow = ReturnType<typeof useCalcCirculating<StablecoinsTableInputRow>>[number]

const stablecoinsColumns: ColumnDef<StablecoinRow>[] = [
	{
		header: 'Name',
		id: 'name',
		accessorFn: (row) => `${row.name}${row.symbol && row.symbol !== '-' ? ` (${row.symbol})` : ''}`,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={stablecoinAssetIconUrl(row.original.name)} data-lgonly />
					{row.original?.deprecated ? (
						<BasicLink
							href={`/stablecoin/${slug(row.original.name)}`}
							className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">
								{getValue() as string}
							</span>
							<Tooltip content="Deprecated" className="text-(--error)">
								<Icon name="alert-triangle" height={14} width={14} />
							</Tooltip>
						</BasicLink>
					) : (
						<BasicLink
							href={`/stablecoin/${slug(row.original.name)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue() as string}
						</BasicLink>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/stablecoins" iconType="chain" />,
		size: 200,
		meta: {
			align: 'end',
			headerHelperText: 'Chains are ordered by stablecoin issuance on each chain'
		}
	},
	{
		header: '% Off Peg',
		id: 'pegDeviation',
		accessorFn: (row) => (row.yieldBearing ? null : row.pegDeviation),
		size: 120,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			if (rowValues.yieldBearing) {
				return <span>-</span>
			}
			return (
				<span className="flex w-full items-center justify-end gap-1">
					{rowValues.depeggedTwoPercent ? <QuestionHelper text="Currently de-pegged by 2% or more." /> : null}
					{value != null ? formattedPeggedPercent(value) : <span>-</span>}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m % Off Peg',
		id: 'pegDeviation_1m',
		accessorFn: (row) => (row.yieldBearing ? null : row.pegDeviation_1m),
		size: 132,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			if (rowValues.yieldBearing) {
				return <span>-</span>
			}
			return (
				<span className="flex w-full items-center justify-end gap-1">
					{rowValues.pegDeviationInfo ? <QuestionHelper text={pegDeviationText(rowValues.pegDeviationInfo)} /> : null}
					{value != null ? formattedPeggedPercent(value) : <span>-</span>}
				</span>
			)
		},
		meta: {
			align: 'end',
			headerHelperText: 'Shows greatest % price deviation from peg over the past month'
		}
	},
	{
		header: 'Price',
		accessorKey: 'price',
		size: 110,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			return (
				<span className="flex w-full items-center justify-end gap-1">
					{rowValues.floatingPeg ? <QuestionHelper text="Has a variable, floating, or crawling peg." /> : null}
					{value != null ? formattedNum(value, true) : <span>-</span>}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		accessorFn: (row) => row.change_1d,
		cell: (info) =>
			info.row.original.change_1d_nol != null ? (
				<Tooltip
					content={info.row.original.change_1d_nol}
					className={`justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
						info.row.original.change_1d_nol.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
					}`}
				>
					{renderPercentChange(info.getValue())}
				</Tooltip>
			) : (
				'-'
			),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		accessorFn: (row) => row.change_7d,
		cell: (info) =>
			info.row.original.change_7d_nol != null ? (
				<Tooltip
					content={info.row.original.change_7d_nol}
					className={`justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
						info.row.original.change_7d_nol.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
					}`}
				>
					{renderPercentChange(info.getValue())}
				</Tooltip>
			) : (
				'-'
			),
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		accessorFn: (row) => row.change_1m,
		cell: (info) =>
			info.row.original.change_1m_nol != null ? (
				<Tooltip
					content={info.row.original.change_1m_nol}
					className={`justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
						info.row.original.change_1m_nol.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
					}`}
				>
					{renderPercentChange(info.getValue())}
				</Tooltip>
			) : (
				'-'
			),
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: (info) => <>{formattedNum(info.getValue(), true)}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

const assetsColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['name', 'mcap', 'change_1d', 'change_7d', 'change_1m', 'price', 'pegDeviation', 'pegDeviation_1m', 'chains'],
	1024: ['name', 'chains', 'pegDeviation', 'pegDeviation_1m', 'price', 'change_1d', 'change_7d', 'change_1m', 'mcap']
}

const assetsColumnSizes: ColumnSizesByBreakpoint = {
	0: {
		name: 180,
		chains: 180,
		pegDeviation: 120,
		pegDeviation_1m: 132,
		price: 110,
		change_1d: 120,
		change_7d: 120,
		change_1m: 120,
		mcap: 120
	},
	480: {
		name: 180,
		chains: 180,
		pegDeviation: 120,
		pegDeviation_1m: 132,
		price: 110,
		change_1d: 120,
		change_7d: 120,
		change_1m: 120,
		mcap: 120
	},
	1024: {
		name: 240,
		chains: 200,
		pegDeviation: 120,
		pegDeviation_1m: 132,
		price: 110,
		change_1d: 120,
		change_7d: 120,
		change_1m: 120,
		mcap: 120
	}
}

function formattedPeggedPercent(percent: unknown, noSign = false) {
	if (!percent && percent !== 0) {
		return null
	}

	let up = 'green'
	let down = 'red'

	if (noSign) {
		up = down = ''
	}

	let color = ''
	let finalValue = ''

	const numericPercent = parseFloat(String(percent))

	if (!numericPercent || numericPercent === 0) {
		finalValue = '0%'
	} else if (numericPercent < 0.0001 && numericPercent > 0) {
		color = up
		finalValue = '< 0.0001%'
	} else if (numericPercent < 0 && numericPercent > -0.0001) {
		color = down
		finalValue = '< 0.0001%'
	} else {
		const fixedPercent = Number(numericPercent.toFixed(2))

		if (fixedPercent === 0) {
			finalValue = '0%'
		} else if (fixedPercent > 0) {
			const prefix = noSign ? '' : '+'

			if (fixedPercent > 100) {
				finalValue = `${prefix}${numericPercent.toFixed(0).toLocaleString()}%`
				color = up
			} else if (fixedPercent > 2) {
				finalValue = `${prefix}${fixedPercent}%`
				color = up
			} else {
				finalValue = `${prefix}${fixedPercent}%`
				color = up
			}
		} else if (fixedPercent < -2) {
			finalValue = `${fixedPercent}%`
			color = down
		} else {
			finalValue = `${fixedPercent}%`
			color = down
		}
	}

	return (
		<span className={`${noSign ? '' : color === 'green' ? 'text-(--success)' : 'text-(--error)'}`}>{finalValue}</span>
	)
}

const formatPriceSource: Record<string, string> = {
	chainlink: 'Chainlink',
	uniswap: 'a Uniswap v3 pool oracle',
	dexscreener: 'DEX Screener',
	curve: 'a Curve pool oracle',
	coingecko: 'CoinGecko',
	birdeye: 'Birdeye',
	kucoin: 'KuCoin Exchange',
	defillama: 'DefiLlama',
	kaddex: 'Kaddex'
}

function pegDeviationText(pegDeviationInfo: { timestamp: number; price: number; priceSource: string | number }) {
	const { timestamp, price, priceSource } = pegDeviationInfo
	const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
	return `On ${date}, ${formatPriceSource[String(priceSource)]} reported a price of $${formattedNum(price)}.`
}

export function StablecoinsTable({ data }: { data: StablecoinRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'mcap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const instance = useReactTable({
		data,
		columns: stablecoinsColumns,
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({ instance, columnSizes: assetsColumnSizes, columnOrders: assetsColumnOrders })

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search stablecoins</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
