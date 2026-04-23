import type { IYieldsOptimizerTableRow } from '~/containers/Yields/Tables/types'

export interface TokenBorrowRoutesResponse {
	borrowAsCollateral: IYieldsOptimizerTableRow[]
	borrowAsDebt: IYieldsOptimizerTableRow[]
}
