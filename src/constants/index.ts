// Base environment/config
const API_KEY = process.env.API_KEY
export const COINGECKO_KEY = process.env.CG_KEY
export const SEARCH_API_TOKEN = process.env.NEXT_PUBLIC_SEARCH_API_TOKEN
export const SKIP_BUILD_STATIC_GENERATION = !['false', '0'].includes(process.env.SKIP_BUILD_STATIC_GENERATION)
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

// Base servers
export const AUTH_SERVER = process.env.NEXT_PUBLIC_AUTH_SERVER_URL ?? 'https://auth.llama.fi'
export const CACHE_SERVER = 'https://fe-cache.llama.fi'
export const DATASETS_SERVER_URL = API_KEY
	? `https://pro-api.llama.fi/${API_KEY}/datasets`
	: 'https://defillama-datasets.llama.fi'
export const SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/api` : 'https://api.llama.fi'
export const V2_SERVER_URL = `${SERVER_URL}/v2`

// Product/domain server roots
export const BRIDGES_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/bridges` : 'https://bridges.llama.fi'
export const COINS_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/coins` : 'https://coins.llama.fi'
export const EQUITIES_SERVER_URL = API_KEY
	? `https://pro-api.llama.fi/${API_KEY}/equities/v1`
	: 'https://api.llama.fi/equities/v1'
export const ETF_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/etfs` : 'https://etfs.llama.fi'
export const FDV_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/fdv` : 'https://fdv-server.llama.fi'
export const NFT_SERVER_URL = 'https://nft.llama.fi'
export const RWA_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/rwa` : 'https://api.llama.fi/rwa'
export const STABLECOINS_SERVER_URL = API_KEY
	? `https://pro-api.llama.fi/${API_KEY}/stablecoins`
	: 'https://stablecoins.llama.fi'
export const TRADFI_API = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/dat` : 'https://api.llama.fi/dat'
export const YIELDS_SERVER_URL = API_KEY ? `https://pro-api.llama.fi/${API_KEY}/yields` : 'https://yields.llama.fi'

// Core llama APIs
export const CONFIG_API = `${SERVER_URL}/config`
export const DIMENSIONS_OVERVIEW_API = `${SERVER_URL}/overview`
export const DIMENSIONS_SUMMARY_API = `${SERVER_URL}/summary`

// Protocol config
export const getProtocolFEConfig = (id: string) => `${SERVER_URL}/config/smol/protocol-${id}.json`.replace('#', '-')

// User metrics
export const USER_METRICS_PROTOCOL_API = 'https://6tklng2o7b.execute-api.eu-central-1.amazonaws.com/prod/stats'
export const USER_METRICS_CHAIN_API = 'https://users.llama.fi/chain'
export const USER_METRICS_CHAIN_API_BY_DATE = 'https://6tklng2o7b.execute-api.eu-central-1.amazonaws.com/prod/chain'
export const USER_METRICS_ALL_API = 'https://users.llama.fi/all'

// Protocol/market data
export const TOKEN_LIQUIDITY_API = `${SERVER_URL}/historicalLiquidity`
export const RAISES_API = `${SERVER_URL}/raises`
export const CEXS_API = `${SERVER_URL}/cexs`
export const HACKS_API = `${SERVER_URL}/hacks`
export const CG_TOKEN_API =
	'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=<PLACEHOLDER>'

// Icons
export const ICONS_NFT_CDN = 'https://nft-icons.llamao.fi/icons'

// Social
export const TWITTER_POSTS_API = `${DATASETS_SERVER_URL}/dev-metrics/twitter-files`
export const TWITTER_POSTS_API_V2 = `${SERVER_URL}/twitter/user`

// Coins
export const COINS_PRICES_API = `${COINS_SERVER_URL}/prices`
export const COINS_CHART_API = `${COINS_SERVER_URL}/chart`
export const COINS_MCAPS_API = 'https://coins.llama.fi/mcaps' // pro api does not support this endpoint

// FDV/Category
export const CATEGORY_PERFORMANCE_API = `${FDV_SERVER_URL}/performance`
export const CATEGORY_COIN_PRICES_API = `${FDV_SERVER_URL}/prices`
export const CATEGORY_INFO_API = `${FDV_SERVER_URL}/info`
export const COINS_INFO_API = `${FDV_SERVER_URL}/coinInfo`

