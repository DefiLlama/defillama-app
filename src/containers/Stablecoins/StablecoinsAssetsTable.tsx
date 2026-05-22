import {
	type ColumnFiltersState,
	type ColumnOrderState,
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { chainHref, toChainIconItems } from '~/components/IconsRow/utils'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { VirtualTable } from '~/components/Table/Table'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'
import { prepareTableCsv, useSortColumnOrders, useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import type { useCalcCirculating } from '~/containers/Stablecoins/hooks'
import { formattedNum, slug } from '~/utils'

type StablecoinDeviationInfo = {
	timestamp: number
	price: number
	priceSource: string | number | null
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
const columnHelper = createColumnHelper<StablecoinRow>()

const stablecoinsColumns = [
	columnHelper.accessor((row) => `${row.name}${row.symbol && row.symbol !== '-' ? ` (${row.symbol})` : ''}`, {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo name={row.original.name} kind="pegged" alt={`Logo of ${row.original.name}`} data-lgonly />
					{row.original?.deprecated ? (
						<BasicLink
							href={`/stablecoin/${slug(row.original.name)}`}
							className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{getValue()}</span>
							<Tooltip content="Deprecated" className="text-(--error)">
								<Icon name="alert-triangle" height={14} width={14} />
							</Tooltip>
						</BasicLink>
					) : (
						<BasicLink
							href={`/stablecoin/${slug(row.original.name)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue()}
						</BasicLink>
					)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[180px] lg:w-[240px]'
		}
	}),
	columnHelper.accessor('chains', {
		header: 'Chains',
		enableSorting: false,
		cell: ({ getValue }) => (
			<IconsRow items={toChainIconItems(getValue(), (chain) => chainHref('/stablecoins', chain))} />
		),
		meta: {
			headerClassName: 'w-[180px] lg:w-[200px]',
			align: 'end',
			headerHelperText: 'Chains are ordered by stablecoin issuance on each chain'
		}
	}),
	columnHelper.accessor((row) => (row.yieldBearing ? null : row.pegDeviation), {
		id: 'pegDeviation',
		header: '% Off Peg',
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
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => (row.yieldBearing ? null : row.pegDeviation_1m), {
		id: 'pegDeviation_1m',
		header: '1m % Off Peg',
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
			headerClassName: 'w-[132px]',
			align: 'end',
			headerHelperText: 'Shows greatest % price deviation from peg over the past month'
		}
	}),
	columnHelper.accessor('price', {
		header: 'Price',
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
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('change_1d', {
		header: '1d Change',
		cell: (info) =>
			info.row.original.change_1d_nol != null ? (
				<Tooltip
					content={info.row.original.change_1d_nol}
					className={`justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
						info.row.original.change_1d_nol.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
					}`}
				>
					<PercentChange percent={info.getValue()} />
				</Tooltip>
			) : (
				'-'
			),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('change_7d', {
		header: '7d Change',
		cell: (info) =>
			info.row.original.change_7d_nol != null ? (
				<Tooltip
					content={info.row.original.change_7d_nol}
					className={`justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
						info.row.original.change_7d_nol.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
					}`}
				>
					<PercentChange percent={info.getValue()} />
				</Tooltip>
			) : (
				'-'
			),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('change_1m', {
		header: '1m Change',
		cell: (info) =>
			info.row.original.change_1m_nol != null ? (
				<Tooltip
					content={info.row.original.change_1m_nol}
					className={`justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
						info.row.original.change_1m_nol.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
					}`}
				>
					<PercentChange percent={info.getValue()} />
				</Tooltip>
			) : (
				'-'
			),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('mcap', {
		header: 'Market Cap',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	})
]

const assetsColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['name', 'mcap', 'change_1d', 'change_7d', 'change_1m', 'price', 'pegDeviation', 'pegDeviation_1m', 'chains'],
	1024: ['name', 'chains', 'pegDeviation', 'pegDeviation_1m', 'price', 'change_1d', 'change_7d', 'change_1m', 'mcap']
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
			finalValue = fixedPercent > 100 ? `${prefix}${numericPercent.toFixed(0)}%` : `${prefix}${fixedPercent}%`
			color = up
		} else if (fixedPercent < -2) {
			finalValue = `${fixedPercent}%`
			color = down
		} else {
			finalValue = `${fixedPercent}%`
			color = down
		}
	}

	return (
		<span
			className={`${noSign ? '' : color === 'green' ? 'text-(--success)' : color === 'red' ? 'text-(--error)' : ''}`}
		>
			{finalValue}
		</span>
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

function pegDeviationText(pegDeviationInfo: { timestamp: number; price: number; priceSource: string | number | null }) {
	const { timestamp, price, priceSource } = pegDeviationInfo
	const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
	const sourceLabel = priceSource != null ? formatPriceSource[String(priceSource)] : undefined
	return `On ${date}, ${sourceLabel ?? (priceSource != null ? `source ${String(priceSource)}` : 'an unknown source')} reported a price of $${formattedNum(price)}.`
}

export function StablecoinsTable({ data }: { data: StablecoinRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'mcap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const instance = useReactTable({
		data,
		columns: stablecoinsColumns,
		state: {
			sorting,
			columnOrder,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnOrders({ instance, columnOrders: assetsColumnOrders })

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
						onInput={(e) => setProjectName(e.currentTarget.value)}
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: 'stablecoins-assets' })} smol />
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
