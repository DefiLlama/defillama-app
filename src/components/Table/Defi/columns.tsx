import { ColumnDef, sortingFns } from '@tanstack/react-table'
import styled from 'styled-components'
import { ArrowUpRight, ChevronDown, ChevronRight, Tool } from 'react-feather'
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
	formatPercentage,
	formattedNum,
	formattedPercent,
	formatUnlocksEvent,
	getDominancePercent,
	slug,
	standardizeProtocolName,
	toK,
	tokenIconUrl,
	toNiceDayMonthAndYear,
	toNiceDayMonthYear,
	toNiceHour
} from '~/utils'
import { AccordionButton, Name } from '../shared'
import { formatColumnOrder } from '../utils'
import type {
	ICategoryRow,
	IChainsRow,
	IForksRow,
	IOraclesRow,
	ILSDRow,
	IEmission,
	IGovernance,
	IETFRow,
	AirdropRow,
	IBridgedRow,
	CategoryReturnsRow,
	CoinReturnsRow
} from './types'
import { AutoColumn } from '~/components/Column'
import { useEffect, useState } from 'react'
import UpcomingEvent from '../Components/UpcomingEvent'
import ProgressBar from '../Components/ProgressBar'
import TooltipNew from '~/components/Tooltip/TootltipNew'
import { sluggify } from '~/utils/cache-client'

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
					<span>{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />

					<CustomLink href={`/forks/${getValue()}`}>{getValue()}</CustomLink>
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

export const emissionsColumns: ColumnDef<IEmission>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<CustomLink href={`/unlocks/${standardizeProtocolName(getValue() as string)}`}>{getValue()}</CustomLink>
				</Name>
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
		cell: ({ getValue, row }) => {
			if (!getValue()) return null
			return (
				<AutoColumn gap="4px">
					<span>{'$' + formattedNum(getValue())}</span>
				</AutoColumn>
			)
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
				<ProgressBar
					percent={percetage}
					maxSupply={row.original.maxSupply}
					symbol={row.original.tSymbol}
					tokenPrice={row.original.tokenPrice}
					name={row.original.name}
				/>
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
				<AutoColumn gap="4px">
					{getValue() ? '$' + formattedNum((getValue() as number).toFixed(2)) : ''}
					<LightText>{formattedNum(row.original.unlocksPerDay) + (symbol ? ` ${symbol.toUpperCase()}` : '')}</LightText>
				</AutoColumn>
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
				<Name>
					<span>{index + 1}</span>
					{row.original.type === 'Unlock' ? (
						<CustomLink href={`/unlocks/${standardizeProtocolName(row.original.link)}`}>{getValue()}</CustomLink>
					) : (
						getValue()
					)}
				</Name>
			)
		},
		size: 220
	},
	{
		header: 'Type',
		accessorKey: 'type',
		size: 800
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
				<Name>
					<span>{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<CustomLink href={`/protocol/${standardizeProtocolName(getValue() as string)}`}>{getValue()}</CustomLink>
				</Name>
			)
		},
		size: 220
	},
	{
		header: 'Headcount',
		accessorKey: 'headcount',
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		},
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
				<ButtonYields
					as="a"
					href={getValue()[0] as string}
					target="_blank"
					rel="noopener noreferrer"
					data-lgonly
					useTextColor={true}
				>
					<ArrowUpRight size={14} />
				</ButtonYields>
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
				<Name depth={row.depth}>
					<AccordionButton
						{...{
							onClick: row.getToggleExpandedHandler()
						}}
					>
						{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</AccordionButton>
					<span>{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<CustomLink href={`/governance/${standardizeProtocolName(getValue() as string)}`}>{getValue()}</CustomLink>
				</Name>
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
			return <CustomLink href={`/raises/${standardizeProtocolName(getValue() as string)}`}>{getValue()}</CustomLink>
		},
		size: 120
	},
	{
		header: 'Deals',
		accessorKey: 'deals',
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},

	{
		header: 'Median Amount',
		accessorKey: 'medianAmount',
		cell: ({ getValue }) => {
			return <>${getValue()}m</>
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
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		},
		size: 160
	},
	{
		header: 'Top Round Type',
		accessorKey: 'roundType',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		},
		size: 120
	},
	{
		header: 'Projects',
		accessorKey: 'projects',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Tooltip2 content={getValue()}>{getValue()}</Tooltip2>
		},
		size: 240
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
		size: s === 'classification' ? 140 : 200,
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
		size: 40,
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
		header: 'Active Addresses',
		accessorKey: 'users',
		cell: (info) => <>{info.getValue() === 0 || formattedNum(info.getValue())}</>,
		size: 120,
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
				<div style={{ width: '200px' }}>
					{chainAssets.native && (
						<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
							<span>Native:</span>
							<span>{formattedNum(chainAssets.native.total, true)}</span>
						</div>
					)}
					{chainAssets.canonical && (
						<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
							<span>Canonical:</span>
							<span>{formattedNum(chainAssets.canonical.total, true)}</span>
						</div>
					)}

					{chainAssets.ownTokens && (
						<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
							<span>Own Tokens:</span>
							<span>{formattedNum(chainAssets.ownTokens.total, true)}</span>
						</div>
					)}
					{chainAssets.thirdParty && (
						<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
							<span>Third Party:</span>
							<span>{formattedNum(chainAssets.thirdParty.total, true)}</span>
						</div>
					)}
				</div>
			)
			return <TooltipNew content={chainAssetsBreakdown}>{totalValue}</TooltipNew>
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
			return <>{info.getValue() ?? null}</>
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
		size: 120,
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
					<CustomLink href={`/bridged/${getValue()}`}>{getValue()}</CustomLink>
				</Name>
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
		enableSorting: false,
		cell: ({ getValue }) => {
			return <Name>{getValue()}</Name>
		}
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
			<InflowOutflow
				data-variant={(info.getValue() as number) < 0 ? 'red' : (info.getValue() as number) > 0 ? 'green' : 'white'}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</InflowOutflow>
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
			<InflowOutflow
				data-variant={(info.getValue() as number) < 0 ? 'red' : (info.getValue() as number) > 0 ? 'green' : 'white'}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</InflowOutflow>
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
			<InflowOutflow
				data-variant={(info.getValue() as number) < 0 ? 'red' : (info.getValue() as number) > 0 ? 'green' : 'white'}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</InflowOutflow>
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
			<InflowOutflow
				data-variant={(info.getValue() as number) < 0 ? 'red' : (info.getValue() as number) > 0 ? 'green' : 'white'}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</InflowOutflow>
		),
		sortingFn: sortingFns.datetime,
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
		sortingFn: sortingFns.datetime,
		size: 120,
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
		header: 'Total excl. own tokens',
		accessorKey: 'coreTvl',
		id: 'coreTvl',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 180,
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
				return <>{row.original.mcap ? <span>{`Market Cap: $${toK(row.original.mcap)}`}</span> : null}</>
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
		header: 'Ticker',
		accessorKey: 'ticker',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span>
					<CustomLink href={row.original.url}>{getValue()}</CustomLink>
				</Name>
			)
		},
		size: 100
	},
	{
		header: 'Issuer',
		accessorKey: 'issuer',
		cell: ({ getValue }) => <>{getValue()}</>,
		meta: {
			align: 'end'
		},
		size: 160
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
		header: 'Price',
		accessorKey: 'price',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Terminal fee',
		accessorKey: 'pct_fee',
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
		header: 'Custodian',
		accessorKey: 'custodian',
		cell: ({ getValue }) => <>{getValue()}</>,
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
		cell: ({ getValue, row, table }) => {
			return <Name>{getValue()}</Name>
		},
		size: 120
	},
	{
		header: 'Claim Page',
		accessorKey: 'page',
		size: 100,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
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
			) : null
	},
	{
		header: 'Explorer',
		accessorKey: 'explorer',
		size: 80,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
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
		cell: ({ getValue }) => <>{getValue()}</>,
		meta: {
			align: 'end'
		},
		size: 190
	},
	{
		header: 'End',
		accessorKey: 'endTime',
		cell: ({ getValue }) => <>{getValue()}</>,
		meta: {
			align: 'end'
		},
		size: 190
	}
]

