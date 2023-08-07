import { useRouter } from 'next/router'
import { yieldsColumnOrders, columns, columnSizes } from './columns'
import type { IYieldsTableProps } from '../types'
import { YieldsTableWrapper } from '../shared'
import { getColumnSizesKeys } from '../../utils'

const columnSizesKeys = getColumnSizesKeys(columnSizes)

export default function YieldsPoolsTable({ data }: IYieldsTableProps) {
	const router = useRouter()
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
		showLTV
	} = router.query

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
					ltv: showLTV === 'true'
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
					ltv: showLTV === 'true'
			  }

	return (
		<YieldsTableWrapper
			data={data}
			columns={columns}
			columnSizes={columnSizes}
			columnSizesKeys={columnSizesKeys}
			columnOrders={yieldsColumnOrders}
			columnVisibility={columnVisibility}
		/>
	)
}
