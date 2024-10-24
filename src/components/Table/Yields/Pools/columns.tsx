import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldTableRow } from '../types'
import { lockupsRewards, earlyExit } from '~/components/YieldsPage/utils'
import { CustomLink } from '~/components/Link'
import { ImageWithFallback } from '~/components/ImageWithFallback'
import styled from 'styled-components'

const uniswapV3 = 'For Uniswap V3 we assume a price range of +/- 30% (+/- 0.1% for stable pools) around current price.'

const ChartImage = styled(ImageWithFallback)`
	margin-left: auto;
`

export const columns: ColumnDef<IYieldTableRow>[] = [
	{
		header: 'Pool',
		accessorKey: 'pool',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<NameYieldPool
					value={getValue() as string}
					configID={row.original.configID}
					url={row.original.url}
					index={index + 1}
				/>
			)
		},
		size: 200
	},
	{
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		accessorKey: 'project',
		enableSorting: false,
		cell: ({ row }) => (
			<NameYield project={row.original.project} projectslug={row.original.projectslug} airdrop={row.original.airdrop} />
		),
		size: 200
	},
	{
		header: 'Chain',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => <IconsRow links={info.getValue() as Array<string>} url="/yields?chain" iconType="chain" />,
		meta: {
			align: 'end'
		},
		size: 60
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{'$' + formattedNum(info.getValue())}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'APY',
		accessorKey: 'apy',
		enableSorting: true,
		cell: (info) => {
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
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
					{formattedPercent(info.getValue(), true, 700)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText:
				'APY = Base APY + Reward APY. For non-autocompounding pools we do not account for reinvesting, in which case APY = APR.'
		}
	},
	{
		header: 'Base APY',
		accessorKey: 'apyBase',
		enableSorting: true,
		cell: (info) => {
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{info.row.original.project === 'Fraxlend' ? (
						<QuestionHelper
							text={'Supply APY is for FRAX being lent to the pool, you do not earn interest on your collateral!'}
						/>
					) : info.row.original.project === 'Sommelier' ? (
						<QuestionHelper text={'Calculated over a 24h period! Enable 7d Base APY column for a larger period'} />
					) : null}
					{formattedPercent(info.getValue(), true)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Annualised percentage yield from trading fees/supplying. For dexes we use the 24h fees and scale those to a year.'
		}
	},
	{
		header: 'Reward APY',
		accessorKey: 'apyReward',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewards ?? []
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.project) ? (
						<QuestionHelper text={earlyExit} />
					) : row.original.rewardMeta ? (
						<QuestionHelper text={row.original.rewardMeta} />
					) : null}
					<IconsRow
						links={rewards}
						url="/yields?project"
						iconType="token"
						yieldRewardsSymbols={row.original.rewardTokensSymbols}
					/>
					{formattedPercent(getValue(), true)}
				</AutoRow>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised percentage yield from incentives.'
		}
	},
	{
		header: '7d Base APY',
		accessorKey: 'apyBase7d',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: `Annualised percentage yield based on the trading fees from the last 7 days. ${uniswapV3}`
		}
	},
	{
		header: '7d IL',
		accessorKey: 'il7d',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText: `7d Impermanent Loss: the percentage loss between LPing for the last 7days vs hodling the underlying assets instead. ${uniswapV3}`
		}
	},
	{
		header: '30d Avg APY',
		accessorKey: 'apyMean30d',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 125,
		meta: {
			align: 'end'
		}
	},
	{
		header: '30d APY Chart',
		accessorKey: 'apyChart30d',
		enableSorting: false,
		cell: ({ row }) => {
			const configID = row.original.configID
			if (!configID) return null
			return (
				<CustomLink href={`/yields/pool/${configID}`} target="_blank">
					<ChartImage
						src={`https://yield-charts.llama.fi/yield-chart/${configID}`}
						alt=""
						width={90}
						height={30}
						style={{ marginLeft: 'auto' }}
						unoptimized
					/>
				</CustomLink>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Volume',
		accessorKey: 'volumeUsd1d',
		enableSorting: true,
		cell: (info) => {
			return <>{info.getValue() !== null ? '$' + formattedNum(info.getValue()) : null}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: '$ Volume in the last 24 hours.'
		}
	},
	{
		header: '7d Volume',
		accessorKey: 'volumeUsd7d',
		enableSorting: true,
		cell: (info) => {
			return <>{info.getValue() !== null ? '$' + formattedNum(info.getValue()) : null}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: '$ Volume in the last 7 days'
		}
	},
	{
		header: 'Inception APY',
		accessorKey: 'apyBaseInception',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised percentage yield since inception'
		}
	},
	{
		header: 'APY',
		accessorKey: 'apyIncludingLsdApy',
		enableSorting: true,
		cell: (info) => {
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{info.row.original.project === 'cBridge' ? (
						<QuestionHelper text={'Your deposit can be moved to another chain with a different APY!'} />
					) : info.row.original.project === 'Uniswap V3' ? (
						<QuestionHelper
							text={
								'Calculated as: 24h fees * 365 / TVL. Enable "7d Base APY" for a more detailed APY calculation which uses 7 day trading fees and a price range of +/- 30% (+/- 0.1% for stable pools) around current price.'
							}
						/>
					) : null}
					{formattedPercent(info.getValue(), true, 700)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText:
				'APY = Base APY + Reward APY. For non-autocompounding pools we do not account for reinvesting, in which case APY = APR.'
		}
	},
	{
		header: 'Base APY',
		accessorKey: 'apyBaseIncludingLsdApy',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Annualised percentage yield from trading fees/supplying inclusive of LSD APY (if applicable). For dexes we use the 24h fees and scale those to a year.'
		}
	},
	{
		header: 'Net Borrow APY',
		accessorKey: 'apyBorrow',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true, 700)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for borrowing (Borrow Base APY + Borrow Reward APY).'
		}
	},
	{
		header: 'Borrow Base APY',
		accessorKey: 'apyBaseBorrow',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 160,
		meta: {
			align: 'end',
			headerHelperText: 'Interest borrowers pay to lenders.'
		}
	},
	{
		header: 'Borrow Reward APY',
		accessorKey: 'apyRewardBorrow',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 160,
		meta: {
			align: 'end',
			headerHelperText: 'Incentive reward APY for borrowing.'
		}
	},
	{
		header: 'Max LTV',
		accessorKey: 'ltv',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() ? formattedNum(Number(info.getValue()) * 100) + '%' : null}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Max loan to value (collateral factor)'
		}
	},
	{
		header: 'Supplied',
		accessorKey: 'totalSupplyUsd',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() === null ? '' : '$' + formattedNum(info.getValue())}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Borrowed',
		accessorKey: 'totalBorrowUsd',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() === null ? '' : '$' + formattedNum(info.getValue())}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Amount of borrowed collateral'
		}
	},
	{
		header: 'Available',
		accessorKey: 'totalAvailableUsd',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						display: 'flex',
						gap: '4px',
						justifyContent: 'flex-end',
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.row.original.project.includes('Morpho') ? (
						<QuestionHelper
							text={`Morpho liquidity comes from the underlying lending protocol pool itself. Available P2P Liquidity: ${
								info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd > 0
									? '$' + formattedNum(info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd)
									: '$0'
							}`}
						/>
					) : null}
					{info.getValue() === null ? null : '$' + formattedNum(info.getValue())}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
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
		'totalAvailableUsd'
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
		'totalAvailableUsd'
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

export const columnSizes = {
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
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 120,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
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
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 120,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
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
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 120,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
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
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 120,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
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
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 120,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
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
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 120,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
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
		volumeUsd1d: 140,
		volumeUsd7d: 140,
		apyBaseInception: 150,
		apyChart30d: 120,
		apyBorrow: 160,
		apyBaseBorrow: 170,
		apyRewardBorrow: 180,
		ltv: 110,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
