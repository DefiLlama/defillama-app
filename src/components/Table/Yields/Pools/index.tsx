import { useRouter } from 'next/router'
import { yieldsColumnOrders, columns, columnSizes } from './columns'
import type { IYieldsTableProps } from '../types'
import { YieldsTableWrapper } from '../shared'
import { getColumnSizesKeys } from '../../utils'

const columnSizesKeys = getColumnSizesKeys(columnSizes)

export default function YieldsPoolsTable({ data }: IYieldsTableProps) {
	const router = useRouter()
	const { show7dBaseApy, show7dIL, show1dVolume, show7dVolume, showInceptionApy } = router.query

	const columnVisibility = {
		apyBase7d: show7dBaseApy === 'true',
		il7d: show7dIL === 'true',
		volumeUsd1d: show1dVolume === 'true',
		volumeUsd7d: show7dVolume === 'true',
		apyBaseInception: showInceptionApy === 'true'
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
