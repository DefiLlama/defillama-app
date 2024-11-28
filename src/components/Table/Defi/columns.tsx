import { ColumnDef, sortingFns } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { ButtonLight } from '~/components/ButtonStyled'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import {
	capitalizeFirstLetter,
	chainIconUrl,
	formattedNum,
	formattedPercent,
	getDominancePercent,
	slug,
	standardizeProtocolName,
	toK,
	tokenIconUrl,
	toNiceDayMonthAndYear,
	toNiceDayMonthYear,
	toNiceHour
} from '~/utils'
import { UpcomingEvent } from '../../../containers/Defi/Protocol/Emissions/UpcomingEvent'
import { formatColumnOrder } from '../utils'
import type {
	AirdropRow,
	CategoryPerformanceRow,
	CoinPerformanceRow,
	IBridgedRow,
	ICategoryRow,
	IChainsRow,
	IEmission,
	IETFRow,
	IForksRow,
	IGovernance,
	ILSDRow,
	IOraclesRow
} from './types'

export const oraclesColumn: ColumnDef<IOraclesRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					<CustomLink
						href={`/oracles/${getValue()}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</CustomLink>
				</span>
			)
		}
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return <IconsRow links={getValue() as Array<string>} url="/oracles/chain" iconType="chain" />
		},
		size: 200,
		meta: {
			align: 'end',
			headerHelperText: 'Chains secured by the oracle'
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
	},
	{
		header: 'Volume (30d)',
		accessorKey: 'monthlyVolume',
		cell: ({ getValue }) => <>{getValue() ? '$' + formattedNum(getValue()) : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Cumulative last 30d volume secured'
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
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />

					<CustomLink
						href={`/forks/${getValue()}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</CustomLink>
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
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>{' '}
					<CustomLink
						href={`/protocols/${getValue()}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</CustomLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 100
	},
	{
		header: 'Combined TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value && value > 0 ? <>{'$' + formattedNum(value)}</> : <></>
		},
		size: 135
	},
	{
		header: 'Combined 24h Revenue',
		accessorKey: 'revenue',
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value && value > 0 ? <>{'$' + formattedNum(value)}</> : <></>
		},
		size: 200
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
			<ButtonLight
				className="flex items-center justify-center gap-4 !p-[6px]"
				as="a"
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
			</ButtonLight>
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

			return <Tooltip content={formattedValue}>{formattedValue}</Tooltip>
		}
	}
]

export const emissionsColumns: ColumnDef<IEmission>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<CustomLink
						href={`/unlocks/${standardizeProtocolName(getValue() as string)}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</CustomLink>
				</span>
			)
		},
		size: 220
	},
	{
		header: 'Token Price',
		accessorKey: 'tPrice',
		cell: ({ getValue }) => {
			return <>{getValue() ? '$' + (+getValue()).toFixed(2) : ''}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Mcap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => {
			if (!getValue()) return null
			return <>{'$' + formattedNum(getValue())}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},

	{
		header: 'Unlocked % | Max',
		id: 'totalLocked',
		accessorFn: (row) => (row.maxSupply && row.totalLocked ? row.totalLocked / row.maxSupply : 0),
		cell: ({ row }) => {
			const percetage = (100 - (row.original.totalLocked / row.original.maxSupply) * 100).toPrecision(2)

			return (
				<div className="flex flex-col gap-2 px-2">
					<span className="flex items-center gap-2 justify-between">
						<span className="text-[#3255d7]">{formattedNum(percetage)}%</span>
						<span className="text-[var(--text2)]">
							{formattedNum(row.original.maxSupply)} {row.original.tSymbol}
						</span>
					</span>
					<div
						className="h-2 rounded-full w-full"
						style={{
							background: `linear-gradient(90deg, #3255d7 ${percetage}%, var(--bg4) ${percetage}%)`
						}}
					/>
				</div>
			)
		},
		size: 240,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Daily unlocks',
		id: 'nextEvent',
		accessorFn: (row) => (row.tPrice && row.unlocksPerDay ? +row.tPrice * row.unlocksPerDay : 0),
		cell: ({ getValue, row }) => {
			const symbol = row.original.tSymbol

			if (!row.original.unlocksPerDay) return '-'

			return (
				<span className="flex flex-col gap-1">
					{getValue() ? '$' + formattedNum((getValue() as number).toFixed(2)) : ''}
					<span className="min-w-[120px] opacity-60">
						{formattedNum(row.original.unlocksPerDay) + (symbol ? ` ${symbol.toUpperCase()}` : '')}
					</span>
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Next Event',
		id: 'upcomingEvent',
		accessorFn: (row) => row.upcomingEvent?.[0]?.timestamp,
		cell: ({ row }) => {
			let { timestamp } = row.original.upcomingEvent[0]

			if (!timestamp || timestamp < Date.now() / 1e3) return null

			return (
				<UpcomingEvent
					{...{
						noOfTokens: row.original.upcomingEvent.map((x) => x.noOfTokens),
						timestamp,
						event: row.original.upcomingEvent,
						description: row.original.upcomingEvent.map((x) => x.description),
						price: row.original.tPrice,
						symbol: row.original.tSymbol,
						mcap: row.original.mcap,
						maxSupply: row.original.maxSupply,
						row: row.original,
						name: row.original.name
					}}
				/>
			)
		},
		size: 420
	}
]

export const calendarColumns: ColumnDef<any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					{row.original.type === 'Unlock' ? (
						<CustomLink
							href={`/unlocks/${standardizeProtocolName(row.original.link)}`}
							className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{getValue() as string}
						</CustomLink>
					) : (
						(getValue() as string)
					)}
				</span>
			)
		},
		size: 220
	},
	{
		header: 'Type',
		accessorKey: 'type',
		size: 100
	},
	{
		header: 'Date',
		id: 'timestamp',
		accessorKey: 'timestamp',
		cell: ({ getValue, row }) => {
			return <SimpleUpcomingEvent timestamp={(getValue() as number) / 1e3} name={row.original.name} />
		},
		size: 800
	}
]

