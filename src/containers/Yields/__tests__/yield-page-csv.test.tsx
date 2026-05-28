import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import YieldPage from '../views/PoolsView'

const { captured, routerState, enrichmentState, fetchJsonMock, poolPageQueryState } = vi.hoisted(() => ({
	captured: {
		prepareCsv: null as null | (() => Promise<{ filename: string; rows: unknown[][] }>)
	},
	routerState: {
		pathname: '/yields',
		query: {} as Record<string, string | string[] | undefined>
	},
	enrichmentState: {
		holderStats: {
			'pool-0': {
				holderCount: 10,
				avgPositionUsd: 100,
				top10Pct: 80,
				holderChange7d: 2,
				holderChange30d: 3
			}
		},
		volatility: {
			'pool-0': [null, 4.4, 0.9, 0.2]
		}
	},
	fetchJsonMock: vi.fn(),
	poolPageQueryState: {
		isError: false
	}
}))

vi.mock('next/router', () => ({
	useRouter: () => routerState
}))

vi.mock('../queries.client', () => ({
	useHolderStats: () => ({ data: enrichmentState.holderStats }),
	useVolatility: () => ({ data: enrichmentState.volatility }),
	useYieldsPaginatedTable: () =>
		poolPageQueryState.isError
			? {
					data: undefined,
					isLoading: false,
					isFetching: false,
					isError: true
				}
			: {
					data: {
						rows: Array.from({ length: 10 }, (_, index) => ({
							id: `pool-${index}`,
							pool: `TOKEN${index}-USDC`,
							configID: `pool-${index}`,
							projectslug: 'test-project',
							project: 'Test Project',
							chains: ['Ethereum'],
							tvl: 1_000 + index,
							apy: index + 1,
							apyBase: index,
							apyReward: 1,
							rewardTokensSymbols: [],
							rewards: [],
							change1d: null,
							change7d: null,
							outlook: 'Stable/Up',
							confidence: 3,
							url: '',
							category: 'Dexes'
						})),
						total: 60,
						page: 1,
						pageSize: 50,
						hasMore: true
					},
					isLoading: false,
					isFetching: false,
					isError: false
				}
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/containers/LlamaAI/hooks/useEntityQuestions', () => ({
	useEntityQuestions: () => ({ data: null, isFetching: false })
}))

vi.mock('../Filters', () => ({
	YieldFiltersV2: (props: { prepareCsv?: () => Promise<{ filename: string; rows: unknown[][] }> }) => {
		captured.prepareCsv = props.prepareCsv ?? null
		return <div data-testid="yield-filters" />
	}
}))

