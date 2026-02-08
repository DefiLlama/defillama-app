import { ColumnDef } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, formattedPercent, tokenIconUrl, toNiceDayMonthYear } from '~/utils'
import type { ColumnOrdersByBreakpoint } from '../utils'
import type { AirdropRow, IForksRow, ILSDRow } from './types'

export const forksColumn: ColumnDef<IForksRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />

					<BasicLink
						href={`/forks/${getValue()}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string}
					</BasicLink>
				</span>
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
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Forks TVL / Original TVL',
		accessorKey: 'ftot',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end'
		}
	}
]

const formatRaise = (n) => {
	if (n >= 1e3) {
		return `${n / 1e3}b`
	}
	return `${n}m`
}

interface IRaiseRow {
	name: string
	date: string
	amount: number
	round: string
	description: string
	leadInvestors: string[]
	otherInvestors: string[]
	source: string
	valuation: number
	chains: string[]
}

export const raisesColumns: ColumnDef<IRaiseRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		size: 180
	},
	{
		size: 120,
		header: 'Date',
		accessorKey: 'date',
		cell: ({ getValue }) => <>{toNiceDayMonthYear(getValue())}</>
	},
	{
		header: 'Amount Raised',
		accessorKey: 'amount',
		cell: ({ getValue }) => <>{getValue() ? '$' + formatRaise(getValue()) : ''}</>,
		size: 140
	},
	{ header: 'Round', accessorKey: 'round', enableSorting: false, size: 140 },
	{
		header: 'Category',
		accessorKey: 'category',
		size: 160,
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Tooltip content={getValue() as string}>{getValue() as string}</Tooltip>
		}
	},
	{
		header: 'Description',
		accessorKey: 'sector',
		size: 140,
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Tooltip content={getValue() as string}>{getValue() as string}</Tooltip>
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

			return <Tooltip content={formattedValue}>{formattedValue}</Tooltip>
		}
	},
	{
		header: 'Link',
		accessorKey: 'source',
		size: 60,
		enableSorting: false,
		cell: ({ getValue }) => (
			<a
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
				className="flex shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover)"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
				<span className="sr-only">open in new tab</span>
			</a>
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
		size: 80
	},
	{
		header: 'Other Investors',
		accessorKey: 'otherInvestors',
		size: 400,
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as Array<string>
			const formattedValue = value.join(', ')

			return <Tooltip content={formattedValue}>{formattedValue}</Tooltip>
		}
	}
]

export const bridgedChainColumns: ColumnDef<any>[] = [
	{
		header: 'Token',
		accessorKey: 'name',
		enableSorting: false
	},
	{
		header: 'Total Bridged',
		accessorKey: 'value',
		accessorFn: (row) => (row.value ? +row.value : undefined),
		cell: ({ getValue }) => {
			return <>${formattedNum(getValue())}</>
		}
	}
]

const ETHPegTooltipContent = ({ marketRate, expectedRate }: { marketRate: number; expectedRate: number }) => {
	return (
		<span className="flex flex-col gap-1">
			<span>{`Market Rate: ${marketRate?.toFixed(4)}`}</span>
			<span>{`Expected Rate: ${expectedRate?.toFixed(4)}`}</span>
		</span>
	)
}

const McapTooltipContent = ({ mcap, tvl }: { mcap: number; tvl: number }) => {
	return (
		<span className="flex flex-col gap-1">
			<span>{`Market Cap: ${mcap?.toFixed(4)}`}</span>
			<span>{`TVL: ${tvl?.toFixed(4)}`}</span>
		</span>
	)
}

export const LSDColumn: ColumnDef<ILSDRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const nameSlug = row.original.name.replace(/\s+/g, '-').toLowerCase()

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={row.original.logo} data-lgonly />
					<BasicLink
						href={`/protocol/${nameSlug}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string | null}
					</BasicLink>
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Staked ETH',
		accessorKey: 'stakedEth',
		cell: ({ getValue }) => <>{formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'TVL',
		accessorKey: 'stakedEthInUsd',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '7d Change',
		accessorKey: 'stakedEthPctChange7d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '30d Change',
		accessorKey: 'stakedEthPctChange30d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Market Share',
		accessorKey: 'marketShare',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 125
	},
	{
		header: 'LST',
		accessorKey: 'lsdSymbol',
		cell: ({ getValue, row }) => {
			const value = getValue()
			const stringValue = typeof value === 'string' ? value : ''
			if (!row.original.pegInfo) return stringValue
			return (
				<span className="flex items-center justify-end gap-1">
					{row.original.pegInfo && <QuestionHelper text={row.original.pegInfo} />}
					{stringValue}
				</span>
			)
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'ETH Peg',
		accessorKey: 'ethPeg',
		cell: ({ getValue, row }) => {
			return (
				<Tooltip
					content={
						<ETHPegTooltipContent marketRate={row.original?.marketRate} expectedRate={row.original?.expectedRate} />
					}
					className="justify-end"
				>
					{getValue() ? formattedPercent(getValue()) : null}
				</Tooltip>
			)
		},
		meta: {
			align: 'end',
			headerHelperText:
				'Market Rate (pulled from 1inch) divided by Expected Rate. Hover for Market Rate and Expected Rate Info.'
		},
		size: 115
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcapOverTvl',
		cell: ({ getValue, row }) => {
			return (
				<Tooltip
					content={<McapTooltipContent mcap={row.original.mcap} tvl={row.original.tvl} />}
					className="justify-end"
				>
					{(getValue() ?? null) as string | null}
				</Tooltip>
			)
		},
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: 'LST APR',
		accessorKey: 'apy',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fee',
		accessorKey: 'fee',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Protocol Fee'
		},
		size: 90
	}
]

export const AirdropColumn: ColumnDef<AirdropRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		size: 120
	},
	{
		header: 'Claim Page',
		accessorKey: 'page',
		size: 100,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<a
					href={getValue() as string}
					target="_blank"
					rel="noopener noreferrer"
					className="flex shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover)"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			) : null
	},
	{
		header: 'Explorer',
		accessorKey: 'explorer',
		size: 80,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<a
					href={getValue() as string}
					target="_blank"
					rel="noopener noreferrer"
					className="flex shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover)"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			) : null
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<IconsRow
					links={getValue() as Array<string>}
					url="/oracles"
					urlPrefix={`/${row.original.name}`}
					iconType="chain"
				/>
			)
		},
		size: 80,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Start',
		accessorKey: 'startTime',
		meta: {
			align: 'end'
		},
		size: 190
	},
	{
		header: 'End',
		accessorKey: 'endTime',
		meta: {
			align: 'end'
		},
		size: 190
	}
]

export const raisesColumnOrders: ColumnOrdersByBreakpoint = {
	0: [
		'name',
		'amount',
		'date',
		'round',
		'category',
		'sector',
		'leadInvestors',
		'source',
		'valuation',
		'chains',
		'otherInvestors'
	],
	1024: [
		'name',
		'date',
		'amount',
		'round',
		'category',
		'sector',
		'leadInvestors',
		'source',
		'valuation',
		'chains',
		'otherInvestors'
	]
}
