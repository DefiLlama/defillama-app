import { ColumnDef } from '@tanstack/react-table'
import styled from 'styled-components'
import { ArrowUpRight, ChevronDown, ChevronRight } from 'react-feather'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import TokenLogo from '~/components/TokenLogo'
import { Tooltip2 } from '~/components/Tooltip'
import { ButtonYields } from '~/layout/Pool'
import {
	capitalizeFirstLetter,
	chainIconUrl,
	formattedNum,
	formattedPercent,
	getDominancePercent,
	slug,
	toK,
	tokenIconUrl,
	toNiceDayMonthAndYear
} from '~/utils'
import { AccordionButton, Name } from '../shared'
import { formatColumnOrder } from '../utils'
import type { ICategoryRow, IChainsRow, IForksRow, IOraclesRow, ILSDRow } from './types'

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
		size: 180
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

export const activeInvestorsColumns: ColumnDef<{ name: string; deals: number; projects: string }>[] = [
	{
		header: 'Investor',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		},
		size: 120
	},
	{
		header: 'Deals (Last 30d)',
		accessorKey: 'deals',
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Projects',
		accessorKey: 'projects',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Tooltip2 content={getValue()}>{getValue()}</Tooltip2>
		},
		size: 280
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
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
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
						<CustomLink href={`/cex/${slug(row.original.slug)}`}>{getValue()}</CustomLink>
					)}
				</Name>
			)
		}
	},
	{
		header: 'Assets',
		accessorKey: 'tvl',
		cell: (info) => {
			return (
				<AutoRow align="center" justify="flex-end">
					{info.getValue() === undefined ? (
						<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" />
					) : (
						'$' + formattedNum(info.getValue())
					)}
				</AutoRow>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'This excludes IOU assets issued by the CEX that are already counted on another chain, such as Binance-pegged BTC in BSC, which is already counted in Bitcoin chain'
		}
	},
	{
		header: 'Clean Assets',
		accessorKey: 'cleanTvl',
		cell: (info) => {
			const coinSymbol = info.row.original.coinSymbol
			return (
				<AutoRow align="center" justify="flex-end">
					{info.getValue() === undefined ? (
						<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" />
					) : (
						<>
							{coinSymbol === undefined ? (
								<QuestionHelper text={`Original TVL doesn't contain any coin issued by this CEX`} />
							) : (
								<QuestionHelper
									text={`This excludes all TVL from ${info.row.original.coinSymbol}, which is a token issued by this CEX`}
								/>
							)}
							<span>{'$' + formattedNum(info.getValue())}</span>
						</>
					)}
				</AutoRow>
			)
		},
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'TVL of the CEX excluding all assets issued by itself, such as their own token'
		}
	},
	{
		header: '24h Inflows',
		accessorKey: '24hInflows',
		size: 104,
		cell: (info) => (
			<InflowOutflow data-variant={info.getValue() < 0 ? 'red' : info.getValue() > 0 ? 'green' : 'white'}>
				{info.getValue() ? formatCexInflows(info.getValue()) : ''}
			</InflowOutflow>
		),
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Inflows',
		accessorKey: '7dInflows',
		size: 104,
		cell: (info) => (
			<InflowOutflow data-variant={info.getValue() < 0 ? 'red' : info.getValue() > 0 ? 'green' : 'white'}>
				{info.getValue() ? formatCexInflows(info.getValue()) : ''}
			</InflowOutflow>
		),
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Inflows',
		accessorKey: '1mInflows',
		size: 104,
		cell: (info) => (
			<InflowOutflow data-variant={info.getValue() < 0 ? 'red' : info.getValue() > 0 ? 'green' : 'white'}>
				{info.getValue() ? formatCexInflows(info.getValue()) : ''}
			</InflowOutflow>
		),
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Auditor',
		accessorKey: 'auditor',
		cell: ({ getValue }) => (
			<AutoRow align="center" justify="flex-end">
				{getValue() === undefined ? null : getValue()}
			</AutoRow>
		),
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Last audit date',
		accessorKey: 'lastAuditDate',
		cell: ({ getValue }) => (
			<AutoRow align="center" justify="flex-end">
				{getValue() === undefined ? null : toNiceDayMonthAndYear(getValue())}
			</AutoRow>
		),
		size: 128,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Spot Volume',
		accessorKey: 'spotVolume',
		cell: (info) => (info.getValue() ? '$' + formattedNum(info.getValue()) : null),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Open Interest',
		accessorKey: 'oi',
		cell: (info) => (info.getValue() ? '$' + formattedNum(info.getValue()) : null),
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Leverage',
		accessorKey: 'leverage',
		cell: (info) => (info.getValue() ? Number(Number(info.getValue()).toFixed(2)) + 'x' : null),
		size: 120,
		meta: {
			align: 'end'
		}
	}
	/*
	{
		header: 'Audit link',
		accessorKey: 'auditLink',
		size: 80,
		enableSorting: false,
		cell: ({ getValue }) => (
			<AutoRow align="center" justify="flex-end">
				{getValue() === undefined ? null : (
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
				)}
			</AutoRow>
		),
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Link to Wallets',
		accessorKey: 'walletsLink',
		size: 120,
		enableSorting: false,
		cell: ({ getValue }) => (
			<AutoRow align="center" justify="flex-end">
				{getValue() === undefined ? (
					<QuestionHelper text="This CEX has no published their wallet addresses" />
				) : (
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
				)}
			</AutoRow>
		),
		meta: {
			align: 'end'
		}
	}
	*/
]

