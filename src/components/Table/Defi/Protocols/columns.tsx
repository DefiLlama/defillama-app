import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Bookmark } from '~/components/Bookmark'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { chainIconUrl, formattedNum, formattedPercent, slug, tokenIconUrl, toNiceDaysAgo } from '~/utils'
import { formatColumnOrder } from '../../utils'
import { IProtocolRow, IProtocolRowWithCompare } from './types'
import { removedCategories } from '~/constants'
import { Icon } from '~/components/Icon'

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
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
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
					) : (
						<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					)}

					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="flex flex-col -my-2">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline flex items-center gap-1"
							>
								<span className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline">{value}</span>
								<Tooltip
									content="Deprecated"
									className="bg-red-600 dark:bg-red-400 text-white text-[10px] h-3 w-3 flex items-center justify-center rounded-full"
								>
									!
								</Tooltip>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
				<BasicLink href={`/protocols/${getValue()}`} className="text-sm font-medium text-[var(--link-text)]">
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
				cell: ({ getValue, row }) => <Tvl value={getValue()} rowValues={row.original} />,
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
				size: 110
			}),
			columnHelper.accessor('change_7d', {
				header: '7d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 7 days'
				},
				size: 110
			}),
			columnHelper.accessor('change_1m', {
				header: '1m Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 30 days'
				},
				size: 110
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
		id: 'fees',
		header: 'Fees & Revenue',
		columns: [
			columnHelper.accessor('fees_24h', {
				header: 'Fees 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Fees paid by users in the last 24 hours'
				},
				size: 100
			}),
			columnHelper.accessor('revenue_24h', {
				header: 'Revenue 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Revenue earned by the protocol in the last 24 hours'
				},
				size: 125
			}),
			columnHelper.accessor('fees_7d', {
				header: 'Fees 7d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Fees paid by users in the last 7 days'
				},
				size: 100
			}),
			columnHelper.accessor('revenue_7d', {
				header: 'Revenue 7d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Revenue earned by the protocol in the last 7 days'
				},
				size: 120
			}),
			columnHelper.accessor('fees_30d', {
				header: 'Fees 30d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Fees paid by users in the last 30 days'
				},
				size: 100
			}),
			columnHelper.accessor('revenue_30d', {
				header: 'Revenue 30d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Revenue earned by the protocol in the last 30 days'
				},
				size: 125
			}),
			columnHelper.accessor('fees_1y', {
				header: 'Monthly Avg 1Y Fees',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Average monthly fees paid by users in the last 12 months'
				},
				size: 170
			}),
			columnHelper.accessor('revenue_1y', {
				header: 'Revenue 1Y',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Average monthly revenue earned by the protocol in the last 12 months'
				},
				size: 120
			}),
			// columnHelper.accessor('average_revenue_1y', {
			// 	header: 'Monthly Avg 1Y Rev',
			// 	cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
			// 	sortUndefined: 'last',
			// 	meta: {
			// 		align: 'end'
			// 	},
			// 	size: 180
			// }),
			columnHelper.accessor('holdersRevenue30d', {
				header: 'Holders Revenue 30d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText:
						'Subset of 30 days revenue that is distributed to token holders by means of buyback and burn, burning fees or direct distribution to stakers.'
				},
				size: 180
			}),
			// columnHelper.accessor('userFees_24h', {
			// 	header: 'User Fees 24h',
			// 	cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
			// 	sortUndefined: 'last',
			// 	meta: {
			// 		align: 'end',
			// 		headerHelperText: 'Fees paid by users in the last 24 hours'
			// 	},
			// 	size: 140
			// }),
			columnHelper.accessor('cumulativeFees', {
				header: 'Cumulative Fees',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Total fees paid by users since the protocol was launched'
				},
				size: 150
			}),
			columnHelper.accessor('holderRevenue_24h', {
				header: 'Holders Revenue 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText:
						'Subset of 24 hour revenue that is distributed to token holders by means of buyback and burn, burning fees or direct distribution to stakers.'
				},
				size: 180
			}),
			,
			// columnHelper.accessor('treasuryRevenue_24h', {
			// 	header: 'Treasury Revenue 24h',
			// 	cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
			// 	sortUndefined: 'last',
			// 	meta: {
			// 		align: 'end'
			// 	},
			// 	size: 190
			// }),
			// columnHelper.accessor('supplySideRevenue_24h', {
			// 	header: 'Supply Side Revenue 24h',
			// 	cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
			// 	sortUndefined: 'last',
			// 	meta: {
			// 		align: 'end'
			// 	},
			// 	size: 210
			// }),
			columnHelper.accessor('pf', {
				header: 'P/F',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / annualized fees'
				},
				size: 180
			}),
			columnHelper.accessor('ps', {
				header: 'P/S',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / annualized revenue'
				},
				size: 180
			})
		],
		meta: {
			headerHelperText:
				"Total fees paid by users when using the protocol\n\nRevenue is subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers."
		}
	}),
	columnHelper.group({
		id: 'volume',
		header: 'Volume',
		columns: [
			columnHelper.accessor('volume_24h', {
				header: 'Spot Volume 24h',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Volume of spot trades in the last 24 hours'
				},
				size: 150
			}),
			columnHelper.accessor('volume_7d', {
				header: 'Spot Volume 7d',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Volume of spot trades in the last 7 days'
				},
				size: 150
			}),
			columnHelper.accessor('volumeChange_7d', {
				header: 'Spot Change 7d',
				cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change of last 7d volume over the previous 7d volume'
				},
				size: 140
			}),
			columnHelper.accessor('cumulativeVolume', {
				header: 'Spot Cumulative Volume',
				cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Total volume traded on the protocol since it was launched'
				},
				size: 200
			})
		],
		meta: {
			headerHelperText: 'Volume traded on the protocol'
		}
	})
]

