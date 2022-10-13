import * as React from 'react'
import { yieldsColumnOrders, columns, columnSizes } from './columns'
import type { IYieldsTableProps } from '../types'
import { YieldsTableWrapper } from '../shared'
import { getColumnSizesKeys } from '../../utils'

const columnSizesKeys = getColumnSizesKeys(columnSizes)

export default function YieldsLoopTable({ data }: IYieldsTableProps) {
	return (
		<YieldsTableWrapper
			data={data}
			columns={columns}
			columnSizes={columnSizes}
			columnSizesKeys={columnSizesKeys}
			columnOrders={yieldsColumnOrders}
		/>
	)
}
