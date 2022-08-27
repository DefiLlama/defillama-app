import styled from 'styled-components'
import Table, { columnToShow, NameYield, NameYieldPool } from '~/components/Table'
import { AutoRow } from '~/components/Row'
import QuestionHelper from '~/components/QuestionHelper'
import IconsRow from '~/components/IconsRow'
import { formattedNum, formattedPercent } from '~/utils'

export const TableWrapper = styled(Table)`
	tr > *:not(:first-child) {
		& > * {
			font-weight: 400;
			width: 100px;
		}
	}

	// POOL
	tr > *:nth-child(1) {
		& > * {
			width: 140px;
			display: flex;
		}

		a {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	// PROJECT
	tr > *:nth-child(2) {
		display: none;
		text-align: start;
		margin-left: 0;

		& > * {
			text-align: start;
			margin-left: 0;

			// LOGO
			& > *:nth-child(2) {
				display: none;
			}
		}

		a {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	}

	// CHAINS
	tr > *:nth-child(3) {
		display: none;
	}

	// TVL
	tr > *:nth-child(4) {
		display: none;
	}

	// APY
	tr > *:nth-child(5) {
		padding-right: 20px;

		& > * {
			width: 80px;
		}
	}

	// BASE APY
	tr > *:nth-child(6) {
		display: none;
	}

	// REWARD APY
	tr > *:nth-child(7) {
		display: none;

		& > * {
			width: 120px;
		}
	}

	// OUTLOOK
	tr > *:nth-child(8) {
		display: none;

		& > * {
			width: 80px;
		}
	}

	// CONFIDENCE
	tr > *:nth-child(9) {
		display: none;

		& > * {
			width: 120px;
		}
	}

	@media screen and (min-width: 360px) {
		// POOL
		tr > *:nth-child(1) {
			& > * {
				width: 200px;
			}
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// PROJECT
		tr > *:nth-child(2) {
			display: revert;

			& > div {
				overflow: hidden;
				white-space: nowrap;
				width: 100px;

				& > a {
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// PROJECT
		tr > *:nth-child(2) {
			& > div {
				width: 140px;
			}
		}

		// TVL
		tr > *:nth-child(4) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// PROJECT
		tr > *:nth-child(2) {
			& > * {
				// LOGO
				& > *:nth-child(2) {
					display: revert;
					width: 24px;
					height: 24px;
				}
			}
		}

		// APY
		tr > *:nth-child(5) {
			padding-right: 0px;
		}

		// REWARD APY
		tr > *:nth-child(7) {
			display: revert;
			padding-right: 20px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpXl}) {
		// PROJECT
		tr > *:nth-child(2) {
			& > div {
				width: 160px;
			}
		}

		// REWARD APY
		tr > *:nth-child(7) {
			padding-right: 0;

			& > * {
				width: 140px;
			}
		}

		// OUTLOOK
		tr > *:nth-child(8) {
			display: revert;
		}

		// CONFIDENCE
		tr > *:nth-child(9) {
			display: revert;
		}
	}

	@media screen and (min-width: 1536px) {
		// POOL
		tr > *:nth-child(1) {
			& > * {
				width: 240px;
			}
		}

		// PROJECT
		tr > *:nth-child(2) {
			& > div {
				width: 180px;
			}
		}

		// BASE APY
		tr > *:nth-child(6) {
			display: revert;
		}
	}

	// CHAINS
	@media screen and (min-width: 1680px) {
		tr > *:nth-child(3) {
			display: revert;
		}
	}
`

const TVL_PROJECT_TEXT = {
	Morpho: 'TVL for this project includes Borrowed coins'
}

