export const timeframeOptions = {
	// WEEK: '1 week',
	MONTH: '1 month',
	// THREE_MONTHS: '3 months',
	YEAR: '1 year',
	ALL_TIME: 'All time'
}

// API endpoints
export const DATASETS_S3_PATH = 'https://defillama-datasets.s3.eu-central-1.amazonaws.com'
export const DATASETS_R2_PATH = 'https://defillama-datasets.llama.fi'

export const CHART_API = 'https://api.llama.fi/lite/charts'
export const PROTOCOLS_API = 'https://api.llama.fi/lite/protocols2?b=2'
export const PROTOCOL_API = 'https://api.llama.fi/updatedProtocol'
export const CONFIG_API = 'https://api.llama.fi/config'
export const HOURLY_PROTOCOL_API = 'https://api.llama.fi/hourly'
export const LANGS_API = 'https://api.llama.fi/langs'
export const ORACLE_API = 'https://api.llama.fi/oracles'
export const FORK_API = 'https://api.llama.fi/forks'
export const CATEGORY_API = 'https://api.llama.fi/categories'
export const PROTOCOLS_BY_TOKEN_API = 'https://api.llama.fi/tokenProtocols'
export const PROTOCOL_TREASURY_API = 'https://api.llama.fi/treasury'
export const PROTOCOLS_TREASURY = 'https://api.llama.fi/treasuries'
export const PROTOCOL_EMISSIONS_API = 'https://api.llama.fi/emissions'
export const PROTOCOL_EMISSIONS_LIST_API = 'https://defillama-datasets.llama.fi/emissionsProtocolsList'
export const PROTOCOL_EMISSION_API = 'https://api.llama.fi/emission'
export const EMISSION_BREAKDOWN_API = 'https://api.llama.fi/emissionsBreakdown'

export const GOVERNANCE_SNAPSHOT_API = 'https://defillama-datasets.llama.fi/governance-cache/overview/snapshot.json'
export const PROTOCOL_GOVERNANCE_SNAPSHOT_API = 'https://defillama-datasets.llama.fi/governance-cache/snapshot'
export const GOVERNANCE_COMPOUND_API = 'https://defillama-datasets.llama.fi/governance-cache/overview/compound.json'
export const PROTOCOL_GOVERNANCE_COMPOUND_API = 'https://defillama-datasets.llama.fi/governance-cache/compound'
export const GOVERNANCE_TALLY_API = 'https://defillama-datasets.llama.fi/governance-cache/overview/tally.json'
export const PROTOCOL_GOVERNANCE_TALLY_API = 'https://defillama-datasets.llama.fi/governance-cache/tally'

export const ACTIVE_USERS_API = 'https://api.llama.fi/activeUsers'
export const PROTOCOL_ACTIVE_USERS_API = 'https://api.llama.fi/userData/users'
export const PROTOCOL_TRANSACTIONS_API = 'https://api.llama.fi/userData/txs'
export const PROTOCOL_GAS_USED_API = 'https://api.llama.fi/userData/gas'
export const PROTOCOL_NEW_USERS_API = 'https://api.llama.fi/userData/newusers'

export const PROTOCOLS_EXPENSES_API =
	'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json'

export const NFT_COLLECTIONS_API = 'https://nft.llama.fi/collections'
export const NFT_VOLUME_API = 'https://nft.llama.fi/volume'
export const NFT_COLLECTION_API = 'https://nft.llama.fi/collection'
export const NFT_COLLECTION_STATS_API = 'https://nft.llama.fi/stats'
export const NFT_COLLECTION_SALES_API = 'https://nft.llama.fi/sales'
export const NFT_COLLECTION_FLOOR_HISTORY_API = 'https://nft.llama.fi/floorHistory'
export const NFT_COLLECTIONS_ORDERBOOK_API = 'https://nft.llama.fi/orderbook'
export const NFT_MARKETPLACES_STATS_API = 'https://nft.llama.fi/exchangeStats'
export const NFT_MARKETPLACES_VOLUME_API = 'https://nft.llama.fi/exchangeVolume'
export const NFT_ROYALTIES_API = 'https://nft.llama.fi/royalties'
export const NFT_ROYALTY_HISTORY_API = 'https://nft.llama.fi/royaltyHistory'
export const NFT_ROYALTY_API = 'https://nft.llama.fi/royalty'

export const NFT_CHART_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/chart'
export const NFT_CHAINS_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/chains'
export const NFT_SEARCH_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/search'

export const PEGGEDS_API = 'https://stablecoins.llama.fi/stablecoins'
export const PEGGED_API = 'https://stablecoins.llama.fi/stablecoin'
export const PEGGEDCHART_API = 'https://stablecoins.llama.fi/stablecoincharts'
export const PEGGEDCONFIG_API = 'https://stablecoins.llama.fi/config'
export const PEGGEDDOMINANCE_API = 'https://stablecoins.llama.fi/stablecoindominance'
export const PEGGEDPRICES_API = 'https://stablecoins.llama.fi/stablecoinprices'
export const PEGGEDRATES_API = 'https://stablecoins.llama.fi/rates'

