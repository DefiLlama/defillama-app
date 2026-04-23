import {
	createColumnHelper,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { startTransition, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems, yieldsChainHref, yieldsProjectHref } from '~/components/IconsRow/utils'
import { ImageWithFallback } from '~/components/ImageWithFallback'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { PaginatedTable, usePaginatedTableDisplayRowNumber } from '~/components/Table/PaginatedTable'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscription/auth'
import { earlyExit, isExploitedPool, lockupsRewards } from '~/containers/Yields/utils'
import { useIsClient } from '~/hooks/useIsClient'
import { formattedNum } from '~/utils'
import { decodePoolsColumnVisibilityQuery } from '../queryState'
import { preparePaginatedYieldsColumns, resolveVirtualYieldsTableConfig, type YieldsTableConfig } from './config'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import { StabilityCell, StabilityHeader } from './StabilityCell'
import type { IYieldsTableProps, IYieldTableRow } from './types'
import { useYieldsUpgradePrompt } from './useYieldsUpgradePrompt'

const uniswapV3 = 'For Uniswap V3 we assume a price range of +/- 30% (+/- 0.1% for stable pools) around current price.'

function PegHealthIndicator({
	deviation,
	price
}: {
	deviation: number | null | undefined
	price: number | null | undefined
}) {
	if (deviation == null) return <span className="block text-end text-(--text-disabled)">{'\u2014'}</span>
	const colorClass = deviation > 0 ? 'text-(--success)' : deviation < 0 ? 'text-(--error)' : ''
	const dotClass = deviation > 0 ? 'bg-(--success)' : deviation < 0 ? 'bg-(--error)' : 'bg-(--text-disabled)'
	const sign = deviation > 0 ? '+' : ''
	const priceStr = price != null ? `$${price.toFixed(4)}` : null
	const depeg = Math.abs(deviation) >= 2
	const deviationStr = `${sign}${deviation.toFixed(4)}%`
	const depegWarning = depeg ? 'De-pegged by 2%+\n' : ''
	const tooltipText = priceStr ? `${depegWarning}${priceStr} (${deviationStr})` : `${depegWarning}${deviationStr}`
	return (
		<Tooltip content={tooltipText} className="justify-end">
			<span className="inline-flex items-center gap-1.5">
				<span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
				<span className={`tabular-nums ${colorClass}`}>
					{sign}
					{deviation.toFixed(2)}%
				</span>
			</span>
		</Tooltip>
	)
}

const columnHelper = createColumnHelper<IYieldTableRow>()
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const
const POOLS_COLUMN_IDS = [
	'pool',
	'project',
	'chains',
	'tvl',
	'apy',
	'apyBase',
	'apyReward',
	'apyBase7d',
	'il7d',
	'apyMean30d',
	'cv30d',
	'pegDeviation',
	'apyMedian30d',
	'apyStd30d',
	'apyChart30d',
	'volumeUsd1d',
	'volumeUsd7d',
	'apyBaseInception',
	'apyIncludingLsdApy',
	'apyBaseIncludingLsdApy',
	'apyBorrow',
	'apyBaseBorrow',
	'apyRewardBorrow',
	'ltv',
	'totalSupplyUsd',
	'totalBorrowUsd',
	'holderCount',
	'top10Pct',
	'avgPositionUsd',
	'totalAvailableUsd'
] as const
type PoolsColumnId = (typeof POOLS_COLUMN_IDS)[number]

interface PoolsTableConfigContext {
	query: Record<string, unknown>
	hasPremiumAccess: boolean
	isClient: boolean
	onRequestUpgrade: (source: 'header' | 'cell') => void
}

function PoolNameCell({ value, row }: { value: string; row: { id: string; original: IYieldTableRow } }) {
	const exploited = isExploitedPool(row.original.projectslug, value)
	const rowIndex = usePaginatedTableDisplayRowNumber(row.id)

	return (
		<span className="flex items-center gap-1">
			<NameYieldPool
				value={value}
				configID={row.original.configID}
				url={row.original.url}
				rowIndex={rowIndex}
				poolMeta={row.original.poolMeta}
			/>
			{exploited ? (
				<Tooltip content="This pool involves a protocol or token affected by an exploit. Proceed with extreme caution.">
					<Icon name="alert-triangle" height={14} width={14} className="shrink-0 text-red-500 dark:text-red-400" />
				</Tooltip>
			) : null}
		</span>
	)
}

function createPoolsColumns({ hasPremiumAccess, isClient, onRequestUpgrade }: PoolsTableConfigContext) {
	return [
		columnHelper.accessor('pool', {
			id: 'pool',
			header: 'Pool',
			enableSorting: false,
			cell: ({ getValue, row }) => <PoolNameCell value={getValue()} row={row} />,
			size: 200,
			meta: {
				headerClassName: 'min-w-[160px] sm:min-w-[200px]'
			}
		}),
		columnHelper.accessor('project', {
			id: 'project',
			header: 'Project',
			enableSorting: false,
			cell: ({ row }) => (
				<NameYield
					project={row.original.project}
					projectslug={row.original.project}
					airdrop={row.original.airdrop}
					raiseValuation={row.original.raiseValuation}
				/>
			),
			size: 200,
			meta: {
				headerClassName: 'min-w-[140px] pl-9 sm:min-w-[200px]'
			}
		}),
		columnHelper.accessor('chains', {
			id: 'chains',
			header: 'Chain',
			enableSorting: false,
			cell: (info) => <IconsRow items={toChainIconItems(info.getValue(), (chain) => yieldsChainHref(chain))} />,
			meta: {
				align: 'end'
			},
			size: 60
		}),
		columnHelper.accessor((row) => row.tvl ?? undefined, {
			id: 'tvl',
			header: 'TVL',
			enableSorting: true,
			cell: (info) => {
				return (
					<span
						data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
						className="data-[strike=true]:text-(--text-disabled)"
					>
						{formattedNum(info.getValue(), true)}
					</span>
				)
			},
			size: 120,
			meta: {
				align: 'end',
				headerHelperText: 'Note for lending pools: TVL = Available Liquidity = (Supplied - Borrowed)'
			}
		}),
		columnHelper.accessor((row) => row.apy ?? undefined, {
			id: 'apy',
			header: 'APY',
			enableSorting: true,
			cell: (info) => {
				return (
					<span className="flex items-center justify-end gap-1">
						{info.row.original.project === 'cBridge' ? (
							<QuestionHelper text={'Your deposit can be moved to another chain with a different APY!'} />
						) : info.row.original.project === 'Uniswap V3' ? (
							<QuestionHelper
								text={
									'Calculated as: 24h fees * 365 / TVL. Enable "7d Base APY" for a more detailed APY calculation which uses 7 day trading fees and a price range of +/- 30% (+/- 0.1% for stable pools) around current price.'
								}
							/>
						) : info.row.original.project === 'Vesper' && info.row.original.pool === 'ETH (Aggressive)' ? (
							<QuestionHelper
								text={
									'To earn yield you are required to wait for the autocompounding action to be triggered by Vesper which might happen only 1-2x per month. If you withdraw prior to that you will receive 0 APY!'
								}
							/>
						) : null}
						<PercentChange percent={info.getValue()} noSign fontWeight={700} />
					</span>
				)
			},
			size: 100,
			meta: {
				align: 'end',
				headerHelperText:
					'APY = Base APY + Reward APY. For non-autocompounding pools we do not account for reinvesting, in which case APY = APR.'
			}
		}),
		columnHelper.accessor((row) => row.apyBase ?? undefined, {
			id: 'apyBase',
			header: 'Base APY',
			enableSorting: true,
			cell: (info) => {
				return (
					<span className="flex items-center justify-end gap-1">
						{info.row.original.project === 'Fraxlend' ? (
							<QuestionHelper
								text={'Supply APY is for FRAX being lent to the pool, you do not earn interest on your collateral!'}
							/>
						) : info.row.original.project === 'Sommelier' ? (
							<QuestionHelper text={'Calculated over a 24h period! Enable 7d Base APY column for a larger period'} />
						) : null}
						<PercentChange percent={info.getValue()} noSign />
					</span>
				)
			},
			size: 140,
			meta: {
				align: 'end',
				headerHelperText:
					'Annualised percentage yield from trading fees/supplying. For dexs we use the 24h fees and scale those to a year.'
			}
		}),
		columnHelper.accessor((row) => row.apyReward ?? undefined, {
			id: 'apyReward',
			header: 'Reward APY',
			enableSorting: true,
			cell: ({ getValue, row }) => {
				const rewards = row.original.rewards ?? []
				return (
					<span className="inline-flex items-center gap-1">
						{lockupsRewards.includes(row.original.project) ? (
							<QuestionHelper text={earlyExit} />
						) : row.original.rewardMeta ? (
							<QuestionHelper text={row.original.rewardMeta} />
						) : null}
						<IconsRow
							items={toTokenIconItems(rewards, {
								titles: row.original.rewardTokensSymbols,
								getHref: (reward) => yieldsProjectHref(reward)
							})}
						/>
						<PercentChange percent={getValue()} noSign />
					</span>
				)
			},
			size: 140,
			meta: {
				align: 'end',
				headerHelperText: 'Annualised percentage yield from incentives.'
			}
		}),
		columnHelper.accessor((row) => row.apyBase7d ?? undefined, {
			id: 'apyBase7d',
			header: '7d Base APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 140,
			meta: {
				align: 'end',
				headerHelperText: `Annualised percentage yield based on the trading fees from the last 7 days. ${uniswapV3}`
			}
		}),
		columnHelper.accessor((row) => row.il7d ?? undefined, {
			id: 'il7d',
			header: '7d IL',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 100,
			meta: {
				align: 'end',
				headerHelperText: `7d Impermanent Loss: the percentage loss between LPing for the last 7days vs holding the underlying assets instead. ${uniswapV3}`
			}
		}),
		columnHelper.accessor((row) => row.apyMean30d ?? undefined, {
			id: 'apyMean30d',
			header: '30d Avg APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 125,
			meta: {
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.cv30d ?? undefined, {
			id: 'cv30d',
			header: () => (
				<StabilityHeader hasPremiumAccess={isClient && hasPremiumAccess} onRequestUpgrade={onRequestUpgrade} />
			),
			enableSorting: true,
			cell: ({ getValue, row }) => {
				return (
					<StabilityCell
						cv30d={getValue() as number | null}
						apyMedian30d={row.original.apyMedian30d}
						apyStd30d={row.original.apyStd30d}
						hasPremiumAccess={isClient && hasPremiumAccess}
						onRequestUpgrade={onRequestUpgrade}
					/>
				)
			},
			size: 110,
			meta: {
				align: 'end',
				headerHelperText: 'Measures yield consistency over the last 30 days.'
			}
		}),
		columnHelper.accessor((row) => row.pegDeviation ?? undefined, {
			id: 'pegDeviation',
			header: 'Peg',
			enableSorting: true,
			cell: ({ row }) => <PegHealthIndicator deviation={row.original.pegDeviation} price={row.original.pegPrice} />,
			size: 100,
			meta: {
				align: 'end',
				headerHelperText: 'Live peg deviation from $1.00 target price.'
			}
		}),
		columnHelper.accessor((row) => row.apyMedian30d ?? undefined, {
			id: 'apyMedian30d',
			header: '30d Median APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 140,
			meta: {
				align: 'end',
				headerHelperText: '30-day median APY — more robust than average, resistant to outlier spikes.'
			}
		}),
		columnHelper.accessor((row) => row.apyStd30d ?? undefined, {
			id: 'apyStd30d',
			header: '30d Std Dev',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 120,
			meta: {
				align: 'end',
				headerHelperText: 'Standard deviation of daily APY over the last 30 days. Measures yield volatility.'
			}
		}),
		columnHelper.accessor((row) => row.apyChart30d ?? undefined, {
			id: 'apyChart30d',
			header: '30d APY Chart',
			enableSorting: false,
			cell: ({ row }) => {
				const configID = row.original.configID
				if (!configID) return null
				return (
					<BasicLink
						href={`/yields/pool/${configID}`}
						target="_blank"
						className="text-sm font-medium text-(--link-text)"
					>
						<ImageWithFallback
							src={`https://yield-charts.llama.fi/yield-chart/${configID}`}
							alt=""
							width={90}
							height={30}
							className="ml-auto"
						/>
					</BasicLink>
				)
			},
			size: 125,
			meta: {
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.volumeUsd1d ?? undefined, {
			id: 'volumeUsd1d',
			header: '1d Volume',
			enableSorting: true,
			cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
			size: 140,
			meta: {
				align: 'end',
				headerHelperText: '$ Volume in the last 24 hours.'
			}
		}),
		columnHelper.accessor((row) => row.volumeUsd7d ?? undefined, {
			id: 'volumeUsd7d',
			header: '7d Volume',
			enableSorting: true,
			cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
			size: 140,
			meta: {
				align: 'end',
				headerHelperText: '$ Volume in the last 7 days'
			}
		}),
		columnHelper.accessor((row) => row.apyBaseInception ?? undefined, {
			id: 'apyBaseInception',
			header: 'Inception APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 140,
			meta: {
				align: 'end',
				headerHelperText: 'Annualised percentage yield since inception'
			}
		}),
		columnHelper.accessor((row) => row.apyIncludingLsdApy ?? undefined, {
			id: 'apyIncludingLsdApy',
			header: 'APY',
			enableSorting: true,
			cell: (info) => {
				return (
					<span className="flex items-center justify-end gap-1">
						{info.row.original.project === 'cBridge' ? (
							<QuestionHelper text={'Your deposit can be moved to another chain with a different APY!'} />
						) : info.row.original.project === 'Uniswap V3' ? (
							<QuestionHelper
								text={
									'Calculated as: 24h fees * 365 / TVL. Enable "7d Base APY" for a more detailed APY calculation which uses 7 day trading fees and a price range of +/- 30% (+/- 0.1% for stable pools) around current price.'
								}
							/>
						) : null}
						<PercentChange percent={info.getValue()} noSign fontWeight={700} />
					</span>
				)
			},
			size: 100,
			meta: {
				align: 'end',
				headerHelperText:
					'APY = Base APY + Reward APY. For non-autocompounding pools we do not account for reinvesting, in which case APY = APR.'
			}
		}),
		columnHelper.accessor((row) => row.apyBaseIncludingLsdApy ?? undefined, {
			id: 'apyBaseIncludingLsdApy',
			header: 'Base APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 140,
			meta: {
				align: 'end',
				headerHelperText:
					'Annualised percentage yield from trading fees/supplying inclusive of LSD APY (if applicable). For dexs we use the 24h fees and scale those to a year.'
			}
		}),
		columnHelper.accessor((row) => row.apyBorrow ?? undefined, {
			id: 'apyBorrow',
			header: 'Net Borrow APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign fontWeight={700} />,
			size: 140,
			meta: {
				align: 'end',
				headerHelperText: 'Total net APY for borrowing (Borrow Base APY + Borrow Reward APY).'
			}
		}),
		columnHelper.accessor((row) => row.apyBaseBorrow ?? undefined, {
			id: 'apyBaseBorrow',
			header: 'Borrow Base APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 160,
			meta: {
				align: 'end',
				headerHelperText: 'Interest borrowers pay to lenders.'
			}
		}),
		columnHelper.accessor((row) => row.apyRewardBorrow ?? undefined, {
			id: 'apyRewardBorrow',
			header: 'Borrow Reward APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			size: 160,
			meta: {
				align: 'end',
				headerHelperText: 'Incentive reward APY for borrowing.'
			}
		}),
		columnHelper.accessor((row) => row.ltv ?? undefined, {
			id: 'ltv',
			header: 'Max LTV',
			enableSorting: true,
			cell: (info) => {
				return (
					<span
						data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
						className="data-[strike=true]:text-(--text-disabled)"
					>
						{info.getValue() != null ? formattedNum(Number(info.getValue()) * 100) + '%' : null}
					</span>
				)
			},
			size: 120,
			meta: {
				align: 'end',
				headerHelperText: 'Max loan to value (collateral factor)'
			}
		}),
		columnHelper.accessor((row) => row.totalSupplyUsd ?? undefined, {
			id: 'totalSupplyUsd',
			header: 'Supplied',
			enableSorting: true,
			cell: (info) => {
				return (
					<span
						data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
						className="data-[strike=true]:text-(--text-disabled)"
					>
						{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
					</span>
				)
			},
			size: 120,
			meta: {
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.totalBorrowUsd ?? undefined, {
			id: 'totalBorrowUsd',
			header: 'Borrowed',
			enableSorting: true,
			cell: (info) => {
				return (
					<span
						data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
						className="data-[strike=true]:text-(--text-disabled)"
					>
						{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
					</span>
				)
			},
			size: 120,
			meta: {
				align: 'end',
				headerHelperText: 'Amount of borrowed collateral'
			}
		}),
		columnHelper.accessor((row) => row.holderCount ?? undefined, {
			id: 'holderCount',
			header: 'Holders',
			enableSorting: true,
			cell: ({ getValue, row }) => {
				const count = getValue() as number | null
				if (count == null) return <span className="block text-end text-(--text-disabled)">{'\u2014'}</span>
				const change7d = row.original.holderChange7d
				const change30d = row.original.holderChange30d
				const tooltipParts = [
					change7d != null ? `7d: ${change7d >= 0 ? '+' : ''}${change7d.toLocaleString()}` : null,
					change30d != null ? `30d: ${change30d >= 0 ? '+' : ''}${change30d.toLocaleString()}` : null
				].filter(Boolean)
				return (
					<Tooltip content={tooltipParts.length ? tooltipParts.join(', ') : null} className="justify-end">
						<span className="tabular-nums">{formattedNum(count)}</span>
					</Tooltip>
				)
			},
			size: 120,
			meta: {
				align: 'end',
				headerHelperText: 'Number of unique token holders. Hover for 7d/30d change.'
			}
		}),
		columnHelper.accessor((row) => row.top10Pct ?? undefined, {
			id: 'top10Pct',
			header: 'Top 10 %',
			enableSorting: true,
			cell: (info) => {
				const val = info.getValue() as number | null
				if (val == null) return <span className="block text-end text-(--text-disabled)">{'\u2014'}</span>

				const accentClass = val >= 80 ? 'bg-red-500' : val >= 50 ? 'bg-yellow-500' : 'bg-green-500'
				const riskLabel = val >= 80 ? 'High concentration' : val >= 50 ? 'Medium concentration' : 'Low concentration'

				return (
					<Tooltip content={riskLabel} className="justify-end">
						<span className="inline-flex items-center gap-1.5 tabular-nums">
							<span className={`h-2 w-2 shrink-0 rounded-full ${accentClass}`} />
							{val.toFixed(1)}%
						</span>
					</Tooltip>
				)
			},
			size: 110,
			meta: {
				align: 'end',
				headerHelperText: 'Percentage of TVL held by the top 10 holders. Higher = more concentrated.'
			}
		}),
		columnHelper.accessor((row) => row.avgPositionUsd ?? undefined, {
			id: 'avgPositionUsd',
			header: 'Holders Avg Position',
			enableSorting: true,
			cell: (info) => {
				const val = info.getValue() as number | null
				if (val == null) return <span className="block text-end text-(--text-disabled)">{'\u2014'}</span>
				return <span className="tabular-nums">{formattedNum(val, true)}</span>
			},
			size: 160,
			meta: {
				align: 'end',
				headerHelperText: 'Average position size in USD (TVL / holder count).'
			}
		}),
		columnHelper.accessor((row) => row.totalAvailableUsd ?? undefined, {
			id: 'totalAvailableUsd',
			header: 'Available',
			enableSorting: true,
			cell: (info) => {
				return (
					<span
						data-strike={info.row.original.strikeTvl ?? 'false'}
						className="flex justify-end gap-1 data-[strike=true]:text-(--text-disabled)"
					>
						{['Morpho Compound', 'Morpho Aave'].includes(info.row.original.project) ? (
							<QuestionHelper
								text={`Morpho liquidity comes from the underlying lending protocol pool itself. Available P2P Liquidity: ${
									info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd > 0
										? formattedNum(info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd, true)
										: '$0'
								}`}
							/>
						) : null}
						{info.getValue() == null ? null : formattedNum(info.getValue(), true)}
					</span>
				)
			},
			size: 120,
			meta: {
				align: 'end'
			}
		})
	].map((column) => {
		const columnId = column.id ?? ('accessorKey' in column ? column.accessorKey : undefined)
		if (!hasPremiumAccess && columnId === 'cv30d') {
			return { ...column, enableSorting: false }
		}
		return column
	})
}

const columnOrders: Record<number, readonly PoolsColumnId[]> = {
	0: [
		'pool',
		'apy',
		'apyIncludingLsdApy',
		'tvl',
		'project',
		'chains',
		'apyBase',
		'apyBaseIncludingLsdApy',
		'apyReward',
		'apyBase7d',
		'il7d',
		'apyMean30d',
		'pegDeviation',
		'apyMedian30d',
		'apyStd30d',
		'volumeUsd1d',
		'volumeUsd7d',
		'apyBaseInception',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd',
		'top10Pct',
		'holderCount',
		'avgPositionUsd',
		'cv30d',
		'apyChart30d'
	],
	400: [
		'pool',
		'project',
		'apy',
		'apyIncludingLsdApy',
		'tvl',
		'chains',
		'apyBase',
		'apyBaseIncludingLsdApy',
		'apyReward',
		'apyBase7d',
		'il7d',
		'apyMean30d',
		'pegDeviation',
		'apyMedian30d',
		'apyStd30d',
		'volumeUsd1d',
		'volumeUsd7d',
		'apyBaseInception',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd',
		'top10Pct',
		'holderCount',
		'avgPositionUsd',
		'cv30d',
		'apyChart30d'
	],
	640: [
		'pool',
		'project',
		'tvl',
		'apy',
		'apyIncludingLsdApy',
		'chains',
		'apyBase',
		'apyBaseIncludingLsdApy',
		'apyReward',
		'apyBase7d',
		'il7d',
		'apyMean30d',
		'pegDeviation',
		'apyMedian30d',
		'apyStd30d',
		'volumeUsd1d',
		'volumeUsd7d',
		'apyBaseInception',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd',
		'top10Pct',
		'holderCount',
		'avgPositionUsd',
		'cv30d',
		'apyChart30d'
	],
	1280: [
		'pool',
		'project',
		'chains',
		'tvl',
		'apy',
		'apyIncludingLsdApy',
		'apyBase',
		'apyBaseIncludingLsdApy',
		'apyReward',
		'apyBase7d',
		'il7d',
		'apyMean30d',
		'pegDeviation',
		'apyMedian30d',
		'apyStd30d',
		'volumeUsd1d',
		'volumeUsd7d',
		'apyBaseInception',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd',
		'top10Pct',
		'holderCount',
		'avgPositionUsd',
		'cv30d',
		'apyChart30d'
	]
}

const columnSizes: Record<number, Partial<Record<PoolsColumnId, number>>> = {
	0: {
		pool: 120,
		project: 200,
		chains: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyBase7d: 130,
		il7d: 90,
		apyMean30d: 125,
		cv30d: 110,
		pegDeviation: 100,
		apyMedian30d: 140,
		apyStd30d: 120,
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 125,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120,
		holderCount: 130,
		top10Pct: 110,
		avgPositionUsd: 160
	},
	812: {
		pool: 200,
		project: 200,
		chains: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyBase7d: 140,
		il7d: 90,
		apyMean30d: 125,
		cv30d: 110,
		pegDeviation: 100,
		apyMedian30d: 140,
		apyStd30d: 120,
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 125,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120,
		holderCount: 130,
		top10Pct: 110,
		avgPositionUsd: 160
	},
	1280: {
		pool: 240,
		project: 200,
		chains: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyBase7d: 140,
		il7d: 90,
		apyMean30d: 125,
		cv30d: 110,
		pegDeviation: 100,
		apyMedian30d: 140,
		apyStd30d: 120,
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 125,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120,
		holderCount: 130,
		top10Pct: 110,
		avgPositionUsd: 160
	},
	1536: {
		pool: 280,
		project: 200,
		chains: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyBase7d: 140,
		il7d: 90,
		apyMean30d: 125,
		cv30d: 110,
		pegDeviation: 100,
		apyMedian30d: 140,
		apyStd30d: 120,
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 125,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120,
		holderCount: 130,
		top10Pct: 110,
		avgPositionUsd: 160
	},
	1600: {
		pool: 320,
		project: 200,
		chains: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyBase7d: 140,
		il7d: 90,
		apyMean30d: 125,
		cv30d: 110,
		pegDeviation: 100,
		apyMedian30d: 140,
		apyStd30d: 120,
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 125,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120,
		holderCount: 130,
		top10Pct: 110,
		avgPositionUsd: 160
	},
	1640: {
		pool: 360,
		project: 200,
		chains: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyBase7d: 140,
		il7d: 90,
		apyMean30d: 125,
		cv30d: 110,
		pegDeviation: 100,
		apyMedian30d: 140,
		apyStd30d: 120,
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 125,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120,
		holderCount: 130,
		top10Pct: 110,
		avgPositionUsd: 160
	},
	1720: {
		pool: 420,
		project: 200,
		chains: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyBase7d: 140,
		il7d: 90,
		apyMean30d: 125,
		cv30d: 110,
		pegDeviation: 100,
		apyMedian30d: 140,
		apyStd30d: 120,
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 125,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120,
		holderCount: 130,
		top10Pct: 110,
		avgPositionUsd: 160
	}
}

export const POOLS_TABLE_CONFIG: YieldsTableConfig<IYieldTableRow, PoolsColumnId, PoolsTableConfigContext> = {
	kind: 'pools',
	columnIds: POOLS_COLUMN_IDS,
	columns: createPoolsColumns,
	columnOrders,
	columnSizes,
	columnVisibility: ({ query, hasPremiumAccess }) =>
		decodePoolsColumnVisibilityQuery(query as Record<string, string | string[] | undefined>, {
			hasPremiumAccess,
			includeLsdApy: query.includeLsdApy === 'true',
			isStablecoinPage: query.pathname === '/yields/stablecoins'
		})
}

function usePoolsTableContext() {
	const router = useRouter()
	const { hasActiveSubscription } = useAuthContext()
	const isClient = useIsClient()
	const { onRequestUpgrade, modal } = useYieldsUpgradePrompt()

	return {
		context: useMemo(
			() => ({
				query: {
					...router.query,
					pathname: router.pathname
				},
				hasPremiumAccess: isClient && hasActiveSubscription,
				isClient,
				onRequestUpgrade
			}),
			[hasActiveSubscription, isClient, onRequestUpgrade, router.pathname, router.query]
		),
		modal
	}
}

export function YieldsPoolsTable(props: IYieldsTableProps) {
	const { context, modal } = usePoolsTableContext()
	const resolvedConfig = useMemo(() => resolveVirtualYieldsTableConfig(POOLS_TABLE_CONFIG, context), [context])

	return (
		<>
			<YieldsTableWrapper
				{...props}
				columns={resolvedConfig.columns}
				columnSizes={resolvedConfig.columnSizes}
				columnOrders={resolvedConfig.columnOrders}
				columnVisibility={resolvedConfig.columnVisibility}
			/>
			{modal}
		</>
	)
}

export function PaginatedYieldsPoolTable({
	data,
	initialPageSize = DEFAULT_PAGE_SIZE_OPTIONS[0],
	initialPageIndex = 0,
	sortingState = [],
	onSortingChange,
	interactionDisabled = false
}: IYieldsTableProps) {
	const { context, modal } = usePoolsTableContext()
	const [sorting, setSorting] = useState<SortingState>([...sortingState])
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: initialPageIndex,
		pageSize: initialPageSize
	})

	const paginatedColumns = useMemo(() => preparePaginatedYieldsColumns(POOLS_TABLE_CONFIG, context), [context])

	const table = useReactTable({
		data,
		columns: paginatedColumns,
		meta: {
			getDisplayRowNumber: (rowIndex: number) => pagination.pageIndex * pagination.pageSize + rowIndex + 1
		},
		state: {
			sorting,
			pagination
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) =>
			startTransition(() => {
				const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
				setSorting(nextSorting)
				onSortingChange?.(nextSorting)
			}),
		onPaginationChange: (updater) =>
			startTransition(() => setPagination((prev) => (typeof updater === 'function' ? updater(prev) : updater))),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex: false
	})

	return (
		<>
			<PaginatedTable
				table={table}
				pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
				interactionDisabled={interactionDisabled}
			/>
			{modal}
		</>
	)
}