export const treasuriesColumns: ColumnDef<any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			const name = (getValue() as string).split(' (treasury)')[0]
			const slug = (row.original.slug as string).split('-(treasury)')[0]

			return (
				<Name>
					<span>{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(name)} data-lgonly />
					<CustomLink href={`/protocol/${slug}#treasury`}>{name}</CustomLink>
				</Name>
			)
		}
	},
	{
		header: 'Breakdown',
		accessorKey: 'tokenBreakdowns',
		id: 'tokenBreakdowns0',
		enableSorting: false,
		cell: (info) => {
			const breakdown = info.getValue() as { [type: string]: number }
			let totalBreakdown = 0

			for (const type in breakdown) {
				totalBreakdown += breakdown[type]
			}

			const breakdownDominance = {}

			for (const value in breakdown) {
				breakdownDominance[value] = getDominancePercent(breakdown[value], totalBreakdown)
			}

			const dominance = Object.entries(breakdownDominance).sort(
				(a: [string, number], b: [string, number]) => b[1] - a[1]
			)

			if (totalBreakdown < 1) {
				return <></>
			}

			return (
				<Tooltip content={<TooltipContent dominance={dominance} protocolName={info.row.original.name} />}>
					<AutoRow
						sx={{
							width: '100px !important',
							flexWrap: 'nowrap',
							gap: '0px',
							background: 'white',
							height: '20px',
							marginLeft: 'auto'
						}}
					>
						{dominance.map((dom) => {
							const color = breakdownColor(dom[0])
							const name = `${formatBreakdownType(dom[0])} (${dom[1]}%)`

							return (
								<div
									key={dom[0] + dom[1] + info.row.original.name}
									style={{ width: `${dom[1]}px`, height: '20px', background: color }}
								></div>
							)
						})}
					</AutoRow>
				</Tooltip>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stablecoins',
		accessorKey: 'stablecoins',
		id: 'stablecoins',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 108,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Majors (BTC, ETH)',
		accessorKey: 'majors',
		id: 'majors',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 152,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Own Tokens',
		accessorKey: 'ownTokens',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 112,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Others',
		accessorKey: 'others',
		id: 'others',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Treasury',
		accessorKey: 'tvl',
		id: 'total-treasury',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 128,
		meta: {
			align: 'end'
		}
	}
]

export const LSDColumn: ColumnDef<ILSDRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const nameSlug = row.original.name.replace(/\s+/g, '-').toLowerCase()

			return (
				<Name>
					<span>{index + 1}</span> <TokenLogo logo={row.original.logo} data-lgonly />
					<CustomLink href={`/protocol/${nameSlug}`}>{getValue()}</CustomLink>
				</Name>
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
		size: 110
	},
	{
		header: 'TVL',
		accessorKey: 'stakedEthInUsd',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
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
		size: 110
	},
	{
		header: 'Market Share',
		accessorKey: 'marketShare',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value && value.toFixed(2) + '%'}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'LSD',
		accessorKey: 'lsdSymbol',
		cell: ({ getValue, row }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{row.original.pegInfo ? <QuestionHelper text={row.original.pegInfo} /> : null}
					{getValue()}
				</AutoRow>
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
			const TooltipContent = () => {
				return (
					<>
						<span>{`Market Rate: ${row.original?.marketRate?.toFixed(4)}`}</span>
						<span>{`Expected Rate: ${row.original?.expectedRate?.toFixed(4)}`}</span>
					</>
				)
			}
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					<Tooltip content={<TooltipContent />}>{getValue() ? formattedPercent(getValue()) : null}</Tooltip>
				</AutoRow>
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
			const TooltipContent = () => {
				return (
					<>
						<span>{`Market Cap: $${toK(row.original?.mcap)}`}</span>
					</>
				)
			}
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					<Tooltip content={<TooltipContent />}>{getValue() ? getValue() : null}</Tooltip>
				</AutoRow>
			)
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'LSD APR',
		accessorKey: 'apy',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value && value.toFixed(2) + '%'}</>
		},
		meta: {
			align: 'end'
		},
		size: 90
	}
]

