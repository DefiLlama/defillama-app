import type { YieldView } from '../types'

export function getYieldViewFromPathname(pathname: string): YieldView {
	switch (pathname) {
		case '/yields':
			return 'main'
		case '/yields/stablecoins':
			return 'stablecoins'
		case '/yields/overview':
			return 'overview'
		case '/borrow':
			return 'borrow'
		case '/borrow/advanced':
			return 'borrowAdvanced'
		case '/yields/loop':
			return 'loop'
		case '/yields/strategy':
			return 'strategy'
		case '/yields/strategy-long-short':
			return 'strategyLongShort'
		case '/yields/watchlist':
			return 'watchlist'
		case '/yields/projects':
			return 'projects'
		default:
			return 'unknown'
	}
}
