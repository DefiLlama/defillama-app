import { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, formattedPercent } from '~/utils'
import type { IPeggedAssetByChainRow, IPeggedAssetsRow, IPeggedChain } from './types'
import { IconsRow } from '~/components/IconsRow'
import { QuestionHelper } from '~/components/QuestionHelper'
import { peggedAssetIconUrl, slug } from '~/utils'
import { Icon } from '~/components/Icon'
import { formatColumnOrder } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'

export const peggedAssetsByChainColumns: ColumnDef<IPeggedAssetByChainRow>[] = [
	{
		header: 'Name',
		id: 'name',
		accessorFn: (row) => `${row.name}${row.symbol && row.symbol !== '-' ? ` (${row.symbol})` : ''}`,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const isSubRow = row.original.name.startsWith('Bridged from')

			return (
				<span
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 && (
						<button
							className="absolute -left-[2px]"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
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
					)}

					{isSubRow ? (
						<>
							<span>-</span>
							<span>{getValue() as string}</span>
						</>
					) : (
						<>
							<span className="flex-shrink-0">{index + 1}</span>
							<TokenLogo logo={chainIconUrl(row.original.name)} data-lgonly />
							<BasicLink
								href={`/stablecoins/${row.original.name}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis"
							>
								{getValue() as string}
							</BasicLink>
						</>
					)}
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Bridge',
		accessorKey: 'bridgeInfo',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as IPeggedAssetByChainRow['bridgeInfo']
			return (
				<>
					{value.link ? (
						<BasicLink href={value.link} className="text-sm font-medium text-[var(--link-text)]">
							{value.name}
						</BasicLink>
					) : (
						<span>{value.name}</span>
					)}
				</>
			)
		},
		size: 240,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged Amount',
		accessorKey: 'bridgedAmount',
		size: 145,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Circulating',
		accessorKey: 'circulating',
		cell: (info) => <>{formattedNum(info.getValue())}</>,
		size: 145,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const assetsByChainColumnOrders = formatColumnOrder({
	0: ['name', 'change_7d', 'circulating', 'change_1d', 'change_1m', 'bridgeInfo', 'bridgedAmount'],
	480: ['name', 'change_7d', 'circulating', 'change_1d', 'change_1m', 'bridgeInfo', 'bridgedAmount'],
	1024: ['name', 'bridgeInfo', 'bridgedAmount', 'change_1d', 'change_7d', 'change_1m', 'circulating']
})

export const assetsByChainColumnSizes = {
	0: {
		name: 160,
		bridgeInfo: 240,
		bridgedAmount: 145,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		circulating: 145
	},
	900: {
		name: 280,
		bridgeInfo: 240,
		bridgedAmount: 145,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		circulating: 145
	}
}

export const peggedAssetsColumns: ColumnDef<IPeggedAssetsRow>[] = [
	{
		header: 'Name',
		id: 'name',
		accessorFn: (row) => `${row.name}${row.symbol && row.symbol !== '-' ? ` (${row.symbol})` : ''}`,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2">
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={peggedAssetIconUrl(row.original.name)} data-lgonly />
					{row.original?.deprecated ? (
						<BasicLink
							href={`/stablecoin/${slug(row.original.name)}`}
							className="flex items-center gap-1 text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							<span className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline">
								{getValue() as string}
							</span>
							<span className="text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1">
								<Tooltip
									content="Deprecated"
									className="bg-red-600 dark:bg-red-400 text-white text-[10px] h-3 w-3 flex items-center justify-center rounded-full"
								>
									!
								</Tooltip>
								<span>Deprecated</span>
							</span>
						</BasicLink>
					) : (
						<BasicLink
							href={`/stablecoin/${slug(row.original.name)}`}
							className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
			headerHelperText: "Chains are ordered by pegged asset's issuance on each chain"
		}
	},
	{
		header: '% Off Peg',
		accessorKey: 'pegDeviation',
		size: 120,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			return (
				<span className="w-full flex items-center justify-end gap-1">
					{rowValues.depeggedTwoPercent ? <QuestionHelper text="Currently de-pegged by 2% or more." /> : null}
					{value ? formattedPeggedPercent(value) : value === 0 ? formattedPeggedPercent(0) : <span>-</span>}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m % Off Peg',
		accessorKey: 'pegDeviation_1m',
		size: 132,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			return (
				<span className="w-full flex items-center justify-end gap-1">
					{rowValues.pegDeviationInfo ? <QuestionHelper text={pegDeviationText(rowValues.pegDeviationInfo)} /> : null}
					{value ? formattedPeggedPercent(value) : <span>-</span>}
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
				<span className="w-full flex items-center justify-end gap-1">
					{rowValues.floatingPeg ? <QuestionHelper text="Has a variable, floating, or crawling peg." /> : null}
					{value ? formattedNum(value, true) : <span>-</span>}
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
		cell: (info) =>
			info.row.original.change_1d_nol != null ? (
				<Tooltip
					content={info.row.original.change_1d_nol}
					className={`justify-end overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
						info.row.original.change_1d_nol.startsWith('-') ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'
					}`}
				>
					{formattedPercent(info.getValue())}
				</Tooltip>
			) : (
				<>{formattedPercent(info.getValue())}</>
			),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) =>
			info.row.original.change_7d_nol != null ? (
				<Tooltip
					content={info.row.original.change_7d_nol}
					className={`justify-end overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
						info.row.original.change_7d_nol.startsWith('-') ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'
					}`}
				>
					{formattedPercent(info.getValue())}
				</Tooltip>
			) : (
				<>{formattedPercent(info.getValue())}</>
			),
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) =>
			info.row.original.change_1m_nol != null ? (
				<Tooltip
					content={info.row.original.change_1m_nol}
					className={`justify-end overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
						info.row.original.change_1m_nol.startsWith('-') ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'
					}`}
				>
					{formattedPercent(info.getValue())}
				</Tooltip>
			) : (
				<>{formattedPercent(info.getValue())}</>
			),
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const assetsColumnOrders = formatColumnOrder({
	0: ['name', 'mcap', 'change_1d', 'change_7d', 'change_1m', 'price', 'pegDeviation', 'pegDeviation_1m', 'chains'],
	1024: ['name', 'chains', 'pegDeviation', 'pegDeviation_1m', 'price', 'change_1d', 'change_7d', 'change_1m', 'mcap']
})

export const assetsColumnSizes = {
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

function formattedPeggedPercent(percent, noSign = false) {
	if (!percent && percent !== 0) {
		return null
	}

	let up = '#3fb950'
	let down = '#f85149'

	if (noSign) {
		up = down = ''
	}

	let color = ''
	let finalValue = ''
	let weight = 400

	percent = parseFloat(percent)

	if (!percent || percent === 0) {
		finalValue = '0%'
	} else if (percent < 0.0001 && percent > 0) {
		color = up
		finalValue = '< 0.0001%'
		weight = 500
	} else if (percent < 0 && percent > -0.0001) {
		color = down
		finalValue = '< 0.0001%'
		weight = 500
	} else {
		let fixedPercent = percent.toFixed(2)

		if (fixedPercent === '0.00') {
			finalValue = '0%'
		} else if (fixedPercent > 0) {
			const prefix = noSign ? '' : '+'

			if (fixedPercent > 0) {
				if (fixedPercent > 100) {
					finalValue = `${prefix}${percent?.toFixed(0).toLocaleString()}%`
					color = up
					weight = 500
				} else {
					if (fixedPercent > 2) {
						finalValue = `${prefix}${fixedPercent}%`
						color = up
						weight = 700
					} else {
						finalValue = `${prefix}${fixedPercent}%`
						color = up
						weight = 500
					}
				}
			} else {
				if (fixedPercent < -2) {
					finalValue = `${fixedPercent}%`
					color = down
					weight = 700
				} else {
					finalValue = `${fixedPercent}%`
					color = down
					weight = 500
				}
			}
		} else {
			color = down
			finalValue = `${fixedPercent}%`
		}
	}

	return (
		<span className="font-[var(--weight)] text-[var(--color)]" style={{ '--weight': weight, '--color': color } as any}>
			{finalValue}
		</span>
	)
}

const formatPriceSource = {
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

function pegDeviationText(pegDeviationInfo) {
	const { timestamp, price, priceSource } = pegDeviationInfo
	const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
	return `On ${date}, ${formatPriceSource[priceSource]} reported a price of $${formattedNum(price)}.`
}

export const peggedChainsColumns: ColumnDef<IPeggedChain>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const isSubRow = value.startsWith('Bridged from')

			return (
				<span
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 && (
						<button
							className="absolute -left-[2px]"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
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
					)}

					{isSubRow ? (
						<>
							<span className="flex-shrink-0">{index + 1}</span>
							<span>{value}</span>
						</>
					) : (
						<>
							<span className="flex-shrink-0">{index + 1}</span>
							<TokenLogo logo={chainIconUrl(value)} data-lgonly />
							<BasicLink
								href={`/stablecoins/${value}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
							>
								{value}
							</BasicLink>
						</>
					)}
				</span>
			)
		},
		size: 200
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables Mcap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 132,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Dominant Stablecoin',
		accessorKey: 'dominance',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as IPeggedChain['dominance']

			if (!value) {
				return null
			}

			return (
				<div className="w-full flex items-center justify-end gap-1">
					<span>{`${value.name}: `}</span>
					<span>{formattedPercent(value.value, true)}</span>
				</div>
			)
		},
		size: 170,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Mcap Issued On',
		accessorKey: 'minted',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 180,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Mcap Bridged To',
		accessorKey: 'bridgedTo',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 185,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables Mcap / DeFi Tvl',
		accessorKey: 'mcaptvl',
		cell: ({ getValue }) => <>{getValue() && formattedNum(getValue(), false)}</>,
		size: 195,
		meta: {
			align: 'end'
		}
	}
]
