import { SERVER_URL, YIELDS_SERVER_URL } from '~/constants'

// Yields APIs
export const YIELD_CHAIN_API = `${SERVER_URL}/chains`
export const YIELD_CHART_API = `${YIELDS_SERVER_URL}/chart`
export const YIELD_CHART_LEND_BORROW_API = `${YIELDS_SERVER_URL}/chartLendBorrow`
export const YIELD_CHART_LEND_BORROW_PROXY_API = '/api/public/datasets/chartLendBorrow'
export const YIELD_BORROW_API = '/api/public/datasets/borrow'
export const YIELD_BORROW_ADVANCED_API = '/api/public/datasets/borrow-advanced'
export const YIELD_POOLS_DATASET_API = '/api/public/datasets/yields/pools'
export const YIELD_LOOP_DATASET_API = '/api/public/datasets/yields/loop'
export const YIELD_STRATEGY_DATASET_API = '/api/public/datasets/yields/strategy'
export const YIELD_LONG_SHORT_STRATEGY_DATASET_API = '/api/public/datasets/yields/strategy-long-short'
export const YIELD_HALAL_DATASET_API = '/api/public/datasets/yields/halal'
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
export const YIELD_VOLATILITY_API = '/api/private/datasets/volatility'
export const YIELD_HOLDERS_API = '/api/public/datasets/holders'

export const UNBOUNDED_DEBT_CEILING_PROJECTS = ['liquity-v1', 'liquity-v2'] as const

export const lockupsRewards = ['Geist Finance', 'Radiant', 'Valas Finance', 'UwU Lend']

export const lockupsCollateral = [
	'Ribbon',
	'TrueFi',
	'Maple',
	'Clearpool',
	'Centrifuge',
	'UniCrypt',
	'Osmosis',
	'HedgeFarm',
	'BarnBridge',
	'WOOFi',
	'Kokoa Finance',
	'Lyra',
	'Arbor Finance',
	'Sommelier'
]

export const badDebt = ['moonwell-apollo', 'inverse-finance', 'venus', 'iron-bank']

export const exploitedProjects = ['resolv-protocol']
export const exploitedTokens = ['USR']

export function isExploitedPool(project: string, symbol: string): boolean {
	return exploitedProjects.includes(project) || exploitedTokens.some((t) => symbol?.toUpperCase().includes(t))
}

export const disclaimer =
	"DefiLlama doesn't audit nor endorse any of the protocols listed, we just focus on providing accurate data. Ape at your own risk."

export const earlyExit =
	'Rewards are calculated assuming an early exit penalty applies. So this is the minimum APY you can expect when claiming your rewards early.'