export const BRIDGEDAYSTATS_API = 'https://bridges.llama.fi/bridgedaystats'
export const BRIDGES_API = 'https://bridges.llama.fi/bridges'
export const BRIDGEVOLUME_API = 'https://bridges.llama.fi/bridgevolume'
export const BRIDGELARGETX_API = 'https://bridges.llama.fi/largetransactions'
export const BRIDGETX_API = 'https://bridges.llama.fi/transactions'
export const BRIDGEINFLOWS_API = 'https://api.llama.fi/chain-assets/historical-flows'

export const YIELD_POOLS_API = 'https://yields.llama.fi/pools'
export const YIELD_POOLS_LAMBDA_API = 'https://yields.llama.fi/poolsEnriched'
export const YIELD_CHART_API = 'https://yields.llama.fi/chart'
export const YIELD_CONFIG_API = 'https://api.llama.fi/config/yields'
export const YIELD_MEDIAN_API = 'https://yields.llama.fi/median'
export const YIELD_URL_API = 'https://yields.llama.fi/url'
export const YIELD_CHAIN_API = 'https://api.llama.fi/chains'
export const YIELD_LEND_BORROW_API = 'https://yields.llama.fi/lendBorrow'
export const YIELD_CHART_LEND_BORROW_API = 'https://yields.llama.fi/chartLendBorrow'
export const YIELD_CONFIG_POOL_API = 'https://yields.llama.fi/configPool'
export const YIELD_PERPS_API = 'https://yields.llama.fi/perps'
export const YIELD_PROJECT_MEDIAN_API = 'https://yields.llama.fi/medianProject'

export const LSD_RATES_API = 'https://yields.llama.fi/lsdRates'
export const ETF_OVERVIEW_API = 'https://etfs.llama.fi/overview'
export const ETF_HISTORY_API = 'https://etfs.llama.fi/history'

export const LIQUIDATIONS_HISTORICAL_R2_PATH = DATASETS_R2_PATH + '/liqs'

export const CHAINS_API = 'https://api.llama.fi/chains'
export const CHAINS_ASSETS = 'https://api.llama.fi/chain-assets/chains'
export const CHAINS_API_V2 = 'https://api.llama.fi/chains2'
export const CHAIN_ASSETS_FLOWS = 'https://api.llama.fi/chain-assets/flows'
export const CHAINS_ASSETS_CHART = 'https://api.llama.fi/chain-assets/chart'

export const DEXS_API = 'https://api.llama.fi/dexs'
export const DEX_BASE_API = 'https://api.llama.fi/dex'

export const ADAPTORS_BASE_API = 'https://api.llama.fi/overview'
export const BASE_API = 'https://api.llama.fi/'
export const ADAPTORS_SUMMARY_BASE_API = 'https://api.llama.fi/summary'

export const FEES_BASE_API = 'https://fees.llama.fi/fees'

export const USER_METRICS_PROTOCOL_API = 'https://6tklng2o7b.execute-api.eu-central-1.amazonaws.com/prod/stats'
export const USER_METRICS_CHAIN_API = 'https://users.llama.fi/chain'
export const USER_METRICS_CHAIN_API_BY_DATE = 'https://6tklng2o7b.execute-api.eu-central-1.amazonaws.com/prod/chain'
export const USER_METRICS_ALL_API = 'https://users.llama.fi/all'

export const TOKEN_LIQUIDITY_API = 'https://api.llama.fi/historicalLiquidity'

export const RAISES_API = `https://api.llama.fi/raises`

export const CG_TOKEN_API =
	'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=<PLACEHOLDER>'

export const ICONS_CDN = 'https://icons.llamao.fi/icons'
export const ICONS_NFT_CDN = 'https://nft-icons.llamao.fi/icons'
export const ICONS_PALETTE_CDN = 'https://icons.llamao.fi/palette'
// export const ICONS_PALETTE_CDN = 'https://palette.llamao.fi/palette'

export const COINS_API = 'https://coins.llama.fi/prices'
export const PRICE_CHART_API = 'https://coins.llama.fi/chart'

export const TWITTER_POSTS_API = 'https://defillama-datasets.llama.fi/dev-metrics/twitter-files'
export const TWITTER_POSTS_API_V2 = 'https://api.llama.fi/twitter/user'

export const HACKS_API = 'https://api.llama.fi/hacks'

export const DEV_METRICS_API = 'https://defillama-datasets.llama.fi/dev-metrics/github'

export const MCAPS_API = 'https://coins.llama.fi/mcaps'

export const CACHE_SERVER = 'https://fe-cache.llama.fi'

export const scams = [
	'SyncDEX Finance',
	'Avatr',
	'SatoshiCoreSwap',
	'Opankeswap',
	'PolyLend',
	'Syncus',
	'Drachma Exchange',
	'StableDoin',
	'CroLend Finance',
	'Agora',
	'MinerSwap',
	'Mosquitos Finance',
	'SatoshiCoreSwap',
	'Swaprum',
	'Cells Finance',
	'SkyDex',
	'Avault',
	'Tegro Finance',
	'Lendora Protocol',
	'MantaSwap',
	'Onchain Trade',
	'Venuswap',
	'Scroll Swap',
	'StakeSteak',
	'Glori Finance',
	'ZebraDAO',
	'Leaper Finance',
	'ShibaNova',
	'DaikoDEX'
]

export const removedCategories = ['Basis Trading', 'RWA', 'Infrastructure', 'Staking Pool']
