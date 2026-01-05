import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
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
import { chainIconUrl, formattedNum, formattedPercent, slug, tokenIconUrl } from '~/utils'
import { RANK_COLUMN_CONFIG } from '~/utils/rankCell'
import { formatColumnOrder } from '../../utils'
import { IProtocolRow, IProtocolRowWithCompare } from './types'

const columnHelper = createColumnHelper<IProtocolRow>()

export const protocolsByChainColumns: ColumnDef<IProtocolRow>[] = [
	RANK_COLUMN_CONFIG,
	{
		id: 'name',
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/protocolll/${value}/${chain}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

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
					) : (
						<Bookmark readableName={value} data-lgonly data-bookmark />
					)}

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="-my-2 flex flex-col">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{value}</span>
								<Tooltip
									content="Deprecated"
									className="flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[10px] text-white dark:bg-red-400"
								>
									!
								</Tooltip>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>{`${value}`}</BasicLink>
						)}

						<Tooltip content={<Chains />} className="text-[0.7rem]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' && (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		id: 'category',
		header: 'Category',
		accessorKey: 'category',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<BasicLink href={`/protocols/${getValue()}`} className="text-sm font-medium text-(--link-text)">
					{getValue() as string | null}
				</BasicLink>
			) : (
				''
			),
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'oracles',
		header: 'Oracles',
		accessorFn: (row) => {
			const direct = Array.isArray((row as any).oracles) ? ((row as any).oracles as string[]) : []
			if (direct.length) return direct
			const byChain = (row as any).oraclesByChain as Record<string, string[]> | undefined
			if (!byChain) return []
			return Array.from(new Set(Object.values(byChain).flat()))
		},
		enableSorting: false,
		cell: ({ getValue }) => {
			const oracles = (getValue() as string[]) || []
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
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/chain" iconType="chain" />,
		meta: {
			align: 'end',
			headerHelperText: "Chains are ordered by protocol's highest TVL on each chain"
		},
		size: 200
	},
	columnHelper.group({
		id: 'tvl',
		header: 'TVL',
		columns: [
			columnHelper.accessor('tvl', {
				header: 'TVL',
				cell: ({ getValue, row }) => <ProtocolTvlCell value={getValue()} rowValues={row.original} />,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Value of all coins held in smart contracts of the protocol'
				},
				size: 120
			}),
			columnHelper.accessor('change_1d', {
				header: '1d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 24 hours'
				},
				size: 140
			}),
			columnHelper.accessor('change_7d', {
				header: '7d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 7 days'
				},
				size: 140
			}),
			columnHelper.accessor('change_1m', {
				header: '1m Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
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
				sortUndefined: 'last',
				size: 110,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['change1d']
				},
				size: 140
			}),
			columnHelper.accessor('feesChange_7d', {
				header: 'Fees Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change1d']
				},
				size: 155
			}),
			columnHelper.accessor('revenueChange_7d', {
				header: 'Revenue Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change7d']
				},
				size: 160
			}),
			columnHelper.accessor('feesChange_7dover7d', {
				header: 'Fees Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change1m']
				},
				size: 165
			}),
			columnHelper.accessor('feesChange_30dover30d', {
				header: 'Fees Change 30d (vs prev 30d)',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['change30dover30d']
				},
				size: 150
			}),
			columnHelper.accessor('revenueChange_7dover7d', {
				header: 'Revenue Change 7d (vs prev 7d)',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['change7dover7d']
				},
				size: 160
			}),
			columnHelper.accessor('revenueChange_30dover30d', {
				header: 'Revenue Change 30d (vs prev 30d)',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
			// columnHelper.accessor('userFees_24h', {
			// 	header: 'User Fees 24h',
			// 	cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			// 	sortUndefined: 'last',
			// 	meta: {
			// 		align: 'end',
			// 		headerHelperText: 'Fees paid by users in the last 24 hours'
			// 	},
			// 	size: 140
			// }),
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['change1d']
				},
				size: 140
			}),
			columnHelper.accessor('volumeChange_7d', {
				header: 'Spot Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['change7d']
				},
				size: 140
			}),
			columnHelper.accessor('volumeChange_1m', {
				header: 'Spot Change 1m',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['marketShare24h']
				},
				size: 140
			}),
			columnHelper.accessor('volumeMarketShare7d', {
				header: 'Spot Volume % 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['change1d']
				},
				size: 180
			}),
			columnHelper.accessor('perps_volume_change_7d', {
				header: 'Perp Volume Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['change7d']
				},
				size: 180
			}),
			columnHelper.accessor('perps_volume_change_1m', {
				header: 'Perp Volume Change 1m',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['change1m']
				},
				size: 180
			}),
			columnHelper.accessor('perps_volume_dominance_24h', {
				header: 'Perp Volume % 24h',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: definitions.perps.protocol['marketShare24h']
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: { align: 'end', headerHelperText: definitions.dexAggregators.protocol['marketShare24h'] },
				size: 180
			}),
			columnHelper.accessor('aggregators_volume_marketShare7d', {
				header: 'Agg Volume % 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
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
		cell: (info) => <>{info.getValue() != null && info.getValue() > 0 ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: definitions.openInterest.protocol
		},
		size: 140
	}),

	columnHelper.accessor('holdersRevenueChange_30dover30d', {
		header: 'Holders Revenue 30d Change',
		cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: definitions.holdersRevenue.protocol['change30dover30d']
		},
		size: 200
	}),

	columnHelper.accessor('mcap', {
		header: 'Market Cap',
		cell: ({ getValue }) => <>{getValue() != null && getValue() > 0 ? formattedNum(getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Market capitalization of the protocol token'
		},
		size: 120
	})
]

