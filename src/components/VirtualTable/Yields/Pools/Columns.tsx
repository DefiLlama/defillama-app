import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldTableRow } from '../types'

export const columns: ColumnDef<IYieldTableRow>[] = [
	{
		header: 'Pool',
		accessorKey: 'pool',
		enableSorting: false,
		cell: ({ getValue, row }) => (
			<NameYieldPool
				value={getValue() as string}
				configID={row.original.configID}
				url={row.original.url}
				index={row.index + 1}
			/>
		),
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
				<span>
					<span
						style={{
							color: info.row.original.strikeTvl ? 'gray' : 'inherit'
						}}
					>
						{'$' + formattedNum(info.getValue())}
					</span>
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
					{info.row.original.project === 'Osmosis' ? (
						<QuestionHelper text={`${info.row.original.id?.split('-').slice(-1)} lock`} />
					) : info.row.original.project === 'cBridge' ? (
						<QuestionHelper text={'Your deposit can be moved to another chain with a different APY'} />
					) : null}
					{formattedPercent(info.getValue(), true, 700)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText: 'Total annualised percentage yield'
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
			headerHelperText: 'Annualised percentage yield from trading fees/supplying'
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
			headerHelperText: 'Annualised percentage yield from incentives'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change1d',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Absolute change in APY'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change7d',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Absolute change in APY'
		}
	},
	{
		header: 'Outlook',
		accessorKey: 'outlook',
		enableSorting: true,
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'The predicted outlook indicates if the current APY can be maintained (stable or up) or not (down) within the next 4weeks. The algorithm consideres APYs as stable with a fluctuation of up to -20% from the current APY.'
		}
	},
	{
		header: 'Confidence',
		accessorKey: 'confidence',
		enableSorting: true,
		cell: (info) => (
			<>{info.getValue() === null ? null : info.getValue() === 1 ? 'Low' : info.getValue() === 2 ? 'Medium' : 'High'}</>
		),
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Predicted outlook confidence'
		}
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: [
		'pool',
		'apy',
		'tvl',
		'project',
		'chains',
		'apyBase',
		'apyReward',
		'change1d',
		'change7d',
		'outlook',
		'confidence'
	],
	400: [
		'pool',
		'project',
		'apy',
		'tvl',
		'chains',
		'apyBase',
		'apyReward',
		'change1d',
		'change7d',
		'outlook',
		'confidence'
	],
	640: [
		'pool',
		'project',
		'tvl',
		'apy',
		'chains',
		'apyBase',
		'apyReward',
		'change1d',
		'change7d',
		'outlook',
		'confidence'
	],
	1280: [
		'pool',
		'project',
		'chains',
		'tvl',
		'apy',
		'apyBase',
		'apyReward',
		'change1d',
		'change7d',
		'outlook',
		'confidence'
	]
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
		change1d: 140,
		outlook: 120,
		confidence: 140
	},
	812: {
		pool: 200,
		project: 200,
		chain: 60,
		tvl: 120,
		apy: 100,
		apyBase: 140,
		apyReward: 140,
		change1d: 140,
		outlook: 120,
		confidence: 140
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
