// API endpoints
export const SERVER_URL = process.env.SERVER_URL ?? 'https://api.llama.fi'
export const V2_SERVER_URL = process.env.V2_SERVER_URL ?? `${SERVER_URL}/v2`
export const DATASETS_SERVER_URL = process.env.DATASETS_SERVER_URL ?? 'https://defillama-datasets.llama.fi'

export const CHART_API = `${SERVER_URL}/lite/charts`
export const CHAIN_TVL_API = `${V2_SERVER_URL}/chains`
export const PROTOCOLS_API = `${SERVER_URL}/lite/protocols2?b=2`
export const PROTOCOL_API = `${SERVER_URL}/updatedProtocol`
export const PROTOCOL_API_MINI = `${SERVER_URL}/_fe/updatedProtocol-mini`
export const CONFIG_API = `${SERVER_URL}/config`
export const LANGS_API = `${SERVER_URL}/langs`
export const ORACLE_API = `${SERVER_URL}/oracles`
export const FORK_API = `${SERVER_URL}/forks`
export const CATEGORY_API = `${SERVER_URL}/categories`
export const CATEGORY_CHART_API = `${SERVER_URL}/charts/categories`
export const TAGS_CHART_API = `${SERVER_URL}/charts/tags`
export const PROTOCOLS_BY_TOKEN_API = `${SERVER_URL}/tokenProtocols`
export const PROTOCOL_TREASURY_API = `${SERVER_URL}/treasury`

export const PROTOCOL_EMISSIONS_API = `${SERVER_URL}/emissions`
export const PROTOCOL_EMISSIONS_LIST_API = `${DATASETS_SERVER_URL}/emissionsProtocolsList`
export const PROTOCOL_EMISSION_API = `${SERVER_URL}/emission`
export const PROTOCOL_EMISSION_API2 = `${DATASETS_SERVER_URL}/emissions`
export const EMISSION_BREAKDOWN_API = `${SERVER_URL}/emissionsBreakdown`
export const EMISSION_SUPPLY_METRICS = `${DATASETS_SERVER_URL}/emissionsSupplyMetrics`

export const INFLOWS_API = `${SERVER_URL}/inflows`

export const ACTIVE_USERS_API = `${SERVER_URL}/activeUsers`
export const PROTOCOL_ACTIVE_USERS_API = `${SERVER_URL}/userData/users`
export const PROTOCOL_TRANSACTIONS_API = `${SERVER_URL}/userData/txs`
export const PROTOCOL_GAS_USED_API = `${SERVER_URL}/userData/gas`
export const PROTOCOL_NEW_USERS_API = `${SERVER_URL}/userData/newusers`

export const GOVERNANCE_SNAPSHOT_API = `${DATASETS_SERVER_URL}/governance-cache/overview/snapshot.json`
export const PROTOCOL_GOVERNANCE_SNAPSHOT_API = `${DATASETS_SERVER_URL}/governance-cache/snapshot`
export const GOVERNANCE_COMPOUND_API = `${DATASETS_SERVER_URL}/governance-cache/overview/compound.json`
export const PROTOCOL_GOVERNANCE_COMPOUND_API = `${DATASETS_SERVER_URL}/governance-cache/compound`
export const GOVERNANCE_TALLY_API = `${DATASETS_SERVER_URL}/governance-cache/overview/tally.json`
export const PROTOCOL_GOVERNANCE_TALLY_API = `${DATASETS_SERVER_URL}/governance-cache/tally`

export const TOKEN_LIST_API = `${DATASETS_SERVER_URL}/tokenlist/sorted.json`

export const NFT_SERVER_URL = 'https://nft.llama.fi'

const STABLECOINS_SERVER_URL = process.env.STABLECOINS_SERVER_URL ?? 'https://stablecoins.llama.fi'
export const PEGGEDS_API = `${STABLECOINS_SERVER_URL}/stablecoins`
export const PEGGED_API = `${STABLECOINS_SERVER_URL}/stablecoin`
export const PEGGEDCHART_API = `${STABLECOINS_SERVER_URL}/stablecoincharts2`
export const PEGGEDCHART_DOMINANCE_ALL_API = `${STABLECOINS_SERVER_URL}/stablecoincharts2/all-dominance-chain-breakdown`
export const PEGGEDCHART_COINS_RECENT_DATA_API = `${STABLECOINS_SERVER_URL}/stablecoincharts2/recent-protocol-data`
export const PEGGEDCONFIG_API = `${STABLECOINS_SERVER_URL}/config`
export const PEGGEDDOMINANCE_API = `${STABLECOINS_SERVER_URL}/stablecoindominance`
export const PEGGEDPRICES_API = `${STABLECOINS_SERVER_URL}/stablecoinprices`
export const PEGGEDRATES_API = `${STABLECOINS_SERVER_URL}/rates`

const BRIDGES_SERVER_URL = process.env.BRIDGES_SERVER_URL ?? 'https://bridges.llama.fi'
export const BRIDGEDAYSTATS_API = `${BRIDGES_SERVER_URL}/bridgedaystats`
export const BRIDGES_API = `${BRIDGES_SERVER_URL}/bridges`
export const BRIDGEVOLUME_API = `${BRIDGES_SERVER_URL}/bridgevolume`
export const BRIDGEVOLUME_API_SLUG = `${BRIDGES_SERVER_URL}/bridgevolume/slug`
export const BRIDGELARGETX_API = `${BRIDGES_SERVER_URL}/largetransactions`
export const BRIDGETX_API = `${BRIDGES_SERVER_URL}/transactions`

