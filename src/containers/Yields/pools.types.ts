import type { IYieldTableRow } from './Tables/types'

export interface YieldPoolsPageResponse {
	rows: IYieldTableRow[]
	total: number
	page: number
	pageSize: number
	hasMore: boolean
}