export const expensesColumns: ColumnDef<any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<CustomLink
						href={`/protocol/${standardizeProtocolName(getValue() as string)}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</CustomLink>
				</span>
			)
		},
		size: 220
	},
	{
		header: 'Headcount',
		accessorKey: 'headcount',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Annual Expenses',
		accessorKey: 'sumAnnualUsdExpenses',
		cell: ({ getValue }) => {
			return <>{getValue() ? '$' + formattedNum(getValue()) : ''}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Source',
		accessorKey: 'sources',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<ButtonLight
					className="flex items-center justify-center gap-4 !p-[6px]"
					as="a"
					href={getValue()[0] as string}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
				</ButtonLight>
			) : null
	}
]

export const governanceColumns: ColumnDef<IGovernance>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
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
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<CustomLink
						href={`/governance/${standardizeProtocolName(getValue() as string)}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</CustomLink>
				</span>
			)
		},
		size: 220
	},
	{
		header: 'Proposals',
		accessorKey: 'proposalsCount',
		size: 100,
		meta: { align: 'end' }
	},
	{
		accessorKey: 'successfulProposals',
		header: 'Successful Proposals',
		size: 180,
		meta: { align: 'end' }
	},
	{
		header: 'Proposals in last 30 days',
		accessorKey: 'propsalsInLast30Days',
		size: 200,
		meta: { align: 'end' }
	},
	{
		header: 'Successful Proposals in last 30 days',
		accessorKey: 'successfulPropsalsInLast30Days',
		size: 280,
		meta: { align: 'end' }
	}
]

