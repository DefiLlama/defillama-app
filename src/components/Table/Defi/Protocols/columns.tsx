import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { ChevronDown, ChevronRight, AlertTriangle } from 'react-feather'
import { Checkbox } from 'ariakit'

import Bookmark from '~/components/Bookmark'
import { AutoColumn } from '~/components/Column'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import QuestionHelper from '~/components/QuestionHelper'
import TokenLogo from '~/components/TokenLogo'
import { Tooltip2 } from '~/components/Tooltip'
import { useDefiManager } from '~/contexts/LocalStorage'
import { formattedNum, formattedPercent, slug, toK, tokenIconUrl, toNiceDayAndHour, toNiceDaysAgo } from '~/utils'
import { AccordionButton, Name } from '../../shared'
import { formatColumnOrder } from '../../utils'
import { IProtocolRow, IProtocolRowWithCompare } from './types'

const columnHelper = createColumnHelper<IProtocolRow>()

export const protocolsByChainColumns: ColumnDef<IProtocolRow>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const Chains = () => (
				<AutoColumn>
					{row.original.chains.map((chain) => (
						<span key={`/protocol/${slug(value)}` + chain}>{chain}</span>
					))}
				</AutoColumn>
			)

			return (
				<Name depth={row.depth}>
					{row.subRows?.length > 0 ? (
						<AccordionButton
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</AccordionButton>
					) : (
						<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					)}

					<span>{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<AutoColumn as="span">
						<CustomLink href={`/protocol/${slug(value)}`}>{`${value}`}</CustomLink>

						<Tooltip2 content={<Chains />} color="var(--text-disabled)" fontSize="0.7rem">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip2>
					</AutoColumn>
					{value === 'SyncDEX Finance' && (
						<Tooltip2 content={'Many users have reported issues with this protocol'}>
							<AlertTriangle />
						</Tooltip2>
					)}
				</Name>
			)
		},
		size: 240
	},
	{
		id: 'category',

		header: 'Category',
		accessorKey: 'category',
		enableSorting: false,
		cell: ({ getValue }) => (getValue() ? <CustomLink href={`/protocols/${getValue()}`}>{getValue()}</CustomLink> : ''),
		size: 140,
		meta: {
			align: 'end'
		}
	},
	columnHelper.group({
		id: 'tvl',
		header: 'TVL',
		columns: [
			columnHelper.accessor('tvl', {
				header: 'TVL',
				cell: ({ getValue, row }) => <Tvl value={getValue()} rowValues={row.original} />,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 120
			}),
			columnHelper.accessor('change_1d', {
				header: '1d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('change_7d', {
				header: '7d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('change_1m', {
				header: '1m Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('mcaptvl', {
				header: 'Mcap/TVL',
				cell: (info) => {
					return <>{info.getValue() ?? null}</>
				},
				sortingFn: 'alphanumericFalsyLast' as any,
				size: 100,
				meta: {
					align: 'end'
				}
			})
		]
	}),
	columnHelper.group({
		id: 'fees',
		header: 'Fees & Revenue',
		columns: [
			columnHelper.accessor('fees_24h', {
				header: 'Fees 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('revenue_24h', {
				header: 'Revenue 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 120
			}),
			columnHelper.accessor('fees_7d', {
				header: 'Fees 7d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('revenue_7d', {
				header: 'Revenue 7d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 120
			}),
			columnHelper.accessor('fees_30d', {
				header: 'Fees 30d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('revenue_30d', {
				header: 'Revenue 30d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('fees_1y', {
				header: 'Monthly Avg 1Y',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 140
			}),
			columnHelper.accessor('revenue_1y', {
				header: 'Revenue 1Y',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 120
			}),
			columnHelper.accessor('average_1y', {
				header: 'Revenue 30d Fees',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 160
			}),
			columnHelper.accessor('average_revenue_1y', {
				header: 'Monthly Avg 1Y Rev',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 180
			}),

			columnHelper.accessor('holdersRevenue30d', {
				header: 'Holders Revenue 30d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 100
			}),
			columnHelper.accessor('userFees_24h', {
				header: 'User Fees 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 140
			}),
			columnHelper.accessor('cumulativeFees', {
				header: 'Cumulative Fees',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 140
			}),
			columnHelper.accessor('holderRevenue_24h', {
				header: 'Holders Revenue 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 180
			}),
			,
			columnHelper.accessor('treasuryRevenue_24h', {
				header: 'Treasury Revenue 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 180
			}),
			columnHelper.accessor('supplySideRevenue_24h', {
				header: 'Supply Side Revenue 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 200
			}),
			columnHelper.accessor('pf', {
				header: 'P/F',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? info.getValue() + 'x' : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / annualized fees'
				},
				size: 180
			}),
			columnHelper.accessor('ps', {
				header: 'P/S',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? info.getValue() + 'x' : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / annualized revenue'
				},
				size: 180
			})
		]
	}),
	columnHelper.group({
		id: 'volume',
		header: 'Volume',
		columns: [
			columnHelper.accessor('volume_24h', {
				header: 'Volume 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 120
			}),
			columnHelper.accessor('volume_7d', {
				header: 'Volume 7d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 120
			}),
			columnHelper.accessor('volumeChange_7d', {
				header: 'Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: 'Change of last 7d volume over the previous 7d volume'
				},
				size: 120
			}),
			columnHelper.accessor('cumulativeVolume', {
				header: 'Cumulative Volume',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end'
				},
				size: 160
			})
		]
	})
]