export const columns = [
	{
		header: 'Pool',
		accessor: 'pool',
		disableSortBy: true,
		Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
			<NameYieldPool
				value={value}
				poolId={rowValues.id}
				project={rowValues.project}
				url={rowValues.url ?? ''}
				index={rowIndex !== null && rowIndex + 1}
				bookmark
				rowType={rowType}
			/>
		)
	},
	{
		header: 'Project',
		accessor: 'project',
		disableSortBy: true,
		Cell: ({ value, rowValues }) => (
			<NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} />
		)
	},
	{
		header: 'Chain',
		accessor: 'chains',
		disableSortBy: true,
		Cell: ({ value }) => <IconsRow links={value} url="/yields?chain" iconType="chain" />
	},
	{
		...columnToShow('tvl'),
		Cell: ({ value, rowValues }) => {
			const text = TVL_PROJECT_TEXT[rowValues.project]

			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{text ? <QuestionHelper text={text} /> : null}
					<span
						style={{
							color: rowValues.strikeTvl ? 'gray' : 'inherit'
						}}
					>
						{'$' + formattedNum(value)}
					</span>
				</span>
			)
		}
	},
	{
		header: 'APY',
		accessor: 'apy',
		helperText: 'Total annualised percentage yield',
		Cell: ({ value, rowValues }) => {
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{rowValues.project === 'Alpaca Finance' ? (
						<QuestionHelper text={'Lowest Leverage'} />
					) : rowValues.project === 'cBridge' ? (
						<QuestionHelper text={'Your deposit can be moved to another chain with a different APY'} />
					) : null}
					{formattedPercent(value, true, 700)}
				</span>
			)
		}
	},
	{
		header: 'Base APY',
		accessor: 'apyBase',
		helperText: 'Annualised percentage yield from trading fees/supplying',
		Cell: ({ value }) => {
			return <AutoRow sx={{ width: '100%', justifyContent: 'flex-end' }}>{formattedPercent(value, true)}</AutoRow>
		}
	},
	{
		header: 'Reward APY',
		accessor: 'apyReward',
		helperText: 'Annualised percentage yield from incentives',
		Cell: ({ value, rowValues }) => {
			const rewards = rowValues.rewards ?? []
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rewards.includes('Optimism') || rewards.includes('Avalanche') ? (
						<IconsRow
							links={rewards}
							url="/yields?chain"
							iconType="chain"
							yieldRewardsSymbols={rowValues.rewardTokensSymbols}
						/>
					) : (
						<IconsRow
							links={rewards}
							url="/yields?project"
							iconType="token"
							yieldRewardsSymbols={rowValues.rewardTokensSymbols}
						/>
					)}
					{formattedPercent(value, true)}
				</AutoRow>
			)
		}
	},
	// NOTE(!) with the new columns, horizontal scrolling would become necessary for which we
	// experience performance issues. gonna remove the change columns for now to give preference to the
	// apy split columns
	// {
	// 	header: '1d Change',
	// 	accessor: 'change1d',
	// 	helperText: 'Absolute change in APY',
	// 	Cell: ({ value }) => <>{formattedPercent(value)}</>
	// },
	// {
	// 	header: '7d Change',
	// 	accessor: 'change7d',
	// 	helperText: 'Absolute change in APY',
	// 	Cell: ({ value }) => <>{formattedPercent(value)}</>
	// },
	{
		header: 'Outlook',
		accessor: 'outlook',
		helperText:
			'The predicted outlook indicates if the current APY can be maintained (stable or up) or not (down) within the next 4weeks. The algorithm consideres APYs as stable with a fluctuation of up to -20% from the current APY.',
		Cell: ({ value }) => <>{value}</>
	},
	{
		header: 'Confidence',
		accessor: 'confidence',
		helperText: 'Predicted outlook confidence',
		Cell: ({ value }) => <>{value === null ? null : value === 1 ? 'Low' : value === 2 ? 'Medium' : 'High'}</>
	}
]
export const fallbackList = new Array(20).fill('x')
export const fallbackColumns = columns.map((column) => ({
	...column,
	Cell: () => <span style={{ height: '24px' }}></span>
}))
