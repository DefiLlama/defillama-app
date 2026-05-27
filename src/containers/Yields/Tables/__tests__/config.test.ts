import type { ColumnDef } from '@tanstack/react-table'
import { describe, expect, it } from 'vitest'
import { getYieldsColumnId, preparePaginatedYieldsColumns, validateYieldsTableConfig } from '../config'
import { YIELDS_TABLE_CONFIGS } from '../configRegistry'

const basePoolsContext = {
	query: { pathname: '/yields' },
	hasPremiumAccess: false,
	isClient: true,
	onRequestUpgrade: () => {}
}

function getColumnIds<TRow>(columns: Array<ColumnDef<TRow, unknown>>) {
	return columns.map(getYieldsColumnId).filter((columnId): columnId is string => Boolean(columnId))
}

describe('YIELDS_TABLE_CONFIGS', () => {
	it('keeps every declared column id in sync with the actual column defs', () => {
		validateYieldsTableConfig(YIELDS_TABLE_CONFIGS.pools, basePoolsContext)
		validateYieldsTableConfig(YIELDS_TABLE_CONFIGS.borrow, undefined)
		validateYieldsTableConfig(YIELDS_TABLE_CONFIGS.loop, undefined)
		validateYieldsTableConfig(YIELDS_TABLE_CONFIGS.optimizer, { excludeRewardApy: false, withAmount: false })
		validateYieldsTableConfig(YIELDS_TABLE_CONFIGS.strategy, undefined)
		validateYieldsTableConfig(YIELDS_TABLE_CONFIGS.strategyFr, undefined)
	})

	it('applies the configured responsive ordering and visibility for paginated rendering', () => {
		const columns = preparePaginatedYieldsColumns(YIELDS_TABLE_CONFIGS.pools, basePoolsContext, 1280)
		const orderedIds = getColumnIds(columns)
		const visibleConfiguredIds = YIELDS_TABLE_CONFIGS.pools.columnOrders[1280].filter((columnId) =>
			orderedIds.includes(columnId)
		)

		expect(orderedIds.slice(0, visibleConfiguredIds.length)).toEqual(visibleConfiguredIds)
		expect(orderedIds).not.toContain('apyMedian30d')
		expect(orderedIds).not.toContain('apyStd30d')
	})

	it('keeps paginated rendering available without a client breakpoint width', () => {
		const columns = preparePaginatedYieldsColumns(YIELDS_TABLE_CONFIGS.pools, basePoolsContext)
		const orderedIds = getColumnIds(columns)

		expect(orderedIds).toContain('pool')
		expect(orderedIds).not.toContain('apyMedian30d')
		expect(orderedIds).not.toContain('apyStd30d')
	})
})
