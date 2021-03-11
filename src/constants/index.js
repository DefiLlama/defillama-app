export const FACTORY_ADDRESS = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'

export const BUNDLE_ID = '1'

export const timeframeOptions = {
  WEEK: '1 week',
  MONTH: '1 month',
  // THREE_MONTHS: '3 months',
  // YEAR: '1 year',
  ALL_TIME: 'All time'
}

// token list urls to fetch tokens from - use for warnings on tokens and pairs
export const SUPPORTED_LIST_URLS__NO_ENS = [`${window.location.protocol}//${window.location.host}/tokens.json`]

// hide from overview list
export const OVERVIEW_TOKEN_BLACKLIST = [
  '0x495c7f3a713870f68f8b418b355c085dfdc412c3',
  '0xc3761eb917cd790b30dad99f6cc5b4ff93c4f9ea',
  '0xe31debd7abff90b06bca21010dd860d8701fd901',
  '0xfc989fbb6b3024de5ca0144dc23c18a063942ac1'
]

// pair blacklist
export const PAIR_BLACKLIST = ['0xb6a741f37d6e455ebcc9f17e2c16d0586c3f57a5']

/**
 * For tokens that cause erros on fee calculations
 */
export const FEE_WARNING_TOKENS = ['0xd46ba6d942050d489dbd938a2c909a5d5039a161']

// API endpoints

export const CHART_API = 'https://api.defillama.com/charts'
export const PROTOCOLS_API = 'https://api.defillama.com/protocols'
export const PROTOCOL_API = 'https://api.defillama.com/protocol'

// GlobalData Constants
export const UPDATE = 'UPDATE'
export const UPDATE_TXNS = 'UPDATE_TXNS'
export const UPDATE_CHART = 'UPDATE_CHART'
export const UPDATE_ETH_PRICE = 'UPDATE_ETH_PRICE'
export const ETH_PRICE_KEY = 'ETH_PRICE_KEY'
export const UPDATE_ALL_PAIRS_IN_UNISWAP = 'UPDAUPDATE_ALL_PAIRS_IN_UNISWAPTE_TOP_PAIRS'
export const UPDATE_ALL_TOKENS_IN_UNISWAP = 'UPDATE_ALL_TOKENS_IN_UNISWAP'
export const UPDATE_TOP_LPS = 'UPDATE_TOP_LPS'

//TokenData Constants
export const UPDATE_TOKEN_TXNS = 'UPDATE_TOKEN_TXNS'
export const UPDATE_CHART_DATA = 'UPDATE_CHART_DATA'
export const UPDATE_PRICE_DATA = 'UPDATE_PRICE_DATA'
export const UPDATE_TOP_TOKENS = ' UPDATE_TOP_TOKENS'
export const UPDATE_ALL_PAIRS = 'UPDATE_ALL_PAIRS'
export const TOKEN_PAIRS_KEY = 'TOKEN_PAIRS_KEY'
