import IconsRow from '~/components/IconsRow'
import QuestionHelper from '~/components/QuestionHelper'
import { Name } from './Name'
import type { IColumnProps, TColumns } from './types'
import { formattedNum, formattedPercent } from '~/utils'
import { useDefiManager } from '~/contexts/LocalStorage'

type AllColumns = Record<TColumns, IColumnProps>

export const allColumns: AllColumns = {
	protocolName: {
		header: 'Name',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowValues, rowIndex = null, rowType, showRows }) => (
			<Name
				type="protocol"
				value={value}
				symbol={rowValues.symbol}
				index={rowIndex !== null && rowIndex + 1}
				bookmark
				rowType={rowType}
				showRows={showRows}
			/>
		)
	},
	peggedAsset: {
		header: 'Name',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
			<Name
				type="peggedAsset"
				value={value}
				symbol={rowValues.symbol}
				index={rowIndex !== null && rowIndex + 1}
				rowType={rowType}
			/>
		)
	},
	peggedAssetChain: {
		header: 'Name',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowValues, rowIndex = null, rowType, showRows }) => (
			<Name
				type="peggedAssetChain"
				value={value}
				symbol={rowValues.symbol}
				index={rowIndex !== null && rowIndex + 1}
				rowType={rowType}
				showRows={showRows}
			/>
		)
	},
	feesProtocol: {
		header: 'Name',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
			<Name
				type="fees"
				value={value}
				symbol={rowValues.symbol}
				index={rowIndex !== null && rowIndex + 1}
				rowType={rowType}
			/>
		)
	},
	category: {
		header: 'Category',
		accessor: 'category',
		Cell: ({ value }) => <span>{value}</span>
	},
	chainName: {
		header: 'Name',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowValues, rowIndex = null, rowType, showRows }) => (
			<Name
				type="chain"
				value={value}
				symbol={rowValues.symbol}
				index={rowType === 'child' ? '-' : rowIndex !== null && rowIndex + 1}
				rowType={rowType}
				showRows={showRows}
			/>
		)
	},
	chains: {
		header: 'Chains',
		accessor: 'chains',
		disableSortBy: true,
		helperText: "Chains are ordered by protocol's highest TVL on each chain",
		Cell: ({ value }) => <IconsRow links={value} url="/chain" iconType="chain" />
	},
	'1dChange': {
		header: '1d Change',
		accessor: 'change_1d',
		Cell: ({ value }) => <>{formattedPercent(value)}</>
	},
	'7dChange': {
		header: '7d Change',
		accessor: 'change_7d',
		Cell: ({ value }) => <>{formattedPercent(value)}</>
	},
	'1mChange': {
		header: '1m Change',
		accessor: 'change_1m',
		Cell: ({ value }) => <>{formattedPercent(value)}</>
	},
	'fees': {
		header: 'Fees (24h)',
		accessor: 'total1dFees',
		Cell: ({ value }) => <>{'$' + formattedNum(value)}</>
	},
	'revenue': {
		header: 'Revenue (24h)',
		accessor: 'total1dRevenue',
		Cell: ({ value }) => <>{'$' + formattedNum(value)}</>
	},
	tvl: {
		header: 'TVL',
		accessor: 'tvl',
		Cell: ({ value, rowValues }) => {
			const [extraTvlsEnabled] = useDefiManager()

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
						'This protocol deposits into another protocol and is under Liquid Staking category, so it is subtracted from total TVL because both "Liquid Staking" and "Double Count" toggle is off'
				}
			}

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
	mcaptvl: {
		header: 'Mcap/TVL',
		accessor: 'mcaptvl',
		Cell: ({ value }) => <>{value && formattedNum(value)}</>
	},
	msizetvl: {
		header: 'Msize/TVL',
		accessor: 'msizetvl',
		Cell: ({ value }) => <>{value && formattedNum(value)}</>
	},
	listedAt: {
		header: 'Listed',
		accessor: 'listedAt',
		Cell: ({ value }) => <span style={{ whiteSpace: 'nowrap' }}>{value} days ago</span>
	},
	protocols: {
		header: 'Protocols',
		accessor: 'protocols'
	},
	dexName: {
		header: 'Name',
		accessor: 'name',
		disableSortBy: true,
		Cell: ({ value, rowValues, rowIndex = null, rowType, showRows }) => (
			<Name
				type="dex"
				value={value}
				index={rowType === 'child' ? '-' : rowIndex !== null && rowIndex + 1}
				rowType={rowType}
				showRows={showRows}
			/>
		)
	},
	totalVolume24h: {
		header: 'Last day volume',
		accessor: 'totalVolume24h',
		Cell: ({ value }) => <>{value && formattedNum(value)}</>
	}
}
