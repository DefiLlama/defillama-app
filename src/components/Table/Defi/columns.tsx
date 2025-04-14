import { ColumnDef } from '@tanstack/react-table'
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
	slug,
	toK,
	tokenIconUrl,
	toNiceDayMonthAndYear,
	toNiceDayMonthYear,
	toNiceHour
} from '~/utils'
import { UpcomingEvent } from '~/containers/ProtocolOverview/Emissions/UpcomingEvent'
import { formatColumnOrder } from '../utils'
import type {
	AirdropRow,
	CategoryPerformanceRow,
	CoinPerformanceRow,
	IBridgedRow,
	ICategoryRow,
	IEmission,
	IETFRow,
	IForksRow,
	IGovernance,
	ILSDRow
} from './types'
import * as Ariakit from '@ariakit/react'

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
						href={`/protocols/${slug(getValue() as string)}`}
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
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Combined TVL',
		accessorKey: 'tvl',
		accessorFn: (row) => row.tvl ?? undefined,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value && value > 0 ? <>{'$' + formattedNum(value)}</> : <></>
		},
		meta: {
			align: 'end'
		},
		sortUndefined: 'last',
		size: 135
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
		header: 'Combined 24h Revenue',
		accessorKey: 'revenue',
		accessorFn: (row) => row.revenue ?? undefined,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return value && value > 0 ? <>{'$' + formattedNum(value)}</> : <></>
		},
		meta: {
			align: 'end'
		},
		sortUndefined: 'last',
		size: 200
	},
	{
		header: 'Description',
		accessorKey: 'description',
		enableSorting: false,
		size: 1600
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
						href={`/unlocks/${slug(getValue() as string)}`}
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
							href={`/unlocks/${slug(row.original.link)}`}
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
						href={`/governance/${slug(getValue() as string)}`}
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
							href={`/raises/${slug(getValue() as string)}`}
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
		size: 180
	},
	{
		header: 'Top Round Type',
		accessorKey: 'roundType',
		enableSorting: false,
		size: 140
	},
	{
		header: 'Projects',
		accessorKey: 'projects',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<Ariakit.HovercardProvider>
					<Ariakit.HovercardAnchor className="whitespace-nowrap text-ellipsis overflow-hidden">
						{getValue() as string | null}
					</Ariakit.HovercardAnchor>
					<Ariakit.Hovercard
						unmountOnHide
						wrapperProps={{
							className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
						}}
						className="max-w-xl z-10 p-1 shadow rounded-md bg-[var(--bg2)] border border-[var(--bg3)] text-[var(--text1)] flex items-center justify-start flex-wrap gap-1 bg-none overflow-hidden max-sm-drawer"
					>
						{getValue() as string | null}
					</Ariakit.Hovercard>
				</Ariakit.HovercardProvider>
			)
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

export const bridgedColumns: ColumnDef<IBridgedRow>[] = [
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
		accessorFn: (row) => row.total?.total ?? undefined,
		cell: (info: any) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Total value of assets on the chain, excluding own tokens' }
	},
	{
		header: 'Change 24h',
		accessorKey: 'change_24h',
		accessorFn: (row) => row.change_24h ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <div style={{ color: Number(value) > 0 ? '#198600' : '#d92929' }}>{formattedPercent(value)}</div>
		},
		sortUndefined: 'last',
		meta: { align: 'end' }
	},
	{
		header: 'Native',
		accessorKey: 'native',
		accessorFn: (row) => row.native?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Assets minted natively on the chain' }
	},
	{
		header: 'Canonical',
		accessorKey: 'canonical',
		accessorFn: (row) => row.canonical?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Assets bridged through the official canonical bridge' }
	},
	{
		header: 'Own Tokens',
		accessorKey: 'ownTokens',
		accessorFn: (row) => row.ownTokens?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'The chains own token, either for gas or for governance ' }
	},
	{
		header: 'Third Party',
		accessorKey: 'thirdParty',
		accessorFn: (row) => row.thirdParty?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Assets bridged through bridges that aren’t the canonical bridge' }
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
		},
		sortUndefined: 'last'
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
		accessorFn: (row) => row.tvl ?? undefined,
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
		sortUndefined: 'last',
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
		accessorFn: (row) => row.cleanTvl ?? undefined,
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
		sortUndefined: 'last',
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'TVL of the CEX excluding all assets issued by itself, such as their own token'
		}
	},
	{
		header: '24h Inflows',
		accessorKey: '24hInflows',
		accessorFn: (row) => row['24hInflows'] ?? undefined,
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
		sortUndefined: 'last',
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Inflows',
		accessorKey: '7dInflows',
		accessorFn: (row) => row['7dInflows'] ?? undefined,
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
		sortUndefined: 'last',
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Inflows',
		accessorKey: '1mInflows',
		accessorFn: (row) => row['1mInflows'] ?? undefined,
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
		sortUndefined: 'last',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Custom range Inflows',
		accessorKey: 'customRange',
		accessorFn: (row) => row.customRange ?? undefined,
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
		sortUndefined: 'last',
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
		accessorFn: (row) => row.spotVolume ?? undefined,
		cell: (info) => (info.getValue() ? '$' + formattedNum(info.getValue()) : null),
		sortUndefined: 'last',
		size: 125,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Open Interest',
		accessorKey: 'oi',
		accessorFn: (row) => row.oi ?? undefined,
		cell: (info) => (info.getValue() ? '$' + formattedNum(info.getValue()) : null),
		sortUndefined: 'last',
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Leverage',
		accessorKey: 'leverage',
		accessorFn: (row) => row.leverage ?? undefined,
		cell: (info) => (info.getValue() ? Number(Number(info.getValue()).toFixed(2)) + 'x' : null),
		sortUndefined: 'last',
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
			const TooltipContent = () => {
				return (
					<span className="flex flex-col gap-1">
						<span>{`Market Rate: ${row.original?.marketRate?.toFixed(4)}`}</span>
						<span>{`Expected Rate: ${row.original?.expectedRate?.toFixed(4)}`}</span>
					</span>
				)
			}
			return (
				<Tooltip content={<TooltipContent />} className="flex-end">
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
			const TooltipContent = () => {
				return <>{row.original.mcap ? <span>{`Market Cap: $${toK(row.original.mcap)}`}</span> : null}</>
			}
			return (
				<Tooltip content={<TooltipContent />} className="flex-end">
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
		header: 'Ticker',
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
		header: 'Coin',
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
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			const formattedValue = value !== null ? '$' + formattedNum(value) : null

			return (
				<span
					className={`font-bold ${value && value > 0 ? 'text-green-500' : value && value < 0 ? 'text-red-500' : ''}`}
				>
					{formattedValue}
				</span>
			)
		},
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
