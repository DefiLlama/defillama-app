import { liquidationsIconUrl } from '~/utils'

export const LIQUIDATIONS_TOTAL_BINS = 100

export const WRAPPED_GAS_TOKENS = ['WETH', 'WAVAX', 'WMATIC', 'WFTM', 'WBNB', 'WCRO', 'WONE']
export const SYMBOL_MAP: { [originSymbol: string]: string } = { BTCB: 'WBTC', BTC: 'WBTC' }

// AUTO-GENERATED: this list order can be refreshed by
// `bun src/containers/Liquidations/updateAssetOrderByTotalLiquidatable.ts`
export const DEFAULT_ASSETS_LIST_RAW: { name: string; symbol: string }[] = [
	{
		name: 'Ethereum',
		symbol: 'ETH'
	},
	{
		name: 'Wrapped Bitcoin',
		symbol: 'WBTC'
	},
	{
		name: 'Dai',
		symbol: 'DAI'
	},
	{
		name: 'Solana',
		symbol: 'SOL'
	},
	{
		name: 'Binance Coin',
		symbol: 'BNB'
	},
	{
		name: 'USD Coin',
		symbol: 'USDC'
	},
	{
		name: 'Lido Staked ETH',
		symbol: 'STETH'
	},
	{
		name: 'Lido Wrapped stETH',
		symbol: 'WSTETH'
	},
	{
		name: 'Lido Staked SOL',
		symbol: 'STSOL'
	},
	{
		name: 'Rocket Pool ETH',
		symbol: 'RETH'
	},
	{
		name: 'Marinade Staked SOL',
		symbol: 'MSOL'
	},
	{
		name: 'Tether',
		symbol: 'USDT'
	},
	{
		name: 'Solar Network',
		symbol: 'SXP'
	},
	{
		name: 'yearn.finance',
		symbol: 'YFI'
	},
	{
		name: 'FTX Token',
		symbol: 'FTT'
	},
	{
		name: 'Uniswap',
		symbol: 'UNI'
	},
	{
		name: 'PancakeSwap',
		symbol: 'CAKE'
	},
	{
		name: 'Cardano',
		symbol: 'ADA'
	},
	{
		name: 'Basic Attention',
		symbol: 'BAT'
	},
	{
		name: 'Binance USD',
		symbol: 'BUSD'
	},
	{
		name: 'Curve DAO',
		symbol: 'CRV'
	},
	{
		name: 'ChainLink',
		symbol: 'LINK'
	},
	{
		name: 'Tezos',
		symbol: 'XTZ'
	},
	{
		name: 'TrueUSD',
		symbol: 'TUSD'
	},
	{
		name: 'Aave',
		symbol: 'AAVE'
	},
	{
		name: 'MakerDAO',
		symbol: 'MKR'
	},
	{
		name: 'Avalanche',
		symbol: 'AVAX'
	},
	{
		name: 'Polygon',
		symbol: 'MATIC'
	},
	{
		name: 'Optimism',
		symbol: 'OP'
	},
	{
		name: 'SushiSwap',
		symbol: 'SUSHI'
	},
	{
		name: 'Synthetix',
		symbol: 'SNX'
	},
	{
		name: 'Trader Joe',
		symbol: 'JOE'
	},
	{
		name: 'Magic Internet Money',
		symbol: 'MIM'
	},
	{
		name: '0x',
		symbol: 'ZRX'
	},
	{
		name: 'Enjin Coin',
		symbol: 'ENJ'
	},
	{
		name: 'Decentraland',
		symbol: 'MANA'
	},
	{
		name: '1inch',
		symbol: '1INCH'
	},
	{
		name: 'REN',
		symbol: 'REN'
	}
]

// Disabled assets that are intentionally excluded from the default list.
// Keep these here (not as commented-out entries in `DEFAULT_ASSETS_LIST_RAW`) so the updater script
// can refresh ordering without dropping them.
// oxlint-disable-next-line no-unused-vars
const DISABLED_ASSETS_LIST_RAW: { name: string; symbol: string }[] = [
	{
		name: 'Binance Beacon ETH',
		symbol: 'BETH'
	},
	{
		name: 'Compound',
		symbol: 'COMP'
	},
	{
		name: 'Ampleforth',
		symbol: 'AMPL'
	},
	{
		name: 'Frax',
		symbol: 'FRAX'
	},
	{
		name: 'Fei USD',
		symbol: 'FEI'
	},
	{
		name: 'Rai Reflex Index',
		symbol: 'RAI'
	}
]

export const DEFAULT_ASSETS_LIST = DEFAULT_ASSETS_LIST_RAW.map(({ name, symbol }) => ({
	name,
	symbol,
	route: `/liquidations/${symbol.toLowerCase()}`,
	logo: liquidationsIconUrl(symbol.toLowerCase()),
	label: `${name} (${symbol.toUpperCase()})`,
	to: `/liquidations/${symbol.toLowerCase()}`
}))

export const PROTOCOL_NAMES_MAP = {
	'aave-v2': 'Aave V2',
	compound: 'Compound',
	euler: 'Euler',
	liquity: 'Liquity',
	maker: 'MakerDAO',
	'trader-joe-lend': 'Trader Joe',
	'mimo-protocol': 'Mimo',
	polygon: 'Polygon',
	ethereum: 'Ethereum',
	avalanche: 'Avalanche',
	solend: 'Solend',
	solana: 'Solana',
	benqi: 'Benqi',
	venus: 'Venus',
	bsc: 'BSC',
	angle: 'Angle',
	optimism: 'Optimism',
	arbitrum: 'Arbitrum',
	'gravita-protocol': 'Gravita',
	strike: 'Strike'
} as const

const buildProtocolNamesMapReverse = (): { [name: string]: string } => {
	const result: { [name: string]: string } = {}
	for (const key in PROTOCOL_NAMES_MAP) {
		const value = PROTOCOL_NAMES_MAP[key as keyof typeof PROTOCOL_NAMES_MAP]
		result[value] = key
	}
	return result
}
// oxlint-disable-next-line no-unused-vars
const PROTOCOL_NAMES_MAP_REVERSE = buildProtocolNamesMapReverse()
