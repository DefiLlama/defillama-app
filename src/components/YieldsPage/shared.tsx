import styled from 'styled-components'
import Table, { columnsToShow, NameYield, NameYieldPool } from '~/components/Table'
import { AutoRow } from '~/components/Row'
import QuestionHelper from '~/components/QuestionHelper'
import IconsRow from '~/components/IconsRow'
import { formattedPercent } from '~/utils'

export const TableWrapper = styled(Table)`
	tr > *:not(:first-child) {
		& > * {
			width: 100px;
			font-weight: 400;
		}
	}

	// POOL
	tr > *:nth-child(1) {
		& > * {
			width: 120px;
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
	}

	// 1D CHANGE
	tr > *:nth-child(6) {
		display: none;
	}

	// 7D CHANGE
	tr > *:nth-child(7) {
		display: none;
		padding-right: 20px;
	}

	// OUTLOOK
	tr > *:nth-child(8) {
		display: none;
	}

	// CONFIDENCE
	tr > *:nth-child(9) {
		display: none;
	}

	@media screen and (min-width: 320px) {
		tr > *:nth-child(1) {
			& > a {
				width: 140px;
			}
		}
	}

	@media screen and (min-width: 360px) {
		tr > *:nth-child(1) {
			& > a {
				width: 180px;
			}
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// POOL
		tr > *:nth-child(1) {
			& > * {
				width: 200px;
			}
		}

		// PROJECT
		tr > *:nth-child(2) {
			display: revert;

			& > div {
				width: 100px;
				overflow: hidden;
				white-space: nowrap;

				// HIDE LOGO
				& > div {
					display: none;
				}

				& > a {
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// TVL
		tr > *:nth-child(4) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// APY
		tr > *:nth-child(5) {
			padding-right: 0px;
		}

		// 7D CHANGE
		tr > *:nth-child(7) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpXl}) {
		// 7D CHANGE
		tr > *:nth-child(7) {
			padding-right: 0;
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
				width: 160px;

				// HIDE LOGO
				& > div {
					display: revert;
				}
			}
		}

		// 1D CHANGE
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
		header: 'Chains',
		accessor: 'chains',
		disableSortBy: true,
		helperText: "Chains are ordered by protocol's highest TVL on each chain",
		Cell: ({ value }) => <IconsRow links={value} url="/yields?chain" iconType="chain" />
	},
	...columnsToShow('tvl'),
	{
		header: 'APY',
		accessor: 'apy',
		helperText: 'Annualised percentage yield',
		Cell: ({ value, rowValues }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end' }}>
					{rowValues.project === 'Osmosis' ? (
						<QuestionHelper text={`${rowValues.id.split('-').slice(-1)} lock`} />
					) : null}
					{formattedPercent(value, true)}
				</AutoRow>
			)
		}
	},
	{
		header: '1d change',
		accessor: 'change1d',
		Cell: ({ value }) => <>{formattedPercent(value)}</>
	},
	{
		header: '7d change',
		accessor: 'change7d',
		Cell: ({ value }) => <>{formattedPercent(value)}</>
	},
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