export const protocolsColumns: ColumnDef<IProtocolRow>[] = [
	RANK_COLUMN_CONFIG,
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/protocolll/${value}/${chain}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

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
					) : (
						<Bookmark readableName={value} data-lgonly data-bookmark />
					)}

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="-my-2 flex flex-col">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{value}</span>
								<span className="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap text-red-600 hover:underline dark:text-red-400">
									Deprecated
								</span>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>{`${value}`}</BasicLink>
						)}

						<Tooltip content={<Chains />} className="text-[0.7rem]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' && (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Category',
		accessorKey: 'category',
		cell: ({ getValue }) =>
			getValue() ? (
				<BasicLink href={`/protocols/${getValue()}`} className="text-sm font-medium text-(--link-text)">
					{getValue() as string | null}
				</BasicLink>
			) : (
				''
			),
		size: 140
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue, row }) => <ProtocolTvlCell value={getValue()} rowValues={row.original} />,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Sum of value of all coins held in smart contracts of the protocol'
		},
		size: 120
	},
	{
		header: '1d TVL Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 24 hours'
		},
		size: 140
	},
	{
		header: '7d TVL Change',
		accessorKey: 'change_7d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 7 days'
		},
		size: 140
	},
	{
		header: '1m TVL Change',
		accessorKey: 'change_1m',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 30 days'
		},
		size: 140
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{(info.getValue() ?? null) as string | null}</>
		},
		sortUndefined: 'last',
		size: 100,
		meta: {
			align: 'end'
		}
	}
]

export const protocolsOracleColumns: ColumnDef<IProtocolRow>[] = [
	RANK_COLUMN_CONFIG,
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/protocolll/${value}/${chain}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

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
					) : (
						<Bookmark readableName={value} data-lgonly data-bookmark />
					)}

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="-my-2 flex flex-col">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{value}</span>
								<span className="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap text-red-600 hover:underline dark:text-red-400">
									Deprecated
								</span>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>{`${value}`}</BasicLink>
						)}

						<Tooltip content={<Chains />} className="text-[0.7rem]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' && (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Category',
		accessorKey: 'category',
		cell: ({ getValue }) =>
			getValue() ? (
				<BasicLink href={`/protocols/${getValue()}`} className="text-sm font-medium text-(--link-text)">
					{getValue() as string | null}
				</BasicLink>
			) : (
				''
			),
		size: 140
	},
	{
		header: 'TVS',
		accessorKey: 'tvs',
		id: 'tvl',
		cell: ({ getValue, row }) => <ProtocolTvlCell value={getValue()} rowValues={row.original} />,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	}
]

