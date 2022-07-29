import IconsRow from '~/components/IconsRow'
import QuestionHelper from '~/components/QuestionHelper'
import { Name } from './Name'
import type { IColumnProps, TColumns } from './types'
import { formattedNum, formattedPercent } from '~/utils'

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
	tvl: {
		header: 'TVL',
		accessor: 'tvl',
		Cell: ({ value, rowValues }) => {
			return (
				<span style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
					{rowValues.strikeTvl ? (
						<QuestionHelper text='This protocol deposits into another protocol and is subtracted from total TVL because "Double Count" toggle is off' />
					) : null}
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
	}
}
