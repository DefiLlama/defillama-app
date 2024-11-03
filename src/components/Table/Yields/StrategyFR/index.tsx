import * as React from 'react'
import { yieldsColumnOrders, columns, columnSizes } from './columns'
import { YieldsTableWrapper } from '../shared'
import { getColumnSizesKeys } from '../../utils'

const columnSizesKeys = getColumnSizesKeys(columnSizes)

export function YieldsStrategyTableFR({ data }) {
	return (
		<YieldsTableWrapper
			data={data}
			columns={columns}
			columnSizes={columnSizes}
			columnSizesKeys={columnSizesKeys}
			columnOrders={yieldsColumnOrders}
			rowSize={80}
		/>
	)
}
