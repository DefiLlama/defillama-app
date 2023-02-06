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
export const PROTOCOLS_API = 'https://api.llama.fi/lite/protocols2'
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

export const NFT_COLLECTION_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/collection'
export const NFT_COLLECTIONS_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/collections'
export const NFT_CHART_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/chart'
export const NFT_CHAINS_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/chains'
export const NFT_MARKETPLACES_API = 'https://ybrjmu6r60.execute-api.eu-west-2.amazonaws.com/prod/marketplaces'
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

export const YIELD_POOLS_API = 'https://yields.llama.fi/pools'
export const YIELD_POOLS_LAMBDA_API = 'https://yields.llama.fi/poolsEnriched'
export const YIELD_CHART_API = 'https://yields.llama.fi/chart'
export const YIELD_CONFIG_API = 'https://api.llama.fi/config/yields?a=1'
export const YIELD_MEDIAN_API = 'https://yields.llama.fi/median'
export const YIELD_URL_API = 'https://yields.llama.fi/url'
export const YIELD_CHAIN_API = 'https://api.llama.fi/chains'
export const YIELD_LEND_BORROW_API = 'https://yields.llama.fi/lendBorrow'
export const YIELD_CHART_LEND_BORROW_API = 'https://yields.llama.fi/chartLendBorrow'
export const YIELD_CONFIG_POOL_API = 'https://yields.llama.fi/configPool'
export const YIELD_PERPS_API = 'https://yields.llama.fi/perps'

export const LIQUIDATIONS_HISTORICAL_R2_PATH = DATASETS_R2_PATH + '/liqs'

export const CHAINS_API = 'https://api.llama.fi/chains'

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

export const RAISES_API = `https://api.llama.fi/raises`

export const CG_TOKEN_API =
	'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=<PLACEHOLDER>'

export const ICONS_CDN = 'https://icons.llamao.fi/icons'
export const ICONS_PALETTE_CDN = 'https://icons.llamao.fi/palette'

export const COINS_API = 'https://coins.llama.fi/prices'
