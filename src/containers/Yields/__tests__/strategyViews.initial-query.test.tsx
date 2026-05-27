import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LongShortStrategyView from '../views/LongShortStrategyView'
import StrategyFinderView from '../views/StrategyFinderView'

const { captures, routerState } = vi.hoisted(() => ({
	captures: [] as Array<{ endpoint: string; queryString: string | null }>,
	routerState: {
		pathname: '/yields/strategy',
		query: {} as Record<string, string | string[] | undefined>
	}
}))

vi.mock('next/router', () => ({
	useRouter: () => routerState
}))

vi.mock('../queries.client', () => ({
	useYieldsPaginatedTable: (endpoint: string, queryString: string | null) => {
		captures.push({ endpoint, queryString })
		return {
			data: undefined,
			isLoading: false,
			isFetching: false,
			isError: false
		}
	}
}))

vi.mock('../Filters', () => ({
	YieldFiltersV2: () => <div data-testid="yield-filters" />
}))

vi.mock('../Tables/Strategy', () => ({
	PaginatedYieldsStrategyTable: () => <div data-testid="strategy-table" />
}))

vi.mock('../Tables/StrategyFR', () => ({
	PaginatedYieldsStrategyTableFR: () => <div data-testid="long-short-table" />
}))

const commonProps = {
	projectList: ['Aave'],
	chainList: ['Ethereum'],
	categoryList: ['Lending'],
	evmChains: ['Ethereum']
}

describe('strategy finder initial rows requests', () => {
	beforeEach(() => {
		captures.length = 0
		routerState.pathname = '/yields/strategy'
		routerState.query = {}
	})

	it('does not request strategy rows before a lend token is selected', () => {
		const html = renderToStaticMarkup(
			<StrategyFinderView {...commonProps} lendingProtocols={['Aave']} farmProtocols={['Curve']} searchData={[]} />
		)

		expect(captures).toEqual([{ endpoint: '/api/datasets/yields/strategy', queryString: null }])
		expect(html).toContain('To start just select a collateral token above.')
		expect(html).not.toContain('Loading strategies...')
	})

	it('requests strategy rows once a lend token is selected', () => {
		routerState.query = { lend: 'ETH' }

		renderToStaticMarkup(
			<StrategyFinderView {...commonProps} lendingProtocols={['Aave']} farmProtocols={['Curve']} searchData={[]} />
		)

		expect(captures[0]).toMatchObject({ endpoint: '/api/datasets/yields/strategy' })
		expect(captures[0]?.queryString).toContain('lend=ETH')
	})

	it('does not request long-short rows before a token is selected', () => {
		routerState.pathname = '/yields/strategy-long-short'

		const html = renderToStaticMarkup(<LongShortStrategyView {...commonProps} tokens={[]} />)

		expect(captures).toEqual([{ endpoint: '/api/datasets/yields/strategy-long-short', queryString: null }])
		expect(html).toContain('To start just select a token above.')
		expect(html).not.toContain('Loading strategies...')
	})

	it('requests long-short rows once a token is selected', () => {
		routerState.pathname = '/yields/strategy-long-short'
		routerState.query = { token: 'BTC' }

		renderToStaticMarkup(<LongShortStrategyView {...commonProps} tokens={[]} />)

		expect(captures[0]).toMatchObject({ endpoint: '/api/datasets/yields/strategy-long-short' })
		expect(captures[0]?.queryString).toContain('token=BTC')
		expect(captures[0]?.queryString).toContain('sortBy=openInterest')
		expect(captures[0]?.queryString).toContain('sortDesc=true')
	})
})
