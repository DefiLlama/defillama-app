import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import YieldPage from '../index'

const { captured, routerState } = vi.hoisted(() => ({
	captured: {
		prepareCsv: null as null | (() => { filename: string; rows: Array<Array<string | number | boolean | null>> })
	},
	routerState: {
		pathname: '/yields',
		query: {} as Record<string, string | string[] | undefined>
	}
}))

vi.mock('next/router', () => ({
	useRouter: () => routerState
}))

vi.mock('../queries/client', () => ({
	useHolderStats: () => ({ data: undefined }),
	useVolatility: () => ({ data: undefined })
}))

vi.mock('~/containers/LlamaAI/hooks/useEntityQuestions', () => ({
	useEntityQuestions: () => ({ data: null, isFetching: false })
}))

vi.mock('../Filters', () => ({
	YieldFiltersV2: (props: {
		prepareCsv?: () => { filename: string; rows: Array<Array<string | number | boolean | null>> }
	}) => {
		captured.prepareCsv = props.prepareCsv ?? null
		return <div data-testid="yield-filters" />
	}
}))

vi.mock('../Tables/Pools', () => ({
	YieldsPoolsTable: () => <div data-testid="yield-pools-table" />
}))

function pool(id: number, overrides: Record<string, unknown> = {}) {
	return {
		pool: `pool-${id}`,
		symbol: `TOKEN${id}-USDC`,
		project: 'test-project',
		projectName: 'Test Project',
		chain: 'Ethereum',
		category: 'Dexes',
		tvlUsd: 1_000 + id,
		apy: id + 1,
		apyBase: id,
		apyReward: 1,
		predictions: { predictedClass: 'Stable/Up', binnedConfidence: 3 },
		stablecoin: false,
		underlyingTokens: [],
		...overrides
	} as any
}

describe('YieldPage CSV export', () => {
	beforeEach(() => {
		captured.prepareCsv = null
		routerState.pathname = '/yields'
		routerState.query = {}
	})

	it('uses the full currently filtered row set, not only visible, virtualized, or paginated rows', () => {
		const includedPools = Array.from({ length: 60 }, (_, index) => pool(index))
		const zeroApyPool = pool(99, { symbol: 'ZERO-USDC', apy: 0 })

		renderToStaticMarkup(
			<YieldPage
				pools={[...includedPools, zeroApyPool]}
				projectList={['Test Project']}
				chainList={['Ethereum']}
				categoryList={['Dexes']}
				tokens={[]}
				tokenSymbolsList={[]}
				usdPeggedSymbols={['USDC']}
				tokenCategories={{}}
				evmChains={[]}
				stablecoinInfoBySymbol={{}}
				entityQuestions={[]}
			/>
		)

		const prepareCsv = captured.prepareCsv
		if (!prepareCsv) throw new Error('YieldFiltersV2 did not receive a prepareCsv callback')

		const csv = prepareCsv()
		const poolNames = csv.rows.slice(1).map((row) => row[0])

		expect(csv.filename).toBe('yields')
		expect(poolNames).toEqual(includedPools.map((includedPool) => includedPool.symbol))
		expect(poolNames).not.toContain('ZERO-USDC')
	})
})
