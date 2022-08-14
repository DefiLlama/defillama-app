import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import { formattedNum, formattedPercent } from '~/utils'
import { HeaderWithHelperText } from '../Header'
import { IYieldTableRow } from './types'

export const columns: ColumnDef<IYieldTableRow>[] = [
	{
		header: 'Pool',
		accessorKey: 'pool',
		enableSorting: false,
		cell: (info) => <>{`${info.row.index + 1} ${info.getValue()}`}</>,
		size: 160
	},
	{
		header: 'Project',
		accessorKey: 'project',
		enableSorting: false,
		size: 128
	},
	// {
	// 	header: 'Chain',
	// 	accessorKey: 'chains',
	// 	enableSorting: false,
	// 	cell: (info) => <IconsRow links={info.getValue() as Array<string>} url="/yields?chain" iconType="chain" />,
	// 	size: 60
	// },
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
		size: 100
	},
	{
		header: () => <HeaderWithHelperText value="APY" helperText="Total annualised percentage yield" />,
		accessorKey: 'apy',
		enableSorting: true,
		cell: (info) => {
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{info.row.original.project === 'Osmosis' ? (
						<QuestionHelper text={`${info.row.original.id.split('-').slice(-1)} lock`} />
					) : info.row.original.project === 'cBridge' ? (
						<QuestionHelper text={'Your deposit can be moved to another chain with a different APY'} />
					) : null}
					{formattedPercent(info.getValue(), true, 700)}
				</span>
			)
		},
		size: 100
	},
	{
		header: () => (
			<HeaderWithHelperText value="Base APY" helperText="Annualised percentage yield from trading fees/supplying" />
		),
		accessorKey: 'apyBase',
		enableSorting: true,
		cell: (info) => {
			return <>{formattedPercent(info.getValue(), true)}</>
		},
		size: 100
	},
	// {
	// 	header: () => <HeaderWithHelperText value="Reward APY" helperText="Annualised percentage yield from incentives" />,
	// 	accessorKey: 'apyReward',
	// 	enableSorting: true,
	// 	cell: (info) => {
	// 		const rewards = info.row.original.rewards ?? []
	// 		return (
	// 			<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
	// 				{rewards.includes('Optimism') || rewards.includes('Avalanche') ? (
	// 					<IconsRow
	// 						links={rewards}
	// 						url="/yields?chain"
	// 						iconType="chain"
	// 						yieldRewardsSymbols={info.row.original.rewardTokensSymbols}
	// 					/>
	// 				) : (
	// 					<IconsRow
	// 						links={rewards}
	// 						url="/yields?project"
	// 						iconType="token"
	// 						yieldRewardsSymbols={info.row.original.rewardTokensSymbols}
	// 					/>
	// 				)}
	// 				{formattedPercent(info.getValue(), true)}
	// 			</AutoRow>
	// 		)
	// 	},
	// 	size: 100
	// },
	{
		header: () => <HeaderWithHelperText value="1d Change" helperText="Absolute change in APY" />,
		accessorKey: 'change1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 100
	},
	{
		header: () => <HeaderWithHelperText value="7d Change" helperText="Absolute change in APY" />,
		accessorKey: 'change7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 100
	},
	{
		header: () => (
			<HeaderWithHelperText
				value="Outlook"
				helperText="The predicted outlook indicates if the current APY can be maintained (stable or up) or not (down) within the next 4weeks. The algorithm consideres APYs as stable with a fluctuation of up to -20% from the current APY."
			/>
		),
		accessorKey: 'outlook',
		size: 100
	},
	{
		header: () => <HeaderWithHelperText value="Confidence" helperText="Predicted outlook confidence" />,
		accessorKey: 'confidence',
		cell: (info) => (
			<>{info.getValue() === null ? null : info.getValue() === 1 ? 'Low' : info.getValue() === 2 ? 'Medium' : 'High'}</>
		),
		size: 100
	}
]