export const protocolsColumns: ColumnDef<IProtocolRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
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
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
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
					) : (
						<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					)}

					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="flex flex-col -my-2">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline flex items-center gap-1"
							>
								<span className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline">{value}</span>
								<span className="text-red-600 dark:text-red-400 text-xs font-medium overflow-hidden whitespace-nowrap text-ellipsis hover:underline">
									Deprecated
								</span>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
				<BasicLink href={`/protocols/${getValue()}`} className="text-sm font-medium text-[var(--link-text)]">
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
		cell: ({ getValue, row }) => <Tvl value={getValue()} rowValues={row.original} />,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
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
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
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
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
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
					) : (
						<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					)}

					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="flex flex-col -my-2">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline flex items-center gap-1"
							>
								<span className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline">{value}</span>
								<span className="text-red-600 dark:text-red-400 text-xs font-medium overflow-hidden whitespace-nowrap text-ellipsis hover:underline">
									Deprecated
								</span>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
				<BasicLink href={`/protocols/${getValue()}`} className="text-sm font-medium text-[var(--link-text)]">
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
		cell: ({ getValue, row }) => <Tvl value={getValue()} rowValues={row.original} />,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	}
]

export const listedAtColumn = {
	header: 'Listed At',
	accessorKey: 'listedAt',
	cell: ({ getValue }) => toNiceDaysAgo(getValue()),
	sortUndefined: 'last' as 'last',
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
		cell: ({ row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return <span className="font-bold">{index + 1}</span>
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
					) : null}

					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />

					<span className="flex flex-col -my-2">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline flex items-center gap-1"
							>
								<span className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline">{value}</span>
								<span className="text-red-600 dark:text-red-400 text-xs font-medium overflow-hidden whitespace-nowrap text-ellipsis hover:underline">
									Deprecated
								</span>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fees 7d',
		accessorKey: 'fees_7d',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fees 30d',
		accessorKey: 'fees_30d',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Revenue 24h',
		accessorKey: 'revenue_24h',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Revenue 7d',
		accessorKey: 'revenue_7d',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume 24h',
		accessorKey: 'volume_24h',
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
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
		cell: (info) => <>{info.getValue() || info.getValue() === 0 ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	}
]

export const topGainersAndLosersColumns: ColumnDef<IProtocolRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
					<BasicLink
						href={`/protocol/${slug(value)}`}
						className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
			return <>{'$' + formattedNum(getValue())}</>
		},
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end'
		},
		size: 120
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

const Tvl = ({ value, rowValues }) => {
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

		removedCategories.forEach((removedCategory) => {
			if (rowValues.category === removedCategory) {
				text = `${removedCategory} protocols are not counted into Chain TVL`
			}
		})

		if (text && rowValues.isParentProtocol) {
			text = 'Some sub-protocols are excluded from chain tvl'
		}
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
				{value || value === 0 ? '$' + formattedNum(value || 0) : null}
			</span>
		</span>
	)
}
