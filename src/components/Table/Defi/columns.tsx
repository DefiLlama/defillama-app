import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpRight, ChevronDown, ChevronRight } from 'react-feather'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import QuestionHelper from '~/components/QuestionHelper'
import TokenLogo from '~/components/TokenLogo'
import { Tooltip2 } from '~/components/Tooltip'
import { ButtonYields } from '~/layout/Pool'
import {
	capitalizeFirstLetter,
	chainIconUrl,
	formattedNum,
	formattedPercent,
	slug,
	toNiceDayMonthAndYear
} from '~/utils'
import { AccordionButton, Name } from '../shared'
import { formatColumnOrder } from '../utils'
import type { ICategoryRow, IChainsRow, IForksRow, IOraclesRow } from './types'

export const oraclesColumn: ColumnDef<IOraclesRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span> <CustomLink href={`/oracles/${getValue()}`}>{getValue()}</CustomLink>
				</Name>
			)
		}
	},
	{
		header: 'Protocols Secured',
		accessorKey: 'protocolsSecured',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVS',
		accessorKey: 'tvs',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Excludes CeFi'
		}
	}
]

export const forksColumn: ColumnDef<IForksRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span> <CustomLink href={`/forks/${getValue()}`}>{getValue()}</CustomLink>
				</Name>
			)
		}
	},
	{
		header: 'Forked Protocols',
		accessorKey: 'forkedProtocols',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Forks TVL / Original TVL',
		accessorKey: 'ftot',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value && value.toFixed(2) + '%'}</>
		},
		meta: {
			align: 'end'
		}
	}
]

export const categoriesColumn: ColumnDef<ICategoryRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span> <CustomLink href={`/protocols/${getValue()}`}>{getValue()}</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 140
	},
	{
		header: 'Combined TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		size: 140
	},
	{
		header: 'Description',
		accessorKey: 'description',
		enableSorting: false,
		size: 902
	}
]

const formatRaise = (n) => {
	if (n >= 1e3) {
		return `${n / 1e3}b`
	}
	return `${n}m`
}

export const raisesColumns: ColumnDef<ICategoryRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Name>{getValue()}</Name>
		},
		size: 200
	},
	{
		cell: ({ getValue }) => <>{toNiceDayMonthAndYear(getValue())}</>,
		size: 120,
		header: 'Date',
		accessorKey: 'date'
	},
	{
		header: 'Amount Raised',
		accessorKey: 'amount',
		cell: ({ getValue }) => <>{getValue() ? '$' + formatRaise(getValue()) : ''}</>,
		size: 140
	},
	{ header: 'Round', accessorKey: 'round', enableSorting: false, size: 140 },
	{
		header: 'Description',
		accessorKey: 'sector',
		size: 140,
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<Tooltip2 content={getValue() as string} style={{ padding: '12px' }}>
					{getValue()}
				</Tooltip2>
			)
		}
	},
	{
		header: 'Lead Investor',
		accessorKey: 'leadInvestors',
		size: 120,
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as Array<string>
			const formattedValue = value.join(', ')

			return (
				<Tooltip2 content={formattedValue} style={{ padding: '12px' }}>
					{formattedValue}
				</Tooltip2>
			)
		}
	},
	{
		header: 'Link',
		accessorKey: 'source',
		size: 48,
		enableSorting: false,
		cell: ({ getValue }) => (
			<ButtonYields
				as="a"
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
				data-lgonly
				useTextColor={true}
			>
				<ArrowUpRight size={14} />
			</ButtonYields>
		)
	},
	{
		header: 'Valuation',
		accessorKey: 'valuation',
		cell: ({ getValue }) => <>{getValue() ? '$' + formatRaise(getValue()) : ''}</>,
		size: 100
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/chain" iconType="chain" />,
		size: 60
	},
	{
		header: 'Other Investors',
		accessorKey: 'otherInvestors',
		size: 400,
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as Array<string>
			const formattedValue = value.join(', ')

			return <Tooltip2 content={formattedValue}>{formattedValue}</Tooltip2>
		}
	}
]

