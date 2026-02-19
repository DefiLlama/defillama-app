'use no memo'

import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Parser } from 'expr-eval'
import * as React from 'react'
import { Bookmark } from '~/components/Bookmark'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { removedCategoriesFromChainTvlSet } from '~/constants'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { definitions } from '~/public/definitions'
import { chainIconUrl, formattedNum, renderPercentChange, slug, tokenIconUrl } from '~/utils'
import type { TableFilters } from '../../types'
import { SHARE_METRIC_DEFINITIONS, USD_METRIC_KEYS } from './proTable.constants'
import type { IProtocolRow, CustomColumn } from './proTable.types'

export enum TABLE_CATEGORIES {
	FEES = 'Fees',
	REVENUE = 'Revenue',
	VOLUME = 'Volume',
	TVL = 'TVL'
}

enum TABLE_PERIODS {
	ONE_DAY = '1d',
	SEVEN_DAYS = '7d',
	ONE_MONTH = '1m'
}

const expressionParser = new Parser()

export const protocolsByChainTableColumns = [
	{ name: 'Name', key: 'name' },
	{ name: 'Category', key: 'category' },
	{ name: 'Oracles', key: 'oracles' },
	{ name: 'Chains', key: 'chains' },
	{ name: 'TVL', key: 'tvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'TVL 1d change', key: 'change_1d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'TVL 7d change', key: 'change_7d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'TVL 1m change', key: 'change_1m', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Market Cap', key: 'mcap', category: TABLE_CATEGORIES.TVL },
	{ name: 'Mcap/TVL', key: 'mcaptvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'Fees 24h', key: 'fees_24h', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Fees 7d', key: 'fees_7d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Fees 30d', key: 'fees_30d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Fees 1y', key: 'fees_1y', category: TABLE_CATEGORIES.FEES },
	{
		name: 'Monthly Avg 1Y Fees',
		key: 'average_1y',
		category: TABLE_CATEGORIES.FEES
	},
	{ name: 'Fees Change 1d', key: 'feesChange_1d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Fees Change 7d', key: 'feesChange_7d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Fees Change 1m', key: 'feesChange_1m', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Fees Change 7d (vs prev 7d)',
		key: 'feesChange_7dover7d',
		category: TABLE_CATEGORIES.FEES,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Fees Change 30d',
		key: 'feesChange_30dover30d',
		category: TABLE_CATEGORIES.FEES,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Revenue 24h', key: 'revenue_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Revenue 7d', key: 'revenue_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Revenue 30d', key: 'revenue_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Revenue 1y', key: 'revenue_1y', category: TABLE_CATEGORIES.REVENUE },
	{
		name: 'Monthly Avg 1Y Rev',
		key: 'average_revenue_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{
		name: 'Revenue Change 1d',
		key: 'revenueChange_1d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Revenue Change 7d',
		key: 'revenueChange_7d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Revenue Change 1m',
		key: 'revenueChange_1m',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Revenue Change 7d (vs prev 7d)',
		key: 'revenueChange_7dover7d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Revenue Change 30d',
		key: 'revenueChange_30dover30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'User Fees 24h', key: 'userFees_24h', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Cumulative Fees', key: 'cumulativeFees', category: TABLE_CATEGORIES.FEES },
	{
		name: 'Holders Revenue 24h',
		key: 'holderRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Holders Revenue 30d',
		key: 'holdersRevenue30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Treasury Revenue 24h',
		key: 'treasuryRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Supply Side Revenue 24h',
		key: 'supplySideRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{ name: 'P/S', key: 'ps', category: TABLE_CATEGORIES.REVENUE },
	{ name: 'P/F', key: 'pf', category: TABLE_CATEGORIES.FEES },
	{ name: 'Earnings 24h', key: 'earnings_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{
		name: 'Earnings Change 1d',
		key: 'earningsChange_1d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{ name: 'Earnings 7d', key: 'earnings_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{
		name: 'Earnings Change 7d',
		key: 'earningsChange_7d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{ name: 'Earnings 30d', key: 'earnings_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Earnings Change 1m',
		key: 'earningsChange_1m',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Earnings 1y', key: 'earnings_1y', category: TABLE_CATEGORIES.REVENUE },
	{ name: 'Spot Volume 24h', key: 'volume_24h', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Spot Volume 7d', key: 'volume_7d', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Spot Volume 30d', key: 'volume_30d', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Spot Volume Change 1d',
		key: 'volumeChange_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Spot Volume Change 7d',
		key: 'volumeChange_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Spot Volume Change 1m',
		key: 'volumeChange_1m',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Spot Cumulative Volume', key: 'cumulativeVolume', category: TABLE_CATEGORIES.VOLUME },
	{ name: 'Spot Volume % Share 24h', key: 'volumeDominance_24h', category: TABLE_CATEGORIES.VOLUME },
	{ name: 'Spot Volume % Share 7d', key: 'volumeMarketShare7d', category: TABLE_CATEGORIES.VOLUME },
	{
		name: 'DEX Agg Volume 24h',
		key: 'aggregators_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'DEX Agg Volume Change 1d',
		key: 'aggregators_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'DEX Agg Volume 7d',
		key: 'aggregators_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'DEX Agg Volume Change 7d',
		key: 'aggregators_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'DEX Agg Volume 30d',
		key: 'aggregators_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'DEX Agg Volume % 24h',
		key: 'aggregators_volume_dominance_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'DEX Agg Volume % 7d',
		key: 'aggregators_volume_marketShare7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Bridge Agg Volume 24h',
		key: 'bridge_aggregators_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Bridge Agg Volume Change 1d',
		key: 'bridge_aggregators_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Bridge Agg Volume 7d',
		key: 'bridge_aggregators_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Bridge Agg Volume Change 7d',
		key: 'bridge_aggregators_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Bridge Agg Volume 30d',
		key: 'bridge_aggregators_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Bridge Agg Volume % 24h',
		key: 'bridge_aggregators_volume_dominance_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Options Volume 24h',
		key: 'options_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Options Volume Change 1d',
		key: 'options_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Options Volume 7d',
		key: 'options_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Options Volume Change 7d',
		key: 'options_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Options Volume 30d',
		key: 'options_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Options Volume % 24h',
		key: 'options_volume_dominance_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Perp Volume 24h',
		key: 'perps_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Perp Volume 7d',
		key: 'perps_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Perp Volume 30d',
		key: 'perps_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Perp Volume Change 1d',
		key: 'perps_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Perp Volume Change 7d',
		key: 'perps_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Perp Volume Change 1m',
		key: 'perps_volume_change_1m',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Perp Volume % Share 24h', key: 'perps_volume_dominance_24h', category: TABLE_CATEGORIES.VOLUME },
	{ name: 'Open Interest', key: 'openInterest', category: TABLE_CATEGORIES.VOLUME },
	{
		name: 'Holders Revenue 30d Change',
		key: 'holdersRevenueChange_30dover30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	}
]

const whiteLabeledVaultProviders = new Set(['Veda'])
const columnHelper = createColumnHelper<IProtocolRow>()

const ProtocolChainsComponent = ({ chains }: { chains: string[] }) => (
	<span className="flex flex-col gap-1">
		{chains.map((chain) => (
			<span key={`chain${chain}-of-protocol`} className="flex items-center gap-1">
				<TokenLogo logo={chainIconUrl(chain)} size={14} />
				<span>{chain}</span>
			</span>
		))}
	</span>
)

export const protocolsByChainColumns: ColumnDef<IProtocolRow>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const value = getValue<string>()

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
						<button
							type="button"
							className="absolute -left-0.5"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							)}
						</button>
					) : (
						<Bookmark readableName={value} data-lgonly data-bookmark />
					)}

					<span className="shrink-0">{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="-my-2 flex flex-col">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{value}</span>
								<Tooltip content="Deprecated" className="text-(--error)">
									<Icon name="alert-triangle" height={14} width={14} />
								</Tooltip>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>{`${value}`}</BasicLink>
						)}

						<Tooltip content={<ProtocolChainsComponent chains={row.original.chains} />} className="text-[0.7rem]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' ? (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					) : null}
				</span>
			)
		},
		sortUndefined: 'last',
		size: 240
	},
	{
		id: 'category',
		header: 'Category',
		accessorKey: 'category',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue<string | null>()
			return value ? (
				<BasicLink href={`/protocols/${slug(value)}`} className="text-sm font-medium text-(--link-text)">
					{value}
				</BasicLink>
			) : (
				''
			)
		},
		sortUndefined: 'last',
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'oracles',
		header: 'Oracles',
		accessorFn: (row) => {
			const direct = Array.isArray(row.oracles) ? row.oracles : []
			if (direct.length) return direct
			const byChain = row.oraclesByChain
			if (!byChain) return []
			return Array.from(new Set(Object.values(byChain).flat()))
		},
		enableSorting: false,
		cell: ({ getValue }) => {
			const oracles = getValue<string[]>()
			if (!oracles.length) return ''
			const visible = oracles.slice(0, 3)
			const extra = oracles.length - visible.length
			return (
				<span className="flex flex-wrap items-center justify-end gap-1">
					{visible.map((o) => (
						<BasicLink
							key={o}
							href={`/oracles/${slug(o)}`}
							className="text-sm font-medium text-(--link-text) hover:underline"
						>
							{o}
						</BasicLink>
					))}
					{extra > 0 ? <Tooltip content={oracles.slice(3).join(', ')}>+{extra}</Tooltip> : null}
				</span>
			)
		},
		sortUndefined: 'last',
		size: 180,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'chains',
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue<string[]>()} url="/chain" iconType="chain" />,
		meta: {
			align: 'end',
			headerHelperText: "Chains are ordered by protocol's highest TVL on each chain"
		},
		sortUndefined: 'last',
		size: 200
	},
	columnHelper.group({
		id: 'tvl',
		header: 'TVL',
		columns: [
			columnHelper.accessor('tvl', {
				header: 'TVL',
				cell: ({ getValue, row }) => <ProtocolTvlCell value={getValue()} rowValues={row.original} />,
				meta: {
					align: 'end',
					headerHelperText: 'Value of all coins held in smart contracts of the protocol'
				},
				sortUndefined: 'last',
				size: 120
			}),
			columnHelper.accessor('change_1d', {
				header: '1d Change',
				cell: ({ getValue }) => <>{renderPercentChange(getValue())}</>,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 24 hours'
				},
				sortUndefined: 'last',
				size: 140
			}),
			columnHelper.accessor('change_7d', {
				header: '7d Change',
				cell: ({ getValue }) => <>{renderPercentChange(getValue())}</>,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 7 days'
				},
				sortUndefined: 'last',
				size: 140
			}),
			columnHelper.accessor('change_1m', {
				header: '1m Change',
				cell: ({ getValue }) => <>{renderPercentChange(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 30 days'
				},
				size: 140
			}),
			columnHelper.accessor('mcaptvl', {
				header: 'Mcap/TVL',
				cell: (info) => {
					return <>{info.getValue() ?? null}</>
				},
				size: 110,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / TVL ratio'
				}
			})
		],
		meta: { headerHelperText: 'Value of all coins held in smart contracts of the protocol' }
	}),
	columnHelper.group({
		id: 'earnings',
		header: 'Earnings',
		columns: [
			columnHelper.accessor('earnings_24h', {
				header: 'Earnings 24h',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.earnings.protocol['24h'] },
				size: 140
			}),
			columnHelper.accessor('earningsChange_1d', {
				header: 'Earnings Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.earnings.protocol['change1d'] },
				size: 170
			}),
			columnHelper.accessor('earnings_7d', {
				header: 'Earnings 7d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.earnings.protocol['7d'] },
				size: 140
			}),
			columnHelper.accessor('earningsChange_7d', {
				header: 'Earnings Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.earnings.protocol['change7d'] },
				size: 180
			}),
			columnHelper.accessor('earnings_30d', {
				header: 'Earnings 30d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.earnings.protocol['30d'] },
				size: 140
			}),
			columnHelper.accessor('earningsChange_1m', {
				header: 'Earnings Change 1m',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.earnings.protocol['change1m'] },
				size: 180
			}),
			columnHelper.accessor('earnings_1y', {
				header: 'Earnings 1y',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.earnings.protocol['1y'] },
				size: 150
			})
		],
		meta: {
			headerHelperText: 'Net earnings after expenses'
		}
	}),
	columnHelper.group({
		id: 'fees',
		header: 'Fees & Revenue',
		columns: [
			columnHelper.accessor('fees_24h', {
				header: 'Fees 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['24h']
				},
				size: 100
			}),
			columnHelper.accessor('revenue_24h', {
				header: 'Revenue 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['24h']
				},
				size: 125
			}),
			columnHelper.accessor('fees_7d', {
				header: 'Fees 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['7d']
				},
				size: 100
			}),
			columnHelper.accessor('feesChange_1d', {
				header: 'Fees Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['change1d']
				},
				size: 140
			}),
			columnHelper.accessor('feesChange_7d', {
				header: 'Fees Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['change7d']
				},
				size: 140
			}),
			columnHelper.accessor('revenue_7d', {
				header: 'Revenue 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['7d']
				},
				size: 120
			}),
			columnHelper.accessor('revenueChange_1d', {
				header: 'Revenue Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change1d']
				},
				size: 155
			}),
			columnHelper.accessor('revenueChange_7d', {
				header: 'Revenue Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change7d']
				},
				size: 160
			}),
			columnHelper.accessor('feesChange_7dover7d', {
				header: 'Fees Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['change7dover7d']
				},
				size: 140
			}),
			columnHelper.accessor('fees_30d', {
				header: 'Fees 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['30d']
				},
				size: 100
			}),
			columnHelper.accessor('feesChange_1m', {
				header: 'Fees Change 1m',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['change1m']
				},
				size: 150
			}),
			columnHelper.accessor('revenue_30d', {
				header: 'Revenue 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['30d']
				},
				size: 125
			}),
			columnHelper.accessor('revenueChange_1m', {
				header: 'Revenue Change 1m',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change1m']
				},
				size: 165
			}),
			columnHelper.accessor('feesChange_30dover30d', {
				header: 'Fees Change 30d (vs prev 30d)',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['change30dover30d']
				},
				size: 150
			}),
			columnHelper.accessor('revenueChange_7dover7d', {
				header: 'Revenue Change 7d (vs prev 7d)',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change7dover7d']
				},
				size: 160
			}),
			columnHelper.accessor('revenueChange_30dover30d', {
				header: 'Revenue Change 30d (vs prev 30d)',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change30dover30d']
				},
				size: 170
			}),
			columnHelper.accessor('fees_1y', {
				header: 'Fees 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['1y']
				},
				size: 120
			}),
			columnHelper.accessor('average_1y', {
				header: 'Monthly Avg 1Y Fees',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['average1y']
				},
				size: 170
			}),
			columnHelper.accessor('revenue_1y', {
				header: 'Revenue 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['average1y']
				},
				size: 120
			}),
			columnHelper.accessor('average_revenue_1y', {
				header: 'Monthly Avg 1Y Revenue',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['monthlyAverage1y']
				},
				size: 180
			}),
			columnHelper.accessor('holdersRevenue30d', {
				header: 'Holders Revenue 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['30d']
				},
				size: 180
			}),
			columnHelper.accessor('cumulativeFees', {
				header: 'Cumulative Fees',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['cumulative']
				},
				size: 150
			}),
			columnHelper.accessor('holderRevenue_24h', {
				header: 'Holders Revenue 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['24h']
				},
				size: 180
			}),
			columnHelper.accessor('pf', {
				header: 'P/F',
				cell: (info) => <>{info.getValue() != null ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['pf']
				},
				size: 180
			}),
			columnHelper.accessor('ps', {
				header: 'P/S',
				cell: (info) => <>{info.getValue() != null ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['ps']
				},
				size: 180
			})
		],
		meta: {
			headerHelperText:
				definitions.fees.common + '\n\n' + definitions.revenue.common + '\n\n' + definitions.holdersRevenue.common
		}
	}),
	columnHelper.group({
		id: 'volume',
		header: 'Volume',
		columns: [
			columnHelper.accessor('volume_24h', {
				header: 'Spot Volume 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['24h']
				},
				size: 150
			}),
			columnHelper.accessor('volume_7d', {
				header: 'Spot Volume 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['7d']
				},
				size: 150
			}),
			columnHelper.accessor('volume_30d', {
				header: 'Spot Volume 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['30d']
				},
				size: 150
			}),
			columnHelper.accessor('volumeChange_1d', {
				header: 'Spot Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['change1d']
				},
				size: 140
			}),
			columnHelper.accessor('volumeChange_7d', {
				header: 'Spot Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['change7d']
				},
				size: 140
			}),
			columnHelper.accessor('volumeChange_1m', {
				header: 'Spot Change 1m',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['change1m']
				},
				size: 140
			}),
			columnHelper.accessor('cumulativeVolume', {
				header: 'Spot Cumulative Volume',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['cumulative']
				},
				size: 200
			}),
			columnHelper.accessor('volumeDominance_24h', {
				header: 'Spot Volume % 24h',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['marketShare24h']
				},
				size: 140
			}),
			columnHelper.accessor('volumeMarketShare7d', {
				header: 'Spot Volume % 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['marketShare7d']
				},
				size: 140
			})
		],
		meta: {
			headerHelperText: definitions.dexs.common
		}
	}),
	columnHelper.group({
		id: 'perps',
		header: 'Perps Volume',
		columns: [
			columnHelper.accessor('perps_volume_24h', {
				header: 'Perp Volume 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['24h']
				},
				size: 150
			}),
			columnHelper.accessor('perps_volume_7d', {
				header: 'Perp Volume 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['7d']
				},
				size: 150
			}),
			columnHelper.accessor('perps_volume_30d', {
				header: 'Perp Volume 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['30d']
				},
				size: 150
			}),
			columnHelper.accessor('perps_volume_change_1d', {
				header: 'Perp Volume Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['change1d']
				},
				size: 180
			}),
			columnHelper.accessor('perps_volume_change_7d', {
				header: 'Perp Volume Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['change7d']
				},
				size: 180
			}),
			columnHelper.accessor('perps_volume_change_1m', {
				header: 'Perp Volume Change 1m',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['change1m']
				},
				size: 180
			}),
			columnHelper.accessor('perps_volume_dominance_24h', {
				header: 'Perp Volume % 24h',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText:
						(definitions.perps.protocol as Record<string, string>)['marketShare24h'] ??
						definitions.perps.protocol['24h']
				},
				size: 180
			})
		],
		meta: {
			headerHelperText: definitions.perps.common
		}
	}),
	columnHelper.group({
		id: 'aggregators',
		header: 'DEX Aggregators',
		columns: [
			columnHelper.accessor('aggregators_volume_24h', {
				header: 'Agg Volume 24h',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['24h'] },
				size: 150
			}),
			columnHelper.accessor('aggregators_volume_change_1d', {
				header: 'Agg Volume Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['change1d'] },
				size: 190
			}),
			columnHelper.accessor('aggregators_volume_7d', {
				header: 'Agg Volume 7d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['7d'] },
				size: 150
			}),
			columnHelper.accessor('aggregators_volume_change_7d', {
				header: 'Agg Volume Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['change7d'] },
				size: 190
			}),
			columnHelper.accessor('aggregators_volume_30d', {
				header: 'Agg Volume 30d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['30d'] },
				size: 160
			}),
			columnHelper.accessor('aggregators_volume_dominance_24h', {
				header: 'Agg Volume % 24h',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['marketShare24h'] },
				size: 180
			}),
			columnHelper.accessor('aggregators_volume_marketShare7d', {
				header: 'Agg Volume % 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['marketShare7d'] },
				size: 180
			})
		],
		meta: {
			headerHelperText: definitions.dexAggregators.common
		}
	}),
	columnHelper.group({
		id: 'bridge-aggregators',
		header: 'Bridge Aggregators',
		columns: [
			columnHelper.accessor('bridge_aggregators_volume_24h', {
				header: 'Bridge Agg Volume 24h',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['24h'] },
				size: 180
			}),
			columnHelper.accessor('bridge_aggregators_volume_change_1d', {
				header: 'Bridge Agg Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['change1d'] },
				size: 200
			}),
			columnHelper.accessor('bridge_aggregators_volume_7d', {
				header: 'Bridge Agg Volume 7d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['7d'] },
				size: 180
			}),
			columnHelper.accessor('bridge_aggregators_volume_change_7d', {
				header: 'Bridge Agg Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['change7d'] },
				size: 200
			}),
			columnHelper.accessor('bridge_aggregators_volume_30d', {
				header: 'Bridge Agg Volume 30d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['30d'] },
				size: 180
			}),
			columnHelper.accessor('bridge_aggregators_volume_dominance_24h', {
				header: 'Bridge Agg % 24h',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.bridgeAggregators.protocol['marketShare24h'] },
				size: 180
			})
		],
		meta: {
			headerHelperText: definitions.bridgeAggregators.common
		}
	}),
	columnHelper.group({
		id: 'options-volume',
		header: 'Options Volume',
		columns: [
			columnHelper.accessor('options_volume_24h', {
				header: 'Options Volume 24h',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['24h'] },
				size: 160
			}),
			columnHelper.accessor('options_volume_change_1d', {
				header: 'Options Change 1d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['change1d'] },
				size: 180
			}),
			columnHelper.accessor('options_volume_7d', {
				header: 'Options Volume 7d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['7d'] },
				size: 160
			}),
			columnHelper.accessor('options_volume_change_7d', {
				header: 'Options Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['change7d'] },
				size: 180
			}),
			columnHelper.accessor('options_volume_30d', {
				header: 'Options Volume 30d',
				cell: ({ getValue }) => <>{getValue() != null ? formattedNum(getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['30d'] },
				size: 160
			}),
			columnHelper.accessor('options_volume_dominance_24h', {
				header: 'Options Volume % 24h',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.optionsPremium.protocol['marketShare24h'] },
				size: 180
			})
		],
		meta: {
			headerHelperText: definitions.optionsPremium.common
		}
	}),
	columnHelper.accessor('openInterest', {
		header: 'Open Interest',
		cell: (info) => {
			const value = info.getValue()
			return <>{typeof value === 'number' && value > 0 ? formattedNum(value, true) : null}</>
		},
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: definitions.openInterest.protocol
		},
		size: 140
	}) as ColumnDef<IProtocolRow>,
	columnHelper.accessor('holdersRevenueChange_30dover30d', {
		header: 'Holders Revenue 30d Change',
		cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? renderPercentChange(getValue()) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: definitions.holdersRevenue.protocol['change30dover30d']
		},
		size: 200
	}) as ColumnDef<IProtocolRow>,
	columnHelper.accessor('mcap', {
		header: 'Market Cap',
		cell: ({ getValue }) => {
			const value = getValue()
			return <>{typeof value === 'number' && value > 0 ? formattedNum(value, true) : null}</>
		},
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Market capitalization of the protocol token'
		},
		size: 120
	}) as ColumnDef<IProtocolRow>
]