export const activeInvestorsColumns: ColumnDef<{
	name: string
	deals: number
	projects: string
}>[] = [
	{
		header: 'Investor',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<Tooltip content={'Looking for investors? Send your pitch to selected ones through us'}>
					<div className="flex gap-2" onClick={() => window.open('/pitch', '_blank')}>
						<CustomLink
							href={`/raises/${standardizeProtocolName(getValue() as string)}`}
							className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{getValue() as string}
						</CustomLink>
						<Icon
							name="mail"
							style={{ minHeight: '16px', minWidth: '16px', width: '16px', height: '16px' }}
							color="#2172E5"
							cursor={'pointer'}
						/>
					</div>
				</Tooltip>
			)
			return
		},
		size: 200
	},
	{
		header: 'Deals',
		accessorKey: 'deals',
		size: 120,
		meta: {
			align: 'end'
		}
	},

	{
		header: 'Median Amount',
		accessorKey: 'medianAmount',
		cell: ({ getValue }) => {
			return <>${getValue() as string}m</>
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/bridges" iconType="chain" />,
		size: 100,
		meta: {
			align: 'end'
		}
	},

	{
		header: 'Top Project Category',
		accessorKey: 'category',
		enableSorting: false,
		size: 160
	},
	{
		header: 'Top Round Type',
		accessorKey: 'roundType',
		enableSorting: false,
		size: 120
	},
	{
		header: 'Projects',
		accessorKey: 'projects',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Tooltip content={getValue() as string | null}>{getValue() as string | null}</Tooltip>
		},
		size: 240
	}
]

export const hacksColumns: ColumnDef<ICategoryRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
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
		size: s === 'classification' ? 140 : 200,
		...(s === 'classification' && {
			meta: {
				headerHelperText:
					'Classified based on whether the hack targeted a weakness in Infrastructure, Smart Contract Language, Protocol Logic or the interaction between multiple protocols (Ecosystem)'
			}
		})
	})),
	{
		header: 'Language',
		accessorKey: 'language',
		cell: ({ getValue }) => <>{(getValue() ?? null) as string | null}</>,
		size: 140
	},
	{
		header: 'Link',
		accessorKey: 'link',
		size: 40,
		enableSorting: false,
		cell: ({ getValue }) => (
			<ButtonLight
				className="flex items-center justify-center gap-4 !p-[6px]"
				as="a"
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
			</ButtonLight>
		)
	}
]

