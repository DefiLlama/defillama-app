import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems, yieldsChainHref, yieldsProjectHref } from '~/components/IconsRow/utils'
import { ImageWithFallback } from '~/components/ImageWithFallback'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import { StabilityCell, StabilityHeader } from './StabilityCell'
import type { IYieldsTableProps, IYieldTableRow } from './types'

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

const columns = [
	columnHelper.accessor('pool', {
		id: 'pool',
		header: 'Pool',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()
			return (
				<NameYieldPool
					value={value}
					configID={row.original.configID}
					url={row.original.url}
					poolMeta={row.original.poolMeta}
				/>
			)
		},
		size: 200
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		enableSorting: false,
		cell: ({ row }) => (
			<NameYield
				project={row.original.project}
				projectslug={row.original.project}
				airdrop={row.original.airdrop}
				raiseValuation={row.original.raiseValuation}
			/>
		),
		size: 200
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
	columnHelper.accessor('tvl', {
		id: 'tvl',
		header: 'TVL',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
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
	columnHelper.accessor('apy', {
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
	columnHelper.accessor('apyBase', {
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
	columnHelper.accessor('apyReward', {
		id: 'apyReward',
		header: 'Reward APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewards ?? []
			return (
				<div className="flex w-full items-center justify-end gap-1">
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
				</div>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised percentage yield from incentives.'
		}
	}),
	columnHelper.accessor((row) => (row as any).apyBase7d as number | null, {
		id: 'apyBase7d',
		header: '7d Base APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: `Annualised percentage yield based on the trading fees from the last 7 days. ${uniswapV3}`
		}
	}),
	columnHelper.accessor((row) => (row as any).il7d as number | null, {
		id: 'il7d',
		header: '7d IL',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText: `7d Impermanent Loss: the percentage loss between LPing for the last 7days vs holding the underlying assets instead. ${uniswapV3}`
		}
	}),
	columnHelper.accessor((row) => (row as any).apyMean30d as number | null, {
		id: 'apyMean30d',
		header: '30d Avg APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 125,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.cv30d ?? undefined, {
		id: 'cv30d',
		header: () => <StabilityHeader />,
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<StabilityCell
					cv30d={getValue() as number | null}
					apyMedian30d={row.original.apyMedian30d}
					apyStd30d={row.original.apyStd30d}
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
	columnHelper.accessor('apyMedian30d', {
		id: 'apyMedian30d',
		header: '30d Median APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: '30-day median APY — more robust than average, resistant to outlier spikes.'
		}
	}),
	columnHelper.accessor('apyStd30d', {
		id: 'apyStd30d',
		header: '30d Std Dev',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Standard deviation of daily APY over the last 30 days. Measures yield volatility.'
		}
	}),
	columnHelper.accessor((row) => (row as any).apyChart30d as string | null | undefined, {
		id: 'apyChart30d',
		header: '30d APY Chart',
		enableSorting: false,
		cell: ({ row }) => {
			const configID = row.original.configID
			if (!configID) return null
			return (
				<BasicLink href={`/yields/pool/${configID}`} target="_blank" className="text-sm font-medium text-(--link-text)">
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
	columnHelper.accessor((row) => (row as any).volumeUsd1d as number | null, {
		id: 'volumeUsd1d',
		header: '1d Volume',
		enableSorting: true,
		cell: (info) => {
			return <>{info.getValue() !== null ? formattedNum(info.getValue(), true) : null}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: '$ Volume in the last 24 hours.'
		}
	}),
	columnHelper.accessor((row) => (row as any).volumeUsd7d as number | null, {
		id: 'volumeUsd7d',
		header: '7d Volume',
		enableSorting: true,
		cell: (info) => {
			return <>{info.getValue() !== null ? formattedNum(info.getValue(), true) : null}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: '$ Volume in the last 7 days'
		}
	}),
	columnHelper.accessor((row) => (row as any).apyBaseInception as number | null, {
		id: 'apyBaseInception',
		header: 'Inception APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised percentage yield since inception'
		}
	}),
	columnHelper.accessor((row) => (row as any).apyIncludingLsdApy as number | null, {
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
	columnHelper.accessor((row) => (row as any).apyBaseIncludingLsdApy as number | null, {
		id: 'apyBaseIncludingLsdApy',
		header: 'Base APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Annualised percentage yield from trading fees/supplying inclusive of LSD APY (if applicable). For dexs we use the 24h fees and scale those to a year.'
		}
	}),
	columnHelper.accessor('apyBorrow', {
		id: 'apyBorrow',
		header: 'Net Borrow APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign fontWeight={700} />
				</>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for borrowing (Borrow Base APY + Borrow Reward APY).'
		}
	}),
	columnHelper.accessor((row) => (row as any).apyBaseBorrow as number | null, {
		id: 'apyBaseBorrow',
		header: 'Borrow Base APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 160,
		meta: {
			align: 'end',
			headerHelperText: 'Interest borrowers pay to lenders.'
		}
	}),
	columnHelper.accessor('apyRewardBorrow', {
		id: 'apyRewardBorrow',
		header: 'Borrow Reward APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<>
					<PercentChange percent={info.getValue()} noSign />
				</>
			)
		},
		size: 160,
		meta: {
			align: 'end',
			headerHelperText: 'Incentive reward APY for borrowing.'
		}
	}),
	columnHelper.accessor((row) => (row as any).ltv as number | null, {
		id: 'ltv',
		header: 'Max LTV',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
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
	columnHelper.accessor('totalSupplyUsd', {
		id: 'totalSupplyUsd',
		header: 'Supplied',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('totalBorrowUsd', {
		id: 'totalBorrowUsd',
		header: 'Borrowed',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
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
			return (
				<span className="flex items-center justify-end gap-1.5">
					<span className="tabular-nums">{formattedNum(count)}</span>
					{change7d != null ? (
						<span className={`text-xs tabular-nums ${change7d >= 0 ? 'text-(--success)' : 'text-(--error)'}`}>
							{change7d >= 0 ? '+' : ''}
							{change7d}
						</span>
					) : null}
				</span>
			)
		},
		size: 130,
		meta: {
			align: 'end',
			headerHelperText: 'Number of unique token holders. Badge shows 7d change.'
		}
	}),
	columnHelper.accessor((row) => row.avgPositionUsd ?? undefined, {
		id: 'avgPositionUsd',
		header: 'Avg Position',
		enableSorting: true,
		cell: (info) => {
			const val = info.getValue() as number | null
			if (val == null) return <span className="block text-end text-(--text-disabled)">{'\u2014'}</span>
			return <>{formattedNum(val, true)}</>
		},
		size: 130,
		meta: {
			align: 'end',
			headerHelperText: 'Average holder position size in USD (TVL / holders).'
		}
	}),
	columnHelper.accessor((row) => row.top10Pct ?? undefined, {
		id: 'top10Pct',
		header: 'Top 10 %',
		enableSorting: true,
		cell: (info) => {
			const val = info.getValue() as number | null
			if (val == null) return <span className="block text-end text-(--text-disabled)">{'\u2014'}</span>
			return <span className="tabular-nums">{val.toFixed(1)}%</span>
		},
		size: 110,
		meta: {
			align: 'end',
			headerHelperText: 'Percentage of TVL held by the top 10 holders. Higher = more concentrated.'
		}
	}),
	columnHelper.accessor((row) => (row as any).totalAvailableUsd as number | null, {
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
					{info.getValue() === null ? null : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	})
]

const columnOrders: ColumnOrdersByBreakpoint = {
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
		'apyNet7d',
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
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd',
		'holderCount',
		'avgPositionUsd',
		'top10Pct'
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
		'apyNet7d',
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
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd',
		'holderCount',
		'avgPositionUsd',
		'top10Pct'
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
		'apyNet7d',
		'apyBase7d',
		'il7d',
		'apyMean30d',
		'cv30d',
		'pegDeviation',
		'apyMedian30d',
		'apyStd30d',
		'volumeUsd1d',
		'volumeUsd7d',
		'apyBaseInception',
		'apyChart30d',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd',
		'holderCount',
		'avgPositionUsd',
		'top10Pct'
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
		'apyNet7d',
		'apyBase7d',
		'il7d',
		'apyMean30d',
		'cv30d',
		'pegDeviation',
		'apyMedian30d',
		'apyStd30d',
		'volumeUsd1d',
		'volumeUsd7d',
		'apyBaseInception',
		'apyChart30d',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	]
}

const columnSizes: ColumnSizesByBreakpoint = {
	0: {
		pool: 120,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyNet7d: 120,
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
		avgPositionUsd: 130,
		top10Pct: 110
	},
	812: {
		pool: 200,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyNet7d: 120,
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
		avgPositionUsd: 130,
		top10Pct: 110
	},
	1280: {
		pool: 240,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyNet7d: 120,
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
		avgPositionUsd: 130,
		top10Pct: 110
	},
	1536: {
		pool: 280,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyNet7d: 120,
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
		avgPositionUsd: 130,
		top10Pct: 110
	},
	1600: {
		pool: 320,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyNet7d: 120,
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
		avgPositionUsd: 130,
		top10Pct: 110
	},
	1640: {
		pool: 360,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyNet7d: 120,
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
		avgPositionUsd: 130,
		top10Pct: 110
	},
	1720: {
		pool: 420,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyIncludingLsdApy: 100,
		apyBase: 140,
		apyBaseIncludingLsdApy: 140,
		apyReward: 140,
		apyNet7d: 120,
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
		avgPositionUsd: 130,
		top10Pct: 110
	}
}

export function YieldsPoolsTable(props: IYieldsTableProps) {
	const router = useRouter()
	const { hasActiveSubscription } = useAuthContext()
	const {
		show7dBaseApy,
		show7dIL,
		show1dVolume,
		show7dVolume,
		showInceptionApy,
		includeLsdApy,
		showNetBorrowApy,
		showBorrowBaseApy,
		showBorrowRewardApy,
		showTotalSupplied,
		showTotalBorrowed,
		showAvailable,
		showLTV,
		showMedianApy,
		showStdDev,
		showHolders
	} = router.query

	const isStablecoinPage = router.pathname === '/yields/stablecoins'

	const resolvedColumns = useMemo(() => {
		if (hasActiveSubscription) return columns
		return columns.map((col) => {
			const columnId = col.id ?? ('accessorKey' in col ? col.accessorKey : undefined)
			if (columnId === 'cv30d') {
				return { ...col, enableSorting: false }
			}
			return col
		})
	}, [hasActiveSubscription])

	// Stablecoin-specific columns only visible on /yields/stablecoins
	const stablecoinColumnVisibility = {
		pegDeviation: isStablecoinPage
	}

	const columnVisibility =
		includeLsdApy === 'true'
			? {
					apyBase7d: show7dBaseApy === 'true',
					il7d: show7dIL === 'true',
					volumeUsd1d: show1dVolume === 'true',
					volumeUsd7d: show7dVolume === 'true',
					apyBaseInception: showInceptionApy === 'true',
					apy: false,
					apyBase: false,
					apyIncludingLsdApy: true,
					apyBaseIncludingLsdApy: true,
					apyBorrow: showNetBorrowApy === 'true',
					apyBaseBorrow: showBorrowBaseApy === 'true',
					apyRewardBorrow: showBorrowRewardApy === 'true',
					totalSupplyUsd: showTotalSupplied === 'true',
					totalBorrowUsd: showTotalBorrowed === 'true',
					totalAvailableUsd: showAvailable === 'true',
					ltv: showLTV === 'true',
					cv30d: true,
					apyMedian30d: hasActiveSubscription && showMedianApy === 'true',
					apyStd30d: hasActiveSubscription && showStdDev === 'true',
					holderCount: showHolders === 'true',
					avgPositionUsd: showHolders === 'true',
					top10Pct: showHolders === 'true',
					...stablecoinColumnVisibility
				}
			: {
					apyBase7d: show7dBaseApy === 'true',
					il7d: show7dIL === 'true',
					volumeUsd1d: show1dVolume === 'true',
					volumeUsd7d: show7dVolume === 'true',
					apyBaseInception: showInceptionApy === 'true',
					apy: true,
					apyBase: true,
					apyIncludingLsdApy: false,
					apyBaseIncludingLsdApy: false,
					apyBorrow: showNetBorrowApy === 'true',
					apyBaseBorrow: showBorrowBaseApy === 'true',
					apyRewardBorrow: showBorrowRewardApy === 'true',
					totalSupplyUsd: showTotalSupplied === 'true',
					totalBorrowUsd: showTotalBorrowed === 'true',
					totalAvailableUsd: showAvailable === 'true',
					ltv: showLTV === 'true',
					cv30d: true,
					apyMedian30d: hasActiveSubscription && showMedianApy === 'true',
					apyStd30d: hasActiveSubscription && showStdDev === 'true',
					holderCount: showHolders === 'true',
					avgPositionUsd: showHolders === 'true',
					top10Pct: showHolders === 'true',
					...stablecoinColumnVisibility
				}

	return (
		<YieldsTableWrapper
			{...props}
			columns={resolvedColumns}
			columnSizes={columnSizes}
			columnOrders={columnOrders}
			columnVisibility={columnVisibility}
		/>
	)
}