type ProtocolTvlRow = IProtocolRow & {
	parentExcluded?: boolean
	isParentProtocol?: boolean
}

const ProtocolTvlCell = ({ value, rowValues }: { value: unknown; rowValues: ProtocolTvlRow }) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const tvlValue = typeof value === 'number' ? value : null
	let text: string | null = null

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
		if (whiteLabeledVaultProviders.has(rowValues.name)) {
			text =
				'This protocol issues white-labeled vaults which may result in TVL being counted by another protocol (e.g., double counted).'
		}
		if (rowValues.category && removedCategoriesFromChainTvlSet.has(rowValues.category)) {
			text = `${rowValues.category} protocols are not counted into Chain TVL`
		}
		if (text && rowValues.isParentProtocol) {
			text = 'Some sub-protocols are excluded from chain tvl'
		}
	}

	if (!text && !rowValues.parentExcluded) {
		return <>{tvlValue != null ? formattedNum(tvlValue, true) : null}</>
	}

	return (
		<span className="flex items-center justify-end gap-1">
			{text ? <QuestionHelper text={text} /> : null}
			{rowValues.parentExcluded ? (
				<QuestionHelper
					text={"There's some internal doublecounting that is excluded from parent TVL, so sum won't match"}
				/>
			) : null}
			<span
				style={{
					color: rowValues.strikeTvl ? 'var(--text-disabled)' : 'inherit'
				}}
			>
				{tvlValue != null ? formattedNum(tvlValue, true) : null}
			</span>
		</span>
	)
}