// Datasets
export const LIQUIDITY_API = `${DATASETS_SERVER_URL}/liquidity.json`

// RWA
export const RWA_ACTIVE_TVLS_API = `${RWA_SERVER_URL}/current?z=0`
export const RWA_STATS_API = `${RWA_SERVER_URL}/stats?z=0`
export const RWA_ID_MAP_API = `${RWA_SERVER_URL}/id-map?z=0`
export const RWA_LIST_API = `${RWA_SERVER_URL}/list?z=0`
export const RWA_ASSET_DATA_API = `${RWA_SERVER_URL}/rwa`
export const RWA_CHART_API = `${RWA_SERVER_URL}/chart`

// Yields APIs
export const YIELD_CHAIN_API = `${SERVER_URL}/chains`
export const YIELD_CHART_API = `${YIELDS_SERVER_URL}/chart`
export const YIELD_CHART_LEND_BORROW_API = `${YIELDS_SERVER_URL}/chartLendBorrow`
export const YIELD_CONFIG_API = `${SERVER_URL}/config/yields`
export const YIELD_CONFIG_POOL_API = `${YIELDS_SERVER_URL}/configPool`
export const YIELD_LEND_BORROW_API = `${YIELDS_SERVER_URL}/lendBorrow`
export const YIELD_MEDIAN_API = `${YIELDS_SERVER_URL}/median`
export const YIELD_PERPS_API = `${YIELDS_SERVER_URL}/perps`
export const YIELD_POOLS_API = `${YIELDS_SERVER_URL}/pools`
export const YIELD_POOLS_LAMBDA_API = `${YIELDS_SERVER_URL}/poolsEnriched`
export const YIELD_PROJECT_MEDIAN_API = `${YIELDS_SERVER_URL}/medianProject`
export const YIELD_TOKEN_CATEGORIES_API = 'https://ask.llama.fi/token-categories/yields'
export const YIELD_URL_API = `${YIELDS_SERVER_URL}/url`
export const YIELD_VOLATILITY_API = '/api/datasets/volatility'

// Dataset/static assets
export const ICONS_CDN = 'https://icons.llamao.fi/icons'
export const RWA_STATS_API_OLD = 'https://api.llama.fi/rwa/stats'
export const TOTAL_TRACKED_BY_METRIC_API = 'https://api.llama.fi/config/smol/appMetadata-totalTrackedByMetric.json'

// External services
export const MCP_SERVER = 'https://mcp.llama.fi'
export const POCKETBASE_URL = 'https://pb.llama.fi'
export const SEARCH_API_URL = 'https://search-core.defillama.com/multi-search'

const removedCategoriesFromChainTvl = [
	'Chain',
	'CEX',
	'Infrastructure',
	'Staking Pool',
	'RWA',
	'Basis Trading',
	'CeDeFi',
	'Bridge',
	'Canonical Bridge',
	'Farm',
	'Yield Aggregator',
	'Yield',
	'Liquidity Manager',
	'Onchain Capital Allocator',
	'Risk Curators',
	'Treasury Manager',
	'Anchor BTC',
	'CDP Manager',
	'Restaked BTC',
	'RWA Lending',
	'RWA'
]

export const oracleProtocols = {
	Chainlink: 'Chainlink',
	Pyth: 'Pyth',
	Api3: 'Api3',
	'RedStone Oracles': 'RedStone'
}

export const removedCategoriesFromChainTvlSet = new Set(removedCategoriesFromChainTvl)

export const REV_PROTOCOLS = {
	ethereum: ['flashbots', 'eden-relay'],
	solana: ['jito-mev-tips', 'bloxroute'],
	arbitrum: ['arbitrum-timeboost'],
	polygon: ['fastlane'],
	bsc: ['bloxroute']
} as const

export const ZERO_FEE_PERPS = new Set(['Lighter Perps', 'Paradex Perps'])

export const categoryRoutesOutsideProtocolsSet = new Set(['rwa'])

export const getCategoryRoute = (categorySlug: string) =>
	categoryRoutesOutsideProtocolsSet.has(categorySlug) ? `/${categorySlug}` : `/protocols/${categorySlug}`