export const categoryProtocolsColumns: ColumnDef<IProtocolRowWithCompare>[] = [
	RANK_COLUMN_CONFIG,
	{
		header: 'Compare',
		accessorKey: 'compare',
		enableSorting: false,
		cell: ({ row }) => {
			return (
				<div style={{ display: 'flex', justifyContent: 'center' }}>
					<input
						type="checkbox"
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
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/protocolll/${value}/${chain}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

			return (
				<span className="flex items-center gap-2">
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

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="-my-2 flex flex-col">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{value}</span>
								<span className="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap text-red-600 hover:underline dark:text-red-400">
									Deprecated
								</span>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>{`${value}`}</BasicLink>
						)}

						<Tooltip content={<Chains />} className="text-[0.7rem]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' && (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					)}
				</span>
			)
		},
		size: 240
	},

	{
		header: 'Fees 24h',
		accessorKey: 'fees_24h',
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fees 7d',
		accessorKey: 'fees_7d',
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fees 30d',
		accessorKey: 'fees_30d',
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Revenue 24h',
		accessorKey: 'revenue_24h',
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Revenue 7d',
		accessorKey: 'revenue_7d',
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume 24h',
		accessorKey: 'volume_24h',
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume 7d',
		accessorKey: 'volume_7d',
		sortUndefined: 'last',
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	}
]

export const topGainersAndLosersColumns: ColumnDef<IProtocolRow>[] = [
	RANK_COLUMN_CONFIG,
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					<Bookmark readableName={value} data-lgonly data-bookmark />
					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
					<BasicLink
						href={`/protocol/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>{`${value}`}</BasicLink>
				</span>
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
			return <>{formattedNum(getValue(), true)}</>
		},
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '1d TVL Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 24 hours'
		},
		size: 140
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{(info.getValue() ?? null) as string | null}</>
		},
		sortUndefined: 'last',
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
		sortUndefined: 'last',
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
		sortUndefined: 'last',
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
		sortUndefined: 'last',
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
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		tvl: 120,
		mcaptvl: 110,
		totalRaised: 180
	},
	1024: {
		rank: 60,
		compare: 80,
		name: 240,
		category: 140,
		change_1d: 120,
		change_7d: 110,
		change_1m: 110,
		tvl: 120,
		mcaptvl: 110,
		totalRaised: 180
	},
	1280: {
		rank: 60,
		compare: 80,
		name: 200,
		category: 140,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		tvl: 120,
		mcaptvl: 110,
		totalRaised: 180
	}
}

export const ProtocolTvlCell = ({ value, rowValues }) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

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

		const whiteLabeledVaultProviders = ['Veda']
		if (whiteLabeledVaultProviders.includes(rowValues.name)) {
			text =
				'This protocol issues white-labeled vaults which may result in TVL being counted by another protocol (e.g., double counted).'
		}

		if (removedCategoriesFromChainTvlSet.has(rowValues.category)) {
			text = `${rowValues.category} protocols are not counted into Chain TVL`
		}

		if (text && rowValues.isParentProtocol) {
			text = 'Some sub-protocols are excluded from chain tvl'
		}
	}

	if (!text && !rowValues.parentExcluded) {
		return <>{value != null ? formattedNum(value, true) : null}</>
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
				{value != null ? formattedNum(value, true) : null}
			</span>
		</span>
	)
}