export const protocolsColumns: ColumnDef<IProtocolRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const Chains = () => (
				<AutoColumn>
					{row.original.chains.map((chain) => (
						<span key={`/protocol/${slug(value)}` + chain}>{chain}</span>
					))}
				</AutoColumn>
			)

			return (
				<Name depth={row.depth}>
					{row.subRows?.length > 0 ? (
						<AccordionButton
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</AccordionButton>
					) : (
						<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					)}

					<span>{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<AutoColumn as="span">
						<CustomLink href={`/protocol/${slug(value)}`}>{`${value}`}</CustomLink>

						<Tooltip2 content={<Chains />} color="var(--text-disabled)" fontSize="0.7rem">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip2>
					</AutoColumn>
					{value === 'SyncDEX Finance' && (
						<Tooltip2 content={'Many users have reported issues with this protocol'}>
							<AlertTriangle />
						</Tooltip2>
					)}
				</Name>
			)
		},
		size: 240
	},
	{
		header: 'Category',
		accessorKey: 'category',
		cell: ({ getValue }) => (getValue() ? <CustomLink href={`/protocols/${getValue()}`}>{getValue()}</CustomLink> : ''),
		size: 140
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue, row }) => <Tvl value={getValue()} rowValues={row.original} />,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 100
	},

	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{info.getValue() ?? null}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	}
]

export const listedAtColumn = {
	header: 'Listed At',
	accessorKey: 'listedAt',
	cell: ({ getValue }) => toNiceDaysAgo(getValue()),
	size: 140,
	meta: {
		align: 'end' as const
	}
}

export const categoryProtocolsColumns: ColumnDef<IProtocolRowWithCompare>[] = [
	{
		header: 'Rank',
		accessorKey: 'rank',
		size: 80,
		enableSorting: false,
		cell: ({ row }) => {
			return (
				<span
					style={{
						fontSize: '0.9rem',
						fontWeight: 'bold',
						textAlign: 'center',
						display: 'flex',
						justifyContent: 'center'
					}}
				>
					{row.index + 1}
				</span>
			)
		},
		meta: {
			align: 'center' as any
		}
	},
	{
		header: 'Compare',
		accessorKey: 'compare',
		enableSorting: false,
		cell: ({ row }) => {
			return (
				<div style={{ display: 'flex', justifyContent: 'center' }}>
					<Checkbox
						onChange={() => row.original?.compare?.(row.original.name)}
						checked={row.original?.isCompared}
						id={`compare-${row.original.name}`}
					/>
				</div>
			)
		},
		size: 80,
		meta: {
			align: 'center' as any
		}
	},
	...protocolsColumns.filter((c: any) => c.accessorKey !== 'name'),
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const Chains = () => (
				<AutoColumn>
					{row.original.chains.map((chain) => (
						<span key={`/protocol/${slug(value)}` + chain}>{chain}</span>
					))}
				</AutoColumn>
			)

			return (
				<Name>
					{row.subRows?.length > 0 ? (
						<AccordionButton
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</AccordionButton>
					) : null}

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<AutoColumn as="span">
						<CustomLink href={`/protocol/${slug(value)}`}>{`${value}`}</CustomLink>

						<Tooltip2 content={<Chains />} color="var(--text-disabled)" fontSize="0.7rem">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip2>
					</AutoColumn>
					{value === 'SyncDEX Finance' && (
						<Tooltip2 content={'Many users have reported issues with this protocol'}>
							<AlertTriangle />
						</Tooltip2>
					)}
				</Name>
			)
		},
		size: 240
	},

	{
		header: 'Fees 24h',
		accessorKey: 'fees_24h',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fees 7d',
		accessorKey: 'fees_7d',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fees 30d',
		accessorKey: 'fees_30d',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Revenue 24h',
		accessorKey: 'revenue_24h',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Revenue 7d',
		accessorKey: 'revenue_7d',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume 24h',
		accessorKey: 'volume_24h',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume 7d',
		accessorKey: 'volume_7d',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	}
]

export const recentlyListedProtocolsColumns: ColumnDef<IProtocolRow>[] = [
	...protocolsColumns.slice(0, 3),
	listedAtColumn,
	...protocolsColumns.slice(3, -1).filter((c: any) => !['volume_7d', 'fees_7d', 'revenue_7d'].includes(c.accessorKey))
]

