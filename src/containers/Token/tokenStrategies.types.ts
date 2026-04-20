import type { IYieldsOptimizerTableRow, IYieldsStrategyTableRow } from '~/containers/Yields/Tables/types'

export interface TokenStrategiesResponse {
	borrowAsCollateral: IYieldsOptimizerTableRow[]
	borrowAsDebt: IYieldsOptimizerTableRow[]
	longShort: IYieldsStrategyTableRow[]
}