function formatCexInflows(value) {
	let x = value
	let isNegative = false

	if (value.toString().startsWith('-')) {
		isNegative = true
		x = value.toString().split('-').slice(1).join('-')
	}

	return `${isNegative ? '-' : '+'} $${toK(x)}`
}

export const InflowOutflow = styled.span`
	color: ${({ theme }) => theme.text1};

	&[data-variant='green'] {
		color: green;
	}

	&[data-variant='red'] {
		color: red;
	}
`

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

export const hacksColumnOrders = formatColumnOrder({
	0: ['name', 'date', 'amountLost', 'chains', 'classification', 'technique', 'link']
})

export const raisesColumnOrders = formatColumnOrder({
	0: ['name', 'amount', 'date', 'round', 'sector', 'leadInvestors', 'source', 'valuation', 'chains', 'otherInvestors'],
	1024: [
		'name',
		'date',
		'amount',
		'round',
		'sector',
		'leadInvestors',
		'source',
		'valuation',
		'chains',
		'otherInvestors'
	]
})

const Tooltip = styled(Tooltip2)`
	display: flex;
	flex-direction: column;
	gap: 4px;
`

const breakdownColor = (type) => {
	if (type === 'stablecoins') {
		return '#16a34a'
	}

	if (type === 'majors') {
		return '#2563eb'
	}

	if (type === 'ownTokens') {
		return '#f97316'
	}

	if (type === 'others') {
		return '#6d28d9'
	}

	return 'red'
}

const formatBreakdownType = (type) => {
	if (type === 'stablecoins') {
		return 'Stablecoins'
	}

	if (type === 'majors') {
		return 'Majors'
	}

	if (type === 'ownTokens') {
		return 'Own Tokens'
	}

	if (type === 'others') {
		return 'Others'
	}

	return type
}

const Breakdown = ({ data }) => {
	const color = breakdownColor(data[0])
	const name = `${formatBreakdownType(data[0])} (${data[1]}%)`

	return (
		<AutoRow sx={{ flexWrap: 'nowrap', alignItems: 'center', gap: '4px' }}>
			<span style={{ height: '14px', width: '14px', background: color, borderRadius: '2px' }}></span>
			<span>{name}</span>
		</AutoRow>
	)
}

const TooltipContent = ({ dominance, protocolName }) => {
	return (
		<AutoRow sx={{ flexDirection: 'column', gap: '4px' }}>
			{dominance.map((dom) => (
				<Breakdown data={dom} key={dom[0] + dom[1] + protocolName + 'tooltip-content'} />
			))}
		</AutoRow>
	)
}