export const airdropsColumns: ColumnDef<IProtocolRow>[] = [
	...protocolsColumns.slice(0, 3),
	{
		header: 'Total Money Raised',
		accessorKey: 'totalRaised',
		cell: ({ getValue }) => <>{getValue() ? `$${toK(getValue())}` : ''}</>,
		size: 180,
		meta: {
			align: 'end' as const
		}
	},
	listedAtColumn,
	...protocolsColumns.slice(3, -1).filter((c: any) => !['volume_7d', 'fees_7d', 'revenue_7d'].includes(c.accessorKey))
]

export const topGainersAndLosersColumns: ColumnDef<IProtocolRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name depth={row.depth}>
					<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					<span>{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
					<CustomLink href={`/protocol/${slug(value)}`}>{`${value}`}</CustomLink>
				</Name>
			)
		},
		size: 260
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/chain" iconType="chain" />,
		meta: {
			align: 'end',
			headerHelperText: "Chains are ordered by protocol's highest TVL on each chain"
		},
		size: 200
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => {
			return <>{'$' + formattedNum(getValue())}</>
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{info.getValue() ?? null}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

export const protocolAddlColumns = {
	borrowed: {
		header: 'Borrowed',
		accessorKey: 'borrowed',
		cell: (info) => {
			return <>{info.getValue() && formattedNum(info.getValue())}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	supplied: {
		header: 'Supplied',
		accessorKey: 'supplied',
		cell: (info) => {
			return <>{info.getValue() && formattedNum(info.getValue())}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	suppliedTvl: {
		header: 'Supplied/TVL',
		accessorKey: 'suppliedTvl',
		cell: (info) => {
			return <>{info.getValue() && formattedNum(info.getValue())}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
}

// key: min width of window/screen
// values: table columns order
export const columnOrders = formatColumnOrder({
	0: [
		'rank',
		'compare',
		'name',
		'tvl',
		'change_7d',
		'category',
		'change_1m',
		'change_1d',
		'fees_7d',
		'revenue_7d',
		'volume_7d',
		'mcaptvl'
	],
	480: [
		'rank',
		'compare',
		'name',
		'change_7d',
		'tvl',
		'category',
		'change_1m',
		'change_1d',
		'fees_7d',
		'revenue_7d',
		'volume_7d',
		'mcaptvl'
	],
	1024: [
		'rank',
		'compare',
		'name',
		'category',
		'change_1d',
		'change_7d',
		'change_1m',
		'tvl',
		'fees_7d',
		'revenue_7d',
		'volume_7d',
		'mcaptvl'
	]
})

export const columnSizes = {
	0: {
		rank: 60,
		compare: 80,
		name: 180,
		category: 140,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		tvl: 120,
		mcaptvl: 100,
		totalRaised: 180
	},
	1024: {
		rank: 60,
		compare: 80,
		name: 240,
		category: 140,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		tvl: 120,
		mcaptvl: 100,
		totalRaised: 180
	},
	1280: {
		rank: 60,
		compare: 80,
		name: 200,
		category: 140,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		tvl: 120,
		mcaptvl: 100,
		totalRaised: 180
	}
}

const Tvl = ({ value, rowValues }) => {
	const [extraTvlsEnabled] = useDefiManager()

	let text = null

	if (rowValues.strikeTvl) {
		if (!extraTvlsEnabled['doublecounted']) {
			text =
				'This protocol deposits into another protocol and is subtracted from total TVL because "Double Count" toggle is off'
		}

		if (!extraTvlsEnabled['liquidstaking']) {
			text =
				'This protocol is under Liquid Staking category and is subtracted from total TVL because "Liquid Staking" toggle is off'
		}

		if (!extraTvlsEnabled['doublecounted'] && !extraTvlsEnabled['liquidstaking']) {
			text =
				'This protocol deposits into another protocol or is under Liquid Staking category, so it is subtracted from total TVL because both "Liquid Staking" and "Double Count" toggles are off'
		}

		if (rowValues.category === 'RWA') {
			text = 'RWA protocols are not counted into Chain TVL'
		}

		if (text && rowValues.isParentProtocol) {
			text = 'Some subprotocols are excluded from chain tvl'
		}
	}

	return (
		<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
			{text ? <QuestionHelper text={text} /> : null}
			<span
				style={{
					color: rowValues.strikeTvl ? 'var(--text-disabled)' : 'inherit'
				}}
			>
				{'$' + formattedNum(value || 0)}
			</span>
		</span>
	)
}

export const protocolsByTokenColumns: ColumnDef<{ name: string; amountUsd: number }>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
					<CustomLink href={`/protocol/${slug(value)}`}>{`${value}`}</CustomLink>
				</Name>
			)
		}
	},
	{
		header: () => <Name>Category</Name>,
		accessorKey: 'category',
		enableSorting: false,
		meta: {
			align: 'end'
		}
	},
	{
		header: () => <Name>Amount</Name>,
		accessorKey: 'amountUsd',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		}
	}
]
