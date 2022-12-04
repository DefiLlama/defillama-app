import * as React from 'react'
import { useRouter } from 'next/router'
import { yieldsColumnOrders, columns, columnSizes } from './columns'
import { YieldsTableWrapper } from '../shared'
import { getColumnSizesKeys } from '../../utils'

const columnSizesKeys = getColumnSizesKeys(columnSizes)

const defaultSortingState = [{ id: 'borrowAvailableUsd', desc: true }]

export default function YieldsOptimizerTable({ data }) {
	const router = useRouter()

	const { excludeRewardApy } = router.query

	const columnVisibility =
		excludeRewardApy === 'true'
			? {
					totalBase: true,
					lendingBase: true,
					borrowBase: true,
					totalReward: false,
					lendingReward: false,
					borrowReward: false
			  }
			: {
					totalBase: false,
					lendingBase: false,
					borrowBase: false,
					totalReward: true,
					lendingReward: true,
					borrowReward: true
			  }

	return (
		<YieldsTableWrapper
			data={data}
			columns={columns}
			columnSizes={columnSizes}
			columnSizesKeys={columnSizesKeys}
			columnOrders={yieldsColumnOrders}
			sortingState={defaultSortingState}
			columnVisibility={columnVisibility}
		/>
	)
}
