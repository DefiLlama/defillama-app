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
	'token-usage/[symbol]',
	'yields/volatility'
] as const

export const dynamicApiRoutePaths = [
	'aave/graphql',
	'adapter-metrics/bridge-aggregators',
	'adapter-metrics/dex-aggregators',
	'adapter-metrics/dexs',
	'adapter-metrics/earnings',
	'adapter-metrics/fees',
	'adapter-metrics/holders-revenue',
	'adapter-metrics/options',
	'adapter-metrics/perps',
	'adapter-metrics/revenue',
	'cache/chain/[chain]',
	'calendar/[token]',
	'cexs',
	'cexs/analytics',
	'chains',
	'dashboard/[dashboardId]/stream',
	'emission/[protocol]',
	'maple/graphql',
	'roundupMarkdown',
	'sonic/burn-stream',
	'tokens/search'
] as const

export const allApiRoutePaths = [
	'aave/graphql',
	'adapter-metrics/breakdowns/[metric]',
	'adapter-metrics/breakdowns/by-chain/[metric]',
	'adapter-metrics/bridge-aggregators',
	'adapter-metrics/dex-aggregators',
	'adapter-metrics/dexs',
	'adapter-metrics/earnings',
	'adapter-metrics/fees',
	'adapter-metrics/holders-revenue',
	'adapter-metrics/options',
	'adapter-metrics/perps',
	'adapter-metrics/revenue',
	'berachain/blockchain',
	'berachain/revenue',
	'bridges/transactions/[id]',
	'cache/chain/[chain]',
	'calendar/[token]',
	'cex/inflows',
	'cex/inflows/batch',
	'cexs',
	'cexs/analytics',
	'chain-icon',
	'chains/breakdowns/by-chain/[metric]',
	'chains',
	'chains/charts',
	'dashboard/[dashboardId]/stream',
	'dashboard/fetch',
	'dashboard/pf-ps-chart',
	'dashboard/pf-ps-protocols',
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
	'protocols/charts',
	'protocols/breakdowns/by-chain/tvl',
	'protocols/breakdowns/tvl',
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
	'stablecoins/breakdowns/by-chain',
	'stablecoins/volume-chart',
	'token-liquidations/[symbol]',
	'tokens/charts/coingecko/[geckoId]',
	'token-unlocks/[protocol]',
	'token-usage/[symbol]',
	'tokens/search',
	'unified-table/[strategy]',
	'yields',
	'yields/borrow',
	'yields/borrow-advanced',
	'yields/halal',
	'yields/holders',
	'yields/holders/[configID]',
	'yields/lend-borrow/charts/[configID]',
	'yields/loop',
	'yields/pools',
	'yields/strategy',
	'yields/strategy-long-short',
	'yields/token-borrow-routes',
	'yields/volatility'
] as const

const privateApiRoutePathSet = new Set<string>(privateApiRoutePaths)
const dynamicApiRoutePathSet = new Set<string>(dynamicApiRoutePaths)

const routeMethodOverrides: Partial<Record<ApiRoutePath, readonly ApiRouteMethod[]>> = {
	'aave/graphql': ['POST'],
	'cex/inflows/batch': ['POST'],
	'maple/graphql': ['POST'],
	'protocols/charts': ['GET', 'POST'],
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