export const chainsColumn: ColumnDef<IChainsRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

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
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={chainIconUrl(getValue())} />
					<CustomLink
						href={`/chain/${getValue()}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string | null}
					</CustomLink>
				</span>
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
		header: 'Active Addresses',
		accessorKey: 'users',
		cell: (info) => <>{info.getValue() === 0 || formattedNum(info.getValue())}</>,
		size: 180,
		meta: {
			align: 'end',
			headerHelperText: 'Active addresses in the last 24h'
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
		header: 'Bridged TVL',
		accessorKey: 'chainAssets',
		cell: ({ getValue }) => {
			const chainAssets: any = getValue()
			if (!chainAssets) return null
			const totalValue = formattedNum(chainAssets.total.total, true)
			const chainAssetsBreakdown = (
				<div className="w-52 flex flex-col gap-1">
					{chainAssets.native && (
						<div className="flex items-center gap-1 justify-between">
							<span>Native:</span>
							<span>{formattedNum(chainAssets.native.total, true)}</span>
						</div>
					)}
					{chainAssets.canonical && (
						<div className="flex items-center gap-1 justify-between">
							<span>Canonical:</span>
							<span>{formattedNum(chainAssets.canonical.total, true)}</span>
						</div>
					)}

					{chainAssets.ownTokens && (
						<div className="flex items-center gap-1 justify-between">
							<span>Own Tokens:</span>
							<span>{formattedNum(chainAssets.ownTokens.total, true)}</span>
						</div>
					)}
					{chainAssets.thirdParty && (
						<div className="flex items-center gap-1 justify-between">
							<span>Third Party:</span>
							<span>{formattedNum(chainAssets.thirdParty.total, true)}</span>
						</div>
					)}
				</div>
			)
			return <Tooltip content={chainAssetsBreakdown}>{totalValue}</Tooltip>
		},
		sortingFn: (rowA, rowB) => {
			const valueA = rowA.original?.chainAssets?.total.total
			const valueB = rowB.original?.chainAssets?.total.total

			if (valueA === undefined || valueA === null) return 1
			if (valueB === undefined || valueB === null) return -1

			return parseFloat(valueB) - parseFloat(valueA)
		},
		size: 200,
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
			return <>{(info.getValue() ?? null) as string | null}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Bridged',
		accessorKey: 'totalAssets',
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		size: 125,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'NFT Volume',
		accessorKey: 'nftVolume',
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

const keySorting = (key: string) => (rowA, rowB) => {
	const valueA = rowA.original?.[key]?.total
	const valueB = rowB.original?.[key]?.total

	if (valueA === undefined || valueA === null) return 1
	if (valueB === undefined || valueB === null) return -1

	return parseFloat(valueB) - parseFloat(valueA)
}

export const bridgedColumns: ColumnDef<IBridgedRow, IBridgedRow['total']>[] = [
	{
		header: () => 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

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
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={chainIconUrl(getValue())} />
					<CustomLink
						href={`/bridged/${getValue()}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as any}
					</CustomLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Total Bridged',
		accessorKey: 'total',
		enableSorting: true,
		sortingFn: keySorting('total'),
		cell: (info) => {
			const value = info.getValue()?.total
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		}
	},
	{
		header: 'Change 24h',
		accessorKey: 'change_24h',
		enableSorting: true,
		sortingFn: (rowA, rowB) => {
			const valueA = String(rowA.original.change_24h)
			const valueB = String(rowB.original.change_24h)

			if (valueA === undefined || valueA === null) return 1
			if (valueB === undefined || valueB === null) return -1

			return parseFloat(valueB) - parseFloat(valueA)
		},
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <div style={{ color: Number(value) > 0 ? '#198600' : '#d92929' }}>{formattedPercent(value)}</div>
		}
	},
	{
		header: 'Native',
		accessorKey: 'native',
		enableSorting: true,
		sortingFn: keySorting('native'),
		cell: (info) => {
			const value = info.getValue()?.total
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		}
	},
	{
		header: 'Canonical',
		accessorKey: 'canonical',
		enableSorting: true,
		sortingFn: keySorting('canonical'),
		cell: (info) => {
			const value = info.getValue()?.total
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		}
	},
	{
		header: 'Own Tokens',
		accessorKey: 'ownTokens',
		enableSorting: true,
		sortingFn: keySorting('ownTokens'),
		cell: (info) => {
			const value = info.getValue()?.total
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		}
	},
	{
		header: 'Third Party',
		accessorKey: 'thirdParty',
		enableSorting: true,
		sortingFn: keySorting('thirdParty'),
		cell: (info) => {
			const value = info.getValue()?.total
			if (!value) return <></>
			return <>${formattedNum(value)}</>
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
		cell: ({ getValue }) => {
			return <>{'$' + formattedNum(getValue())}</>
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
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					{row.original.slug === undefined ? (
						(getValue() as string | null)
					) : (
						<CustomLink
							href={`/cex/${slug(row.original.slug)}`}
							className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{getValue() as string | null}
						</CustomLink>
					)}
				</span>
			)
		}
	},
	{
		header: 'Assets',
		accessorKey: 'tvl',
		cell: (info) => {
			return (
				<>
					{info.getValue() === undefined ? (
						<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" className="ml-auto" />
					) : (
						'$' + formattedNum(info.getValue())
					)}
				</>
			)
		},
		sortingFn: sortingFns.datetime,
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
				<span className="flex items-center gap-1 justify-end">
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
				</span>
			)
		},
		sortingFn: sortingFns.datetime,
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'TVL of the CEX excluding all assets issued by itself, such as their own token'
		}
	},
	{
		header: '24h Inflows',
		accessorKey: '24hInflows',
		size: 120,
		cell: (info) => (
			<span
				className="text-[var(--text1)]"
				style={
					(info.getValue() as number) < 0
						? ({ '--text1': '#f85149' } as any)
						: (info.getValue() as number) > 0
						? { '--text1': '#3fb950' }
						: {}
				}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortingFn: sortingFns.datetime,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Inflows',
		accessorKey: '7dInflows',
		size: 120,
		cell: (info) => (
			<span
				className="text-[var(--text1)]"
				style={
					(info.getValue() as number) < 0
						? ({ '--text1': '#f85149' } as any)
						: (info.getValue() as number) > 0
						? { '--text1': '#3fb950' }
						: {}
				}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortingFn: sortingFns.datetime,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Inflows',
		accessorKey: '1mInflows',
		size: 120,
		cell: (info) => (
			<span
				className="text-[var(--text1)]"
				style={
					(info.getValue() as number) < 0
						? ({ '--text1': '#f85149' } as any)
						: (info.getValue() as number) > 0
						? { '--text1': '#3fb950' }
						: {}
				}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortingFn: sortingFns.datetime,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Custom range Inflows',
		accessorKey: 'customRange',
		size: 200,
		cell: (info) => (
			<span
				className="text-[var(--text1)]"
				style={
					(info.getValue() as number) < 0
						? ({ '--text1': '#f85149' } as any)
						: (info.getValue() as number) > 0
						? { '--text1': '#3fb950' }
						: {}
				}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortingFn: sortingFns.datetime,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Auditor',
		accessorKey: 'auditor',
		cell: ({ getValue }) => <>{(getValue() ?? null) as string | null}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Last audit date',
		accessorKey: 'lastAuditDate',
		cell: ({ getValue }) => <>{getValue() === undefined ? null : toNiceDayMonthAndYear(getValue())}</>,
		size: 128,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Spot Volume',
		accessorKey: 'spotVolume',
		cell: (info) => (info.getValue() ? '$' + formattedNum(info.getValue()) : null),
		sortingFn: sortingFns.datetime,
		size: 125,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Open Interest',
		accessorKey: 'oi',
		cell: (info) => (info.getValue() ? '$' + formattedNum(info.getValue()) : null),
		sortingFn: sortingFns.datetime,
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Leverage',
		accessorKey: 'leverage',
		cell: (info) => (info.getValue() ? Number(Number(info.getValue()).toFixed(2)) + 'x' : null),
		sortingFn: sortingFns.datetime,
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
			<>
				{getValue() === undefined ? null : (
					<ButtonLight
						className="flex items-center justify-center gap-4 !p-[6px]"
						as="a"
						href={getValue() as string}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="arrow-up-right" height={14} width={14} />
					</ButtonLight>
				)}
			</>
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
			<>
				{getValue() === undefined ? (
					<QuestionHelper text="This CEX has no published their wallet addresses" />
				) : (
					<ButtonLight
						className="flex items-center justify-center gap-4 !p-[6px]"
						as="a"
						href={getValue() as string}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="arrow-up-right" height={14} width={14} />
					</ButtonLight>
				)}
			</>
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
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(name)} data-lgonly />
					<CustomLink
						href={`/protocol/${slug}#treasury`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{name}
					</CustomLink>
				</span>
			)
		},
		size: 220
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
					<span className="h-5 !w-full ml-auto bg-white flex items-center flex-nowrap">
						{dominance.map((dom) => {
							const color = breakdownColor(dom[0])
							const name = `${formatBreakdownType(dom[0])} (${dom[1]}%)`

							return (
								<div
									key={dom[0] + dom[1] + info.row.original.name}
									style={{ width: `${dom[1]}px`, background: color }}
									className="h-5"
								/>
							)
						})}
					</span>
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
		size: 115,
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
		size: 160,
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
		size: 120,
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
		header: 'Total excl. own tokens',
		accessorKey: 'coreTvl',
		id: 'coreTvl',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 185,
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
		size: 135,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Mcap',
		accessorKey: 'mcap',
		id: 'mcap',
		cell: (info) => {
			return <>{info.getValue() === null ? null : '$' + formattedNum(info.getValue())}</>
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
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span> <TokenLogo logo={row.original.logo} data-lgonly />
					<CustomLink
						href={`/protocol/${nameSlug}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string | null}
					</CustomLink>
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
		size: 120
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
		size: 125
	},
	{
		header: 'LSD',
		accessorKey: 'lsdSymbol',
		cell: ({ getValue, row }) => {
			if (!row.original.pegInfo) return `${getValue()}`
			return (
				<span className="flex items-center justify-end gap-1">
					{row.original.pegInfo ? <QuestionHelper text={row.original.pegInfo} /> : null}
					{getValue() as string | null}
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
			const TooltipContent = () => {
				return (
					<>
						<span>{`Market Rate: ${row.original?.marketRate?.toFixed(4)}`}</span>
						<span>{`Expected Rate: ${row.original?.expectedRate?.toFixed(4)}`}</span>
					</>
				)
			}
			return <Tooltip content={<TooltipContent />}>{getValue() ? formattedPercent(getValue()) : null}</Tooltip>
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
				return <>{row.original.mcap ? <span>{`Market Cap: $${toK(row.original.mcap)}`}</span> : null}</>
			}
			return <Tooltip content={<TooltipContent />}>{(getValue() ?? null) as string | null}</Tooltip>
		},
		meta: {
			align: 'end'
		},
		size: 110
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
		size: 100
	},
	{
		header: 'Fee',
		accessorKey: 'fee',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value && value.toFixed(2) + '%'}</>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Protocol Fee'
		},
		size: 90
	}
]

export const ETFColumn: ColumnDef<IETFRow>[] = [
	{
		header: 'ETF',
		accessorKey: 'ticker',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					<CustomLink
						href={row.original.url}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string | null}
					</CustomLink>
				</span>
			)
		},
		size: 100
	},
	{
		header: 'Issuer',
		accessorKey: 'issuer',
		meta: {
			align: 'end'
		},
		size: 160
	},
	{
		header: 'Chain',
		accessorKey: 'chain',
		enableSorting: true,
		cell: ({ getValue }) => (
			<IconsRow links={getValue() as Array<string>} url="" iconType="chain" disableLinks={true} />
		),
		meta: {
			align: 'end'
		},
		size: 160
	},

	{
		header: 'Flows',
		accessorKey: 'flows',
		cell: ({ getValue }) => <>{getValue() !== null ? '$' + formattedNum(getValue()) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'AUM',
		accessorKey: 'aum',
		cell: ({ getValue }) => <>{getValue() !== null ? '$' + formattedNum(getValue()) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume',
		accessorKey: 'volume',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 120
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
				<ButtonLight
					className="flex items-center justify-center gap-4 !p-[6px]"
					as="a"
					href={getValue() as string}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
				</ButtonLight>
			) : null
	},
	{
		header: 'Explorer',
		accessorKey: 'explorer',
		size: 80,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<ButtonLight
					className="flex items-center justify-center gap-4 !p-[6px]"
					as="a"
					href={getValue() as string}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
				</ButtonLight>
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

export const CategoryPerformanceColumn: ColumnDef<CategoryPerformanceRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					{['bitcoin', 'ethereum', 'solana'].includes(row.original.id) ? (
						<CustomLink
							href={`https://www.coingecko.com/en/coins/${row.original.id}`}
							target="_blank"
							className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{getValue() as string | null}
						</CustomLink>
					) : (
						<CustomLink
							href={`/narrative-tracker/${row.original.id}`}
							className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{getValue() as string | null}
						</CustomLink>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Δ%',
		accessorKey: 'change',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: `Shows how a category of coins has performed over your chosen time period and in your selected denomination (e.g., $, BTC). Method: 1. calculating the percentage change for each individual coin in the category. 2. weighting these changes based on each coin's market capitalization. 3. averaging these weighted changes to get the overall category performance.`
		},
		size: 120
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '24h Volume',
		accessorKey: 'volume1D',
		cell: ({ getValue }) => <>{getValue() ? '$' + formattedNum(getValue()) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: '# of Coins',
		accessorKey: 'nbCoins',
		meta: {
			align: 'end'
		},
		size: 110
	}
]

export const CoinPerformanceColumn: ColumnDef<CoinPerformanceRow>[] = [
	{
		header: 'Coin',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<span className="flex items-center gap-2 relative">
					<span>{index + 1}.</span>
					<CustomLink
						href={`https://www.coingecko.com/en/coins/${row.original.id}`}
						target="_blank"
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string | null}
					</CustomLink>
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Δ%',
		accessorKey: 'change',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: `Shows how a coin has performed over your chosen time period and in your selected denomination (e.g., $, BTC).`
		},
		size: 120
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '24h Volume',
		accessorKey: 'volume1D',
		cell: ({ getValue }) => <>{getValue() ? '$' + formattedNum(getValue()) : null}</>,
		meta: {
			align: 'end'
		},
		size: 110
	}
]

function formatCexInflows(value) {
	if (Number.isNaN(Number(value))) return null

	let x = value
	let isNegative = false

	if (value.toString().startsWith('-')) {
		isNegative = true
		x = value.toString().split('-').slice(1).join('-')
	}

	return `${isNegative ? '-' : '+'} $${toK(x)}`
}

// key: min width of window/screen
// values: table columns order
export const chainsTableColumnOrders = formatColumnOrder({
	0: [
		'name',
		'tvl',
		'chainAssets',
		'change_7d',
		'protocols',
		'users',
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
		'chainAssets',
		'protocols',
		'users',
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
		'users',
		'change_7d',
		'tvl',
		'chainAssets',
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
		'users',
		'change_1d',
		'change_7d',
		'change_1m',
		'tvl',
		'chainAssets',
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

	return '#f85149'
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
		<span className="flex items-center flex-nowrap gap-1">
			<span style={{ '--color': color } as any} className="h-4 w-4 bg-[var(--color)] rounded-sm"></span>
			<span>{name}</span>
		</span>
	)
}

const TooltipContent = ({ dominance, protocolName }) => {
	return (
		<span className="flex flex-col gap-1">
			{dominance.map((dom) => (
				<Breakdown data={dom} key={dom[0] + dom[1] + protocolName + 'tooltip-content'} />
			))}
		</span>
	)
}

const SimpleUpcomingEvent = ({ timestamp, name }) => {
	const timeLeft = timestamp - Date.now() / 1e3
	const days = Math.floor(timeLeft / 86400)
	const hours = Math.floor((timeLeft - 86400 * days) / 3600)
	const minutes = Math.floor((timeLeft - 86400 * days - 3600 * hours) / 60)
	const seconds = Math.floor(timeLeft - 86400 * days - 3600 * hours - minutes * 60)

	const [_, rerender] = useState(1)

	useEffect(() => {
		const id = setInterval(() => rerender((value) => value + 1), 1000)

		return () => clearInterval(id)
	}, [])

	return (
		<span className="flex items-center gap-2">
			<span>{name}</span>
			<span className="h-10 w-[1px] bg-[var(--bg4)]" />
			<span className="flex items-center gap-1">
				<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">{days}D</span>
				<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">{hours}H</span>
				<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">{minutes}M</span>
				<span className="bg-[var(--bg4)] rounded-md text-sm h-8 w-8 flex items-center justify-center">{seconds}S</span>
			</span>
			<span className="h-10 w-[1px] bg-[var(--bg4)]" />
			<span className="flex items-center justify-between gap-2">
				<span>{toNiceDayMonthYear(timestamp)}</span>
				<span>{toNiceHour(timestamp)}</span>
			</span>
		</span>
	)
}
