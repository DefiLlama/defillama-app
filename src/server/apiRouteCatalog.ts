export type ApiRouteKind = 'public' | 'private' | 'dynamic'
export type ApiRouteMethod = 'ANY' | 'GET' | 'POST'
export type ApiRouteCachePolicy = 'shared-cacheable' | 'private' | 'dynamic'

export type ApiRoutePath = (typeof allApiRoutePaths)[number]

export interface ApiRouteCatalogEntry {
	kind: ApiRouteKind
	path: ApiRoutePath
	canonicalPath: `/api/${ApiRouteKind}/${ApiRoutePath}`
	methods: readonly ApiRouteMethod[]
	cachePolicy?: ApiRouteCachePolicy
}

export const privateApiRoutePaths = [
	'cex/inflows',
	'cex/inflows/batch',
	'dashboard/fetch',
	'datasets/volatility',
	'downloads/[dataset]',
	'downloads/chart/[dataset]',
	'downloads/chart-breakdown/[slug]',
	'liquidations',
	'liquidations/[protocol]',
	'liquidations/[protocol]/[chain]',
	'research/articles/[id]/publish',
	'research/articles/[id]/unpublish',
	'research/revalidate-landing',
	'revalidate-instances',
	'token-liquidations/[symbol]',
	'token-unlocks/[protocol]',
	'token-usage/[symbol]'
] as const

export const dynamicApiRoutePaths = [
	'aave/graphql',
	'cache/chain/[chain]',
	'calendar/[token]',
	'dashboard/[dashboardId]/stream',
	'datasets/aggregators',
	'datasets/bridge-aggregators',
	'datasets/cex',
	'datasets/cex-analytics',
	'datasets/chains',
	'datasets/dexs',
	'datasets/earnings',
	'datasets/fees',
	'datasets/holders-revenue',
	'datasets/options',
	'datasets/perps',
	'datasets/revenue',
	'emission/[protocol]',
	'maple/graphql',
	'protocols/split/[dataType]',
	'protocols/split/protocol-chain',
	'roundupMarkdown',
	'sonic/burn-stream',
	'tokens/search'
] as const

export const allApiRoutePaths = [
	'aave/graphql',
	'berachain/blockchain',
	'berachain/revenue',
	'bridges/transactions/[id]',
	'cache/chain/[chain]',
	'calendar/[token]',
	'cex/inflows',
	'cex/inflows/batch',
	'chain-icon',
	'charts/chain',
	'charts/coingecko/[geckoId]',
	'charts/protocol',
	'dashboard/[dashboardId]/stream',
	'dashboard/fetch',
	'dashboard/pf-ps-chart',
	'dashboard/pf-ps-protocols',
	'datasets/aggregators',
	'datasets/borrow',
	'datasets/borrow-advanced',
	'datasets/bridge-aggregators',
	'datasets/cex',
	'datasets/cex-analytics',
	'datasets/chains',
	'datasets/chartLendBorrow/[configID]',
	'datasets/dexs',
	'datasets/earnings',
	'datasets/fees',
	'datasets/holders',
	'datasets/holders/[configID]',
	'datasets/holders-revenue',
	'datasets/options',
	'datasets/perps',
	'datasets/revenue',
	'datasets/volatility',
	'datasets/yields',
	'datasets/yields/halal',
	'datasets/yields/loop',
	'datasets/yields/pools',
	'datasets/yields/strategy',
	'datasets/yields/strategy-long-short',
	'datasets/yields-token-borrow-routes',
	'downloads/[dataset]',
	'downloads/chart/[dataset]',
	'downloads/chart-breakdown/[slug]',
	'dune/query/[queryId]',
	'emission/[protocol]',
	'flare/metadata',
	'flare/network',
	'flare/overview',
	'flare/staking',
	'flare/supply',
	'flare/tokenomics',
	'hyperliquid/candles',
	'hyperliquid/hlp-funding',
	'hyperliquid/hlp-open-orders',
	'hyperliquid/hlp-portfolio',
	'hyperliquid/hlp-positions',
	'hyperliquid/l2-book',
	'hyperliquid/perps',
	'hyperliquid/predicted-fundings',
	'hyperliquid/spot',
	'icon-proxy',
	'income-statement',
	'liquidations',
	'liquidations/[protocol]',
	'liquidations/[protocol]/[chain]',
	'maple/graphql',
	'markets/[token]',
	'markets/exchanges/[exchange]',
	'near/ecosystem',
	'near/revenue',
	'odyssey-ecosystem/[tab]',
	'page-data/categories/charts',
	'page-data/chains/charts',
	'page-data/dimension-adapters/chains-chart',
	'protocol-icon',
	'protocols/split/[dataType]',
	'protocols/split/protocol-chain',
	'research/articles/[id]/publish',
	'research/articles/[id]/unpublish',
	'research/entities/preview',
	'research/entities/search',
	'research/revalidate-landing',
	'revalidate-instances',
	'roundupMarkdown',
	'rwa/asset-breakdown',
	'rwa/overview-breakdown',
	'rwa/perps/contract-breakdown',
	'rwa/perps/overview-breakdown',
	'sonic/burn-stream',
	'sonic/ecosystem',
	'sonic/feem',
	'sonic/network-stats',
	'sonic/yields-emissions',
	'spark/distribution-rewards',
	'spark/financials',
	'spark/reports',
	'stablecoins/chart',
	'stablecoins/chart-series',
	'stablecoins/volume-chart',
	'token-liquidations/[symbol]',
	'token-unlocks/[protocol]',
	'token-usage/[symbol]',
	'tokens/search',
	'unified-table/[strategy]'
] as const

const privateApiRoutePathSet = new Set<string>(privateApiRoutePaths)
const dynamicApiRoutePathSet = new Set<string>(dynamicApiRoutePaths)

const routeMethodOverrides: Partial<Record<ApiRoutePath, readonly ApiRouteMethod[]>> = {
	'aave/graphql': ['POST'],
	'cex/inflows/batch': ['POST'],
	'charts/protocol': ['GET', 'POST'],
	'maple/graphql': ['POST'],
	'revalidate-instances': ['POST']
}

const cachePolicyByKind = {
	public: 'shared-cacheable',
	private: 'private',
	dynamic: 'dynamic'
} satisfies Record<ApiRouteKind, ApiRouteCachePolicy>

function getRouteKind(path: ApiRoutePath): ApiRouteKind {
	if (privateApiRoutePathSet.has(path)) return 'private'
	if (dynamicApiRoutePathSet.has(path)) return 'dynamic'
	return 'public'
}

function createCatalogEntry(path: ApiRoutePath): ApiRouteCatalogEntry {
	const kind = getRouteKind(path)

	return {
		kind,
		path,
		canonicalPath: `/api/${kind}/${path}`,
		methods: routeMethodOverrides[path] ?? ['ANY'],
		cachePolicy: cachePolicyByKind[kind]
	}
}

export const apiRouteCatalog = allApiRoutePaths.map(createCatalogEntry)
