import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldTableRow } from '../types'
import { lockupsRewards, preminedRewards } from '~/components/YieldsPage/utils'

const uniswapV3 = 'For Uniswap V3 we assume a price range of +/- 30% (+/- 0.1% for stable pools) around current price.'

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
					maxCharacters={20}
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
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
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
			return <>{formattedPercent(info.getValue(), true, 400)}</>
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
						<QuestionHelper
							text={`${row.original.project} Rewards are vested. You can immediately receive your rewards by taking an exit penalty!`}
						/>
					) : preminedRewards.includes(row.original.project) ? (
						<QuestionHelper text={`${row.original.project} has Pre-mined rewards, no available token yet!`} />
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
			return <>{formattedPercent(info.getValue(), true, 400)}</>
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
			return <>{formattedPercent(info.getValue(), true, 400)}</>
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText: `7d Impermanent Loss: the percentage loss between LPing for the last 7days vs hodling the underlying assets instead. ${uniswapV3}`
		}
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: ['pool', 'apy', 'tvl', 'project', 'chains', 'apyBase', 'apyReward', 'apyNet7d', 'apyBase7d', 'il7d'],
	400: ['pool', 'project', 'apy', 'tvl', 'chains', 'apyBase', 'apyReward', 'apyNet7d', 'apyBase7d', 'il7d'],
	640: ['pool', 'project', 'tvl', 'apy', 'chains', 'apyBase', 'apyReward', 'apyNet7d', 'apyBase7d', 'il7d'],
	1280: ['pool', 'project', 'chains', 'tvl', 'apy', 'apyBase', 'apyReward', 'apyNet7d', 'apyBase7d', 'il7d']
}

export const columnSizes = {
	0: {
		pool: 120,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyBase: 140,
		apyReward: 140,
		apyNet7d: 120,
		apyBase7d: 130,
		il7d: 90
	},
	812: {
		pool: 250,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyBase: 140,
		apyReward: 140,
		apyNet7d: 120,
		apyBase7d: 140,
		il7d: 90
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