export const hacksColumns: ColumnDef<ICategoryRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Name>{getValue()}</Name>
		},
		size: 200
	},
	{
		cell: ({ getValue }) => <>{toNiceDayMonthAndYear(getValue())}</>,
		size: 120,
		header: 'Date',
		accessorKey: 'date'
	},
	{
		header: 'Amount lost',
		accessorKey: 'amount',
		cell: ({ getValue }) => <>{getValue() ? '$' + formatRaise(getValue()) : ''}</>,
		size: 140
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/chain" iconType="chain" />,
		size: 60
	},
	...['classification', 'technique'].map((s) => ({
		header: capitalizeFirstLetter(s),
		accessorKey: s,
		enableSorting: false,
		size: s === 'classification' ? 100 : 200,
		...(s === 'classification' && {
			meta: {
				headerHelperText:
					'Classified based on whether the hack targeted a weakness in Infrastructure, Smart Contract Language, Protocol Logic or the interaction between multiple protocols (Ecosystem)'
			}
		})
	})),
	{
		header: 'Link',
		accessorKey: 'link',
		size: 33,
		enableSorting: false,
		cell: ({ getValue }) => (
			<ButtonYields
				as="a"
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
				data-lgonly
				useTextColor={true}
			>
				<ArrowUpRight size={14} />
			</ButtonYields>
		)
	}
]

export const chainsColumn: ColumnDef<IChainsRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name depth={row.depth}>
					{row.subRows?.length > 0 && (
						<AccordionButton
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</AccordionButton>
					)}
					<span>{index + 1}</span>
					<TokenLogo logo={chainIconUrl(getValue())} />
					<CustomLink href={`/chain/${getValue()}`}>{getValue()}</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables',
		accessorKey: 'stablesMcap',
		cell: (info) => <>{info.getValue() === 0 || `$${formattedNum(info.getValue())}`}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h volume',
		accessorKey: 'totalVolume24h',
		enableSorting: true,
		cell: (info) => <>{info.getValue() === 0 || `$${formattedNum(info.getValue())}`}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Sum of volume of all DEXs on the chain. Updated daily at 00:00UTC'
		}
	},
	{
		header: `24h fees`,
		accessorKey: 'totalFees24h',
		enableSorting: true,
		cell: (info) => {
			const value = info.getValue()

			if (value === '' || value === 0 || Number.isNaN(formattedNum(value))) return <></>
			return <>${formattedNum(value)}</>
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{info.getValue() && formattedNum(info.getValue())}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

export const cexColumn: ColumnDef<any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span>
					{row.original.slug === undefined ? (
						getValue()
					) : (
						<CustomLink href={`/protocol/${slug(row.original.slug)}`}>{getValue()}</CustomLink>
					)}
				</Name>
			)
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: (info) => {
			return (
				<>
					{info.getValue() === undefined ? (
						<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" />
					) : (
						'$' + formattedNum(info.getValue())
					)}
				</>
			)
		},
		size: 120
	},
	{
		header: 'Liabilities auditor',
		accessorKey: 'auditor',
		size: 120,
		cell: ({ getValue }) => (
			<>
				{getValue() === undefined ? <QuestionHelper text="This CEX has no third party liability audits" /> : getValue()}
			</>
		)
	},
	{
		cell: ({ getValue }) => <>{getValue() === undefined ? null : toNiceDayMonthAndYear(getValue())}</>,
		size: 120,
		header: 'Last audit date',
		accessorKey: 'lastAuditDate'
	},
	{
		header: 'Audit link',
		accessorKey: 'auditLink',
		size: 48,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() === undefined ? null : (
				<ButtonYields
					as="a"
					href={getValue() as string}
					target="_blank"
					rel="noopener noreferrer"
					data-lgonly
					useTextColor={true}
					style={{ width: '21px' }}
				>
					<ArrowUpRight size={14} />
				</ButtonYields>
			)
	}
]

// key: min width of window/screen
// values: table columns order
export const chainsTableColumnOrders = formatColumnOrder({
	0: [
		'name',
		'tvl',
		'change_7d',
		'protocols',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	],
	400: [
		'name',
		'change_7d',
		'tvl',
		'protocols',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	],
	600: [
		'name',
		'protocols',
		'change_7d',
		'tvl',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	],
	900: [
		'name',
		'protocols',
		'change_1d',
		'change_7d',
		'change_1m',
		'tvl',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	]
})
