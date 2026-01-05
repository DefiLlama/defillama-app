import { lazy, Suspense } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Bookmark } from '~/components/Bookmark'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { UpcomingEvent } from '~/containers/ProtocolOverview/Emissions/UpcomingEvent'
import { formattedNum, formattedPercent, slug, tokenIconUrl, toNiceDayMonthAndYear, toNiceDayMonthYear } from '~/utils'
import { RANK_COLUMN_CONFIG } from '~/utils/rankCell'
import { formatColumnOrder } from '../utils'
import type { AirdropRow, IEmission, IForksRow, IGovernance, ILSDRow } from './types'

const UnconstrainedSmolLineChart = lazy(() =>
	import('~/components/Charts/UnconstrainedSmolLineChart').then((m) => ({ default: m.UnconstrainedSmolLineChart }))
)
export const forksColumn: ColumnDef<IForksRow>[] = [
	RANK_COLUMN_CONFIG,
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			return (
				<span className="relative flex items-center gap-2">
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
			return <>{value && value.toFixed(2) + '%'}</>
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

export const emissionsColumns: ColumnDef<IEmission>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<span className="relative flex items-center gap-2 pl-6">
					<Bookmark readableName={getValue() as string} data-bookmark className="absolute -left-0.5" />
					<TokenLogo logo={tokenIconUrl(getValue())} />
					<BasicLink
						href={`/unlocks/${slug(getValue() as string)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string}
					</BasicLink>
				</span>
			)
		},
		size: 160
	},
	{
		header: 'Price',
		accessorKey: 'tPrice',
		accessorFn: (row) => (row.tPrice ? +row.tPrice : undefined),
		sortUndefined: 'last',
		cell: ({ getValue }) => {
			return <>{getValue() ? '$' + (+getValue()).toFixed(2) : ''}</>
		},
		meta: {
			align: 'end'
		},
		size: 80
	},
	{
		header: 'MCap',
		accessorKey: 'mcap',
		accessorFn: (row) => (row.mcap ? +row.mcap : undefined),
		sortUndefined: 'last',
		cell: ({ getValue }) => {
			if (!getValue()) return null
			return <>{formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},

	{
		header: 'Total Unlocked',
		id: 'totalLocked',
		accessorFn: (row) => (row.maxSupply && row.totalLocked ? row.totalLocked / row.maxSupply : 0),
		cell: ({ row }) => {
			const percetage = (100 - (row.original.totalLocked / row.original.maxSupply) * 100).toPrecision(2)

			return (
				<div className="flex flex-col items-end gap-2 px-2">
					<span className="flex items-center justify-between gap-2">
						<span className="text-[#3255d7]">{formattedNum(percetage)}%</span>
					</span>
					<div
						className="h-2 w-full rounded-full"
						style={{
							background: `linear-gradient(90deg, #3255d7 ${percetage}%, var(--bg4) ${percetage}%)`
						}}
					/>
				</div>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Prev. Unlock Analysis',
		id: 'prevUnlock',
		sortUndefined: 'last',
		accessorFn: (row) => (row.historicalPrice ? row.historicalPrice : undefined),

		cell: ({ row }) => {
			return (
				<div className="relative">
					<Suspense fallback={<></>}>
						<UnconstrainedSmolLineChart
							series={row.original.historicalPrice}
							name=""
							color={
								!row.original.historicalPrice?.length
									? 'red'
									: row.original.historicalPrice[Math.floor(row.original.historicalPrice.length / 2)][1] >=
										  row.original.historicalPrice[row.original.historicalPrice.length - 1][1]
										? 'red'
										: 'green'
							}
							className="my-auto h-[53px]"
							extraData={{
								lastEvent: row.original.lastEvent
							}}
						/>
					</Suspense>
				</div>
			)
		},
		meta: {
			align: 'end',
			headerHelperText:
				"Price trend shown from 7 days before to 7 days after the most recent major unlock event. Doesn't include Non-Circulating and Farming emissions."
		},
		size: 180
	},
	{
		header: '7d Post Unlock',
		id: 'postUnlock',
		sortUndefined: 'last',
		accessorFn: (row) => {
			if (!row.historicalPrice?.length || row.historicalPrice.length < 8) return undefined
			const priceAtUnlock = row.historicalPrice[7][1]
			const priceAfter7d = row.historicalPrice[row.historicalPrice.length - 1][1]
			return ((priceAfter7d - priceAtUnlock) / priceAtUnlock) * 100
		},
		cell: ({ getValue }) => {
			return <span>{getValue() ? formattedPercent(getValue()) : ''}</span>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Price change 7 days after the most recent major unlock event'
		},
		size: 140
	},
	{
		header: 'Daily Unlocks',
		id: 'nextEvent',
		sortUndefined: 'last',
		accessorFn: (row) => (row.tPrice && row.unlocksPerDay ? +row.tPrice * row.unlocksPerDay : undefined),
		cell: ({ getValue, row }) => {
			if (!row.original.unlocksPerDay) return '-'

			return (
				<span className="flex flex-col gap-1">
					{getValue() ? formattedNum((getValue() as number).toFixed(2), true) : ''}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Next Event',
		id: 'upcomingEvent',
		accessorFn: (row) => {
			let { timestamp } = row.upcomingEvent?.[0] || {}
			if (!timestamp || timestamp < Date.now() / 1e3) return undefined
			return timestamp
		},
		sortUndefined: 'last',
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
		size: 400
	}
]

export const governanceColumns: ColumnDef<IGovernance>[] = [
	RANK_COLUMN_CONFIG,
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-0.5"
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
					) : null}
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<BasicLink
						href={`/governance/${slug(getValue() as string)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string}
					</BasicLink>
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

export const LSDColumn: ColumnDef<ILSDRow>[] = [
	RANK_COLUMN_CONFIG,
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const nameSlug = row.original.name.replace(/\s+/g, '-').toLowerCase()

			return (
				<span className="relative flex items-center gap-2">
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
				<Tooltip content={<TooltipContent />} className="justify-end">
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
				return <>{row.original.mcap ? <span>{`Market Cap: ${formattedNum(row.original.mcap, true)}`}</span> : null}</>
			}
			return (
				<Tooltip content={<TooltipContent />} className="justify-end">
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

export const raisesColumnOrders = formatColumnOrder({
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
})
