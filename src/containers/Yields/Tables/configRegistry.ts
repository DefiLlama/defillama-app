import { BORROW_TABLE_CONFIG } from './Borrow'
import { LOOP_TABLE_CONFIG } from './Loop'
import { OPTIMIZER_TABLE_CONFIG } from './Optimizer'
import { POOLS_TABLE_CONFIG } from './Pools'
import { STRATEGY_TABLE_CONFIG } from './Strategy'
import { STRATEGY_FR_TABLE_CONFIG } from './StrategyFR'

export const YIELDS_TABLE_CONFIGS = {
	pools: POOLS_TABLE_CONFIG,
	borrow: BORROW_TABLE_CONFIG,
	loop: LOOP_TABLE_CONFIG,
	optimizer: OPTIMIZER_TABLE_CONFIG,
	strategy: STRATEGY_TABLE_CONFIG,
	strategyFr: STRATEGY_FR_TABLE_CONFIG
} as const