type UseProTableColumnsParams = {
	customColumns: CustomColumn[]
	protocols: IProtocolRow[]
	filters?: TableFilters
	onFilterClick?: () => void
}

type UseProTableColumnsResult = {
	allColumns: ColumnDef<IProtocolRow>[]
	allLeafColumnIds: string[]
}

const coerceToNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value)
		if (Number.isFinite(parsed)) return parsed
	}
	return null
}

const formatCurrencyShort = (value: number): string => {
	const sign = value < 0 ? '-' : ''
	const abs = Math.abs(value)
	if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
	if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
	if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`
	return `${sign}$${abs.toFixed(2)}`
}

const collectLeafColumnIds = (columns: ColumnDef<IProtocolRow>[]): string[] => {
	const ids: string[] = []
	const visit = (nextColumns: ColumnDef<IProtocolRow>[]) => {
		for (const column of nextColumns) {
			const nested = 'columns' in column ? column.columns : undefined
			if (Array.isArray(nested) && nested.length > 0) {
				visit(nested as ColumnDef<IProtocolRow>[])
				continue
			}
			const id = 'id' in column ? column.id : undefined
			if (typeof id === 'string' && id.length > 0) {
				ids.push(id)
				continue
			}
			const accessorKey = 'accessorKey' in column ? column.accessorKey : undefined
			if (typeof accessorKey === 'string' && accessorKey.length > 0) {
				ids.push(accessorKey)
			}
		}
	}
	visit(columns)
	return Array.from(new Set(ids))
}

const hasAnyActiveFilters = (filters?: TableFilters): boolean => {
	if (!filters) return false
	return (
		(filters.protocols?.length ?? 0) > 0 ||
		(filters.categories?.length ?? 0) > 0 ||
		(filters.excludedCategories?.length ?? 0) > 0 ||
		(filters.oracles?.length ?? 0) > 0
	)
}

export function useProTableColumns({
	customColumns,
	protocols,
	filters,
	onFilterClick
}: UseProTableColumnsParams): UseProTableColumnsResult {
	const customColumnDefs = React.useMemo(() => {
		const compiledColumns = customColumns
			.filter((column) => column.isValid)
			.map((column) => {
				try {
					return { column, expression: expressionParser.parse(column.expression) }
				} catch {
					return null
				}
			})
			.filter((value): value is { column: CustomColumn; expression: ReturnType<Parser['parse']> } => value !== null)

		return compiledColumns.map(
			(compiled): ColumnDef<IProtocolRow> => ({
				id: compiled.column.id,
				header: compiled.column.name,
				accessorFn: (row) => {
					const context: Record<string, number> = {}
					for (const baseColumn of protocolsByChainTableColumns) {
						const value = Reflect.get(row, baseColumn.key)
						const numericValue = coerceToNumber(value)
						if (numericValue !== null) {
							context[baseColumn.key] = numericValue
						}
					}
					try {
						const result = compiled.expression.evaluate(context)
						return typeof result === 'number' && Number.isFinite(result) ? result : null
					} catch {
						return null
					}
				},
				cell: ({ getValue }) => {
					const value = getValue()
					return typeof value === 'number' ? formatCurrencyShort(value) : '-'
				},
				sortingFn: (rowA, rowB, columnId) => {
					const valueA = rowA.getValue(columnId)
					const valueB = rowB.getValue(columnId)
					const numberA = typeof valueA === 'number' ? valueA : null
					const numberB = typeof valueB === 'number' ? valueB : null
					if (numberA === null && numberB === null) return 0
					if (numberA === null) return 1
					if (numberB === null) return -1
					return numberA - numberB
				}
			})
		)
	}, [customColumns])

	const totals = React.useMemo(() => {
		const nextTotals: Record<string, number> = {}
		for (const metric of USD_METRIC_KEYS) {
			nextTotals[metric] = 0
		}
		for (const protocol of protocols) {
			for (const metric of USD_METRIC_KEYS) {
				const value = Reflect.get(protocol, metric)
				if (typeof value === 'number' && value > 0) {
					nextTotals[metric] += value
				}
			}
		}
		return nextTotals
	}, [protocols])

	const percentageShareColumns = React.useMemo(() => {
		return SHARE_METRIC_DEFINITIONS.map(
			(metric): ColumnDef<IProtocolRow> => ({
				id: `${metric.key}_share`,
				header: metric.name,
				accessorFn: (row) => {
					const value = Reflect.get(row, metric.key)
					const total = totals[metric.key]
					if (typeof value === 'number' && value > 0 && typeof total === 'number' && total > 0) {
						return (value / total) * 100
					}
					return null
				},
				cell: ({ getValue }) => {
					const value = getValue()
					return typeof value === 'number' ? `${value.toFixed(2)}%` : ''
				}
			})
		)
	}, [totals])

	const columnsWithFilter = React.useMemo(() => {
		if (!onFilterClick) {
			return { name: null, category: null, oracles: null }
		}

		const activeFilters = hasAnyActiveFilters(filters)
		const filterButtonClassName = activeFilters
			? 'rounded-md p-1 transition-colors hover:bg-(--bg-tertiary) text-pro-blue-400 dark:text-pro-blue-200'
			: 'rounded-md p-1 transition-colors hover:bg-(--bg-tertiary) text-(--text-tertiary)'

		const renderFilterButton = (key: string) => (
			<button
				key={key}
				type="button"
				onClick={(event) => {
					event.stopPropagation()
					onFilterClick()
				}}
				className={filterButtonClassName}
				title="Filter protocols"
			>
				<Icon name="settings" height={14} width={14} />
			</button>
		)

		const originalNameColumn = protocolsByChainColumns.find((column) => column.id === 'name')
		const originalCategoryColumn = protocolsByChainColumns.find((column) => column.id === 'category')
		const originalOraclesColumn = protocolsByChainColumns.find((column) => column.id === 'oracles')

		const nameColumn =
			originalNameColumn === undefined
				? null
				: {
						...originalNameColumn,
						id: 'name',
						header: () => (
							<div className="flex items-center gap-2">
								<span>Name</span>
								{renderFilterButton('name-filter')}
							</div>
						)
					}

		const categoryColumn =
			originalCategoryColumn === undefined
				? null
				: {
						...originalCategoryColumn,
						id: 'category',
						header: () => (
							<div className="flex items-center justify-end gap-2">
								<span>Category</span>
								{renderFilterButton('category-filter')}
							</div>
						)
					}

		const oraclesColumn =
			originalOraclesColumn === undefined
				? null
				: {
						...originalOraclesColumn,
						id: 'oracles',
						header: () => (
							<div className="flex items-center justify-end gap-2">
								<span>Oracles</span>
								{renderFilterButton('oracles-filter')}
							</div>
						)
					}

		return { name: nameColumn, category: categoryColumn, oracles: oraclesColumn }
	}, [filters, onFilterClick])

	const allColumns = React.useMemo(() => {
		const baseColumns = [...protocolsByChainColumns]
		if (columnsWithFilter.name !== null) {
			const index = baseColumns.findIndex((column) => column.id === 'name')
			if (index !== -1) {
				baseColumns[index] = columnsWithFilter.name
			}
		}
		if (columnsWithFilter.category !== null) {
			const index = baseColumns.findIndex((column) => column.id === 'category')
			if (index !== -1) {
				baseColumns[index] = columnsWithFilter.category
			}
		}
		if (columnsWithFilter.oracles !== null) {
			const index = baseColumns.findIndex((column) => column.id === 'oracles')
			if (index !== -1) {
				baseColumns[index] = columnsWithFilter.oracles
			}
		}
		return [...baseColumns, ...customColumnDefs, ...percentageShareColumns]
	}, [columnsWithFilter, customColumnDefs, percentageShareColumns])

	const allLeafColumnIds = React.useMemo(() => collectLeafColumnIds(allColumns), [allColumns])
	return { allColumns, allLeafColumnIds }
}