export const CategoryReturnsColumn: ColumnDef<CategoryReturnsRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span>
					<CustomLink href={`/returns/${row.original.id}`}>{getValue()}</CustomLink>
				</Name>
			)
		},
		size: 280
	},
	{
		header: 'MCAP',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1d change',
		accessorKey: 'returns1D',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1w change',
		accessorKey: 'returns1W',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1m change',
		accessorKey: 'returns1M',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1y change',
		accessorKey: 'returns1Y',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '# of Coins',
		accessorKey: 'nbCoins',
		cell: ({ getValue }) => <>{getValue()}</>,
		meta: {
			align: 'end'
		},
		size: 110
	}
]

export const CoinReturnsColumn: ColumnDef<CoinReturnsRow>[] = [
	{
		header: 'Coin',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<Name>
					<span>{index + 1}</span>
					<CustomLink href={`https://www.coingecko.com/en/coins/${row.original.id}`} target="_blank">
						{getValue()}
					</CustomLink>
				</Name>
			)
		},
		size: 280
	},
	{
		header: 'MCAP',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1d change',
		accessorKey: 'returns1D',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1w change',
		accessorKey: 'returns1W',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1m change',
		accessorKey: 'returns1M',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '1y change',
		accessorKey: 'returns1Y',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
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

export const InflowOutflow = styled.span`
	color: ${({ theme }) => theme.text1};

	&[data-variant='green'] {
		color: #3fb950;
	}

	&[data-variant='red'] {
		color: #f85149;
	}
`

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

const LightText = styled.span`
	opacity: 0.6;
	min-width: 120px;
`

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
		<EventWrapper>
			<span>{name}</span>
			<span data-divider></span>
			<TimeLeft>
				<span>
					<span>{days}</span>
					<span>D</span>
				</span>

				<span data-divider></span>

				<span>
					<span>{hours}</span>
					<span>H</span>
				</span>

				<span data-divider></span>

				<span>
					<span>{minutes}</span>
					<span>M</span>
				</span>

				<span data-divider></span>

				<span>
					<span>{seconds}</span>
					<span>S</span>
				</span>
			</TimeLeft>

			<span data-divider></span>

			<span>
				<span>{toNiceDayMonthYear(timestamp)}</span>
				<span>{toNiceHour(timestamp)}</span>
			</span>
		</EventWrapper>
	)
}

const TimeLeft = styled.span`
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: 8px;
	font-size: 0.825rem;

	& > * {
		display: flex;
		flex-direction: column;
		align-items: center;

		& > *:nth-child(1) {
			padding: 4px;
			background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)')};
			color: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
			border-radius: 4px;
			min-width: 25px;
			text-align: center;
			font-weight: 500;
		}

		& > *:nth-child(2) {
			opacity: 0.6;
		}
	}

	& > *[data-divider='true'] {
		height: 4px;
		width: 1px;
		background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')};
		margin: auto 0;
	}
`

const EventWrapper = styled.span`
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: nowrap;
	font-size: 0.75rem;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'black' : '#f2f2f2')};
	border-radius: 4px;
	padding: 8px;

	& > *[data-divider='true'] {
		height: 40px;
		width: 1px;
		background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')};
		margin: 0 8px;
	}

	& > *:first-child,
	& > *:last-child {
		display: flex;
		flex-direction: column;
		gap: 4px;

		& > *:nth-child(2) {
			opacity: 0.6;
		}
	}

	& > *:last-child {
		& > *:last-child {
			text-align: end;
		}
	}

	& > *:first-child {
		overflow-wrap: break-word;
		white-space: normal;
	}
`
