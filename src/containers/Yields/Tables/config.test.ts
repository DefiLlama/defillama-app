import { describe, expect, it } from 'vitest'
import { preparePaginatedYieldsColumns, validateYieldsTableConfig } from './config'
import { YIELDS_TABLE_CONFIGS } from './configRegistry'

const basePoolsContext = {
	query: { pathname: '/yields' },
	hasPremiumAccess: false,
	isClient: true,
	onRequestUpgrade: () => {}
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

	it('applies the same pools visible ordering for paginated rendering that the shared config declares', () => {
		const columns = preparePaginatedYieldsColumns(YIELDS_TABLE_CONFIGS.pools, basePoolsContext, 1280)
		const orderedIds = columns
			.map((column) =>
				'id' in column && typeof column.id === 'string'
					? column.id
					: 'accessorKey' in column
						? column.accessorKey
						: undefined
			)
			.filter(Boolean)

		expect(orderedIds.slice(0, 6)).toEqual(['pool', 'project', 'chains', 'tvl', 'apy', 'apyBase'])
		expect(orderedIds).not.toContain('apyMedian30d')
		expect(orderedIds).not.toContain('apyStd30d')
	})

	it('keeps paginated rendering stable without a client breakpoint width', () => {
		const columns = preparePaginatedYieldsColumns(YIELDS_TABLE_CONFIGS.pools, basePoolsContext)
		const orderedIds = columns
			.map((column) =>
				'id' in column && typeof column.id === 'string'
					? column.id
					: 'accessorKey' in column
						? column.accessorKey
						: undefined
			)
			.filter(Boolean)

		expect(orderedIds.slice(0, 6)).toEqual(['pool', 'project', 'chains', 'tvl', 'apy', 'apyBase'])
	})
})