export const NETFLOWS_API = `${BRIDGES_SERVER_URL}/netflows`

export const YIELDS_SERVER_URL = process.env.YIELDS_SERVER_URL ?? 'https://yields.llama.fi'
export const YIELD_POOLS_API = `${YIELDS_SERVER_URL}/pools`
export const YIELD_POOLS_LAMBDA_API = `${YIELDS_SERVER_URL}/poolsEnriched`
export const YIELD_CHART_API = `${YIELDS_SERVER_URL}/chart`
export const YIELD_CONFIG_API = `${SERVER_URL}/config/yields`
export const YIELD_MEDIAN_API = `${YIELDS_SERVER_URL}/median`
export const YIELD_URL_API = `${YIELDS_SERVER_URL}/url`
export const YIELD_CHAIN_API = `${SERVER_URL}/chains`
export const YIELD_LEND_BORROW_API = `${YIELDS_SERVER_URL}/lendBorrow`
export const YIELD_CHART_LEND_BORROW_API = `${YIELDS_SERVER_URL}/chartLendBorrow`
export const YIELD_CONFIG_POOL_API = `${YIELDS_SERVER_URL}/configPool`
export const YIELD_PERPS_API = `${YIELDS_SERVER_URL}/perps`
export const YIELD_PROJECT_MEDIAN_API = `${YIELDS_SERVER_URL}/medianProject`
export const YIELD_VOLATILITY_API = '/api/datasets/volatility'

export const ETF_SERVER_URL = process.env.ETF_SERVER_URL ?? 'https://etfs.llama.fi'

export const LIQUIDATIONS_HISTORICAL_R2_PATH = `${DATASETS_SERVER_URL}/liqs`

export const CHAINS_API = `${SERVER_URL}/chains`
export const CHAINS_API_V2 = `${SERVER_URL}/chains2`

export const DIMENSIONS_OVERVIEW_API = `${SERVER_URL}/overview`
export const DIMENSIONS_SUMMARY_API = `${SERVER_URL}/summary`

export const getProtocolFEConfig = (id: string) => `${SERVER_URL}/config/smol/protocol-${id}.json`.replace('#', '-')

export const USER_METRICS_PROTOCOL_API = 'https://6tklng2o7b.execute-api.eu-central-1.amazonaws.com/prod/stats'
export const USER_METRICS_CHAIN_API = 'https://users.llama.fi/chain'
export const USER_METRICS_CHAIN_API_BY_DATE = 'https://6tklng2o7b.execute-api.eu-central-1.amazonaws.com/prod/chain'
export const USER_METRICS_ALL_API = 'https://users.llama.fi/all'

export const TOKEN_LIQUIDITY_API = `${SERVER_URL}/historicalLiquidity`

export const CG_TOKEN_API =
	'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=<PLACEHOLDER>'

export const ICONS_CDN = 'https://icons.llamao.fi/icons'
export const ICONS_NFT_CDN = 'https://nft-icons.llamao.fi/icons'

export const TWITTER_POSTS_API = `${DATASETS_SERVER_URL}/dev-metrics/twitter-files`
export const TWITTER_POSTS_API_V2 = `${SERVER_URL}/twitter/user`

const COINS_SERVER_URL = process.env.COINS_SERVER_URL ?? 'https://coins.llama.fi'
export const COINS_PRICES_API = `${COINS_SERVER_URL}/prices`
export const COINS_CHART_API = `${COINS_SERVER_URL}/chart`
export const COINS_MCAPS_API = 'https://coins.llama.fi/mcaps' // pro api does not support this endpoint

export const CACHE_SERVER = 'https://fe-cache.llama.fi'

export const FDV_SERVER_URL = process.env.FDV_SERVER_URL ?? 'https://fdv-server.llama.fi'

export const LIQUIDITY_API = `${DATASETS_SERVER_URL}/liquidity.json`

export const AUTH_SERVER = process.env.NEXT_PUBLIC_AUTH_SERVER_URL ?? 'https://auth.llama.fi'
export const POCKETBASE_URL = 'https://pb.llama.fi'
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

export const TOTAL_TRACKED_BY_METRIC_API = 'https://api.llama.fi/config/smol/appMetadata-totalTrackedByMetric.json'
export const RWA_STATS_API_OLD = 'https://api.llama.fi/rwa/stats'

export const TRADFI_API = process.env.TRADFI_API ?? 'https://api.llama.fi/tradfi'

export const RWA_SERVER_URL = process.env.RWA_SERVER_URL ?? 'https://api.llama.fi/rwa'

export const MCP_SERVER = 'https://mcp.llama.fi'
export const YIELD_TOKEN_CATEGORIES_API = 'https://ask.llama.fi/token-categories/yields'
export const SEARCH_API_URL = 'https://search-core.defillama.com/multi-search'
export const SEARCH_API_TOKEN = process.env.NEXT_PUBLIC_SEARCH_API_TOKEN

export const removedCategoriesFromChainTvl = [
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
	'Liquidity manager',
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