vi.mock('../Tables/Pools', () => ({
	YieldsPoolsTable: () => <div data-testid="yield-pools-table" />,
	PaginatedYieldsPoolTable: () => <div data-testid="paginated-yield-pools-table" />
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

const expectedHeaders = [
	'Pool',
	'Project',
	'Chain',
	'TVL',
	'APY',
	'APY Base',
	'APY Reward',
	'Change 1d',
	'Change 7d',
	'Outlook',
	'Confidence',
	'Category',
	'IL 7d',
	'APY Base 7d',
	'APY Net 7d',
	'APY Mean 30d',
	'Volume 1d',
	'Volume 7d',
	'APY Base Inception',
	'APY Including LSD APY',
	'APY Base Including LSD APY',
	'APY Base Borrow',
	'APY Reward Borrow',
	'APY Borrow',
	'Total Supply USD',
	'Total Borrow USD',
	'Total Available USD',
	'Pool Meta',
	'APY Median 30d',
	'APY Std Dev 30d',
	'CV 30d',
	'Holder Count',
	'Holders Avg Position USD',
	'Top 10 %',
	'Holder Change 7d',
	'Holder Change 30d'
]

describe('YieldPage CSV export', () => {
	beforeEach(() => {
		captured.prepareCsv = null
		fetchJsonMock.mockReset()
		poolPageQueryState.isError = false
		routerState.pathname = '/yields'
		routerState.query = {}
	})

	it('uses the full currently filtered row set in legacy mode, not only visible, virtualized, or paginated rows', async () => {
		const includedPools = [
			pool(0, {
				apyBaseBorrow: -1,
				apyRewardBorrow: 0.25,
				apyBorrow: -0.75,
				totalSupplyUsd: 10_000,
				totalBorrowUsd: 4_000,
				totalAvailableUsd: 6_000,
				poolMeta: 'v3'
			}),
			...Array.from({ length: 59 }, (_, index) => pool(index + 1))
		]
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

		const csv = await prepareCsv()
		const poolNames = csv.rows.slice(1).map((row) => row[0])
		const enrichedRow = Object.fromEntries(expectedHeaders.map((header, index) => [header, csv.rows[1][index]]))

		expect(csv.filename).toBe('yields')
		expect(csv.rows[0]).toEqual(expectedHeaders)
		expect(poolNames).toEqual(includedPools.map((includedPool) => includedPool.symbol))
		expect(poolNames).not.toContain('ZERO-USDC')
		expect(enrichedRow).toMatchObject({
			'APY Base Borrow': -1,
			'APY Reward Borrow': 0.25,
			'APY Borrow': -0.75,
			'Total Supply USD': 10_000,
			'Total Borrow USD': 4_000,
			'Total Available USD': 6_000,
			'Pool Meta': 'v3',
			'APY Median 30d': 4.4,
			'APY Std Dev 30d': 0.9,
			'CV 30d': 0.2,
			'Holder Count': 10,
			'Holders Avg Position USD': 100,
			'Top 10 %': 80,
			'Holder Change 7d': 2,
			'Holder Change 30d': 3
		})
	})

	it('uses a full server-filtered CSV export in server pagination mode', async () => {
		const csvPools = Array.from({ length: 60 }, (_, index) => pool(index))
		fetchJsonMock.mockResolvedValue({
			rows: csvPools.map((p) => ({
				id: p.pool,
				pool: p.symbol,
				configID: p.pool,
				projectslug: p.project,
				project: p.projectName,
				chains: [p.chain],
				tvl: p.tvlUsd,
				apy: p.apy,
				apyBase: p.apyBase,
				apyReward: p.apyReward,
				rewardTokensSymbols: [],
				rewards: [],
				change1d: null,
				change7d: null,
				outlook: 'Stable/Up',
				confidence: 3,
				url: '',
				category: p.category
			})),
			total: 60,
			page: 1,
			pageSize: 60,
			hasMore: false
		})

		renderToStaticMarkup(
			<YieldPage
				serverPagination
				projectList={['Test Project']}
				chainList={['Ethereum']}
				categoryList={['Dexes']}
				tokens={[]}
				tokenSymbolsList={[]}
				evmChains={[]}
				entityQuestions={[]}
			/>
		)

		const prepareCsv = captured.prepareCsv
		if (!prepareCsv) throw new Error('YieldFiltersV2 did not receive a prepareCsv callback')

		const csv = await prepareCsv()
		const poolNames = csv.rows.slice(1).map((row) => row[0])

		expect(fetchJsonMock).toHaveBeenCalledWith('/api/datasets/yields/pools?view=main&page=1&pageSize=all')
		expect(poolNames).toHaveLength(60)
		expect(poolNames).toEqual(csvPools.map((includedPool) => includedPool.symbol))
		expect(Object.fromEntries(expectedHeaders.map((header, index) => [header, csv.rows[1][index]]))).toMatchObject({
			'APY Median 30d': 4.4,
			'APY Std Dev 30d': 0.9,
			'CV 30d': 0.2,
			'Holder Count': 10
		})
	})

	it('uses the route-specific server API for full CSV export when provided', async () => {
		const csvPools = Array.from({ length: 12 }, (_, index) => pool(index))
		fetchJsonMock.mockResolvedValue({
			rows: csvPools.map((p) => ({
				id: p.pool,
				pool: p.symbol,
				configID: p.pool,
				projectslug: p.project,
				project: p.projectName,
				chains: [p.chain],
				tvl: p.tvlUsd,
				apy: p.apy,
				apyBase: p.apyBase,
				apyReward: p.apyReward,
				rewardTokensSymbols: [],
				rewards: [],
				change1d: null,
				change7d: null,
				outlook: 'Stable/Up',
				confidence: 3,
				url: '',
				category: p.category
			})),
			total: 12,
			page: 1,
			pageSize: 12,
			hasMore: false
		})
		routerState.pathname = '/yields/halal'
		routerState.query = { page: '2', pageSize: '10', token: 'USDC' }

		renderToStaticMarkup(
			<YieldPage
				serverPagination
				serverApi="/api/datasets/yields/halal"
				projectList={['Test Project']}
				chainList={['Ethereum']}
				categoryList={['Dexes']}
				tokens={[]}
				tokenSymbolsList={[]}
				evmChains={[]}
				entityQuestions={[]}
			/>
		)

		const prepareCsv = captured.prepareCsv
		if (!prepareCsv) throw new Error('YieldFiltersV2 did not receive a prepareCsv callback')

		const csv = await prepareCsv()

		expect(fetchJsonMock).toHaveBeenCalledWith('/api/datasets/yields/halal?page=1&pageSize=all&token=USDC&view=unknown')
		expect(csv.rows.slice(1).map((row) => row[0])).toEqual(csvPools.map((includedPool) => includedPool.symbol))
	})

	it('shows a server query error separately from empty filtered results', () => {
		poolPageQueryState.isError = true

		const html = renderToStaticMarkup(
			<YieldPage
				serverPagination
				projectList={['Test Project']}
				chainList={['Ethereum']}
				categoryList={['Dexes']}
				tokens={[]}
				tokenSymbolsList={[]}
				evmChains={[]}
				entityQuestions={[]}
			/>
		)

		expect(html).toContain('load pools.')
		expect(html).not.toContain("Couldn't find any pools for these filters")
	})
})
