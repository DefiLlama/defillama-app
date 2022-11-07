import { ethers } from 'ethers'
import { chainIconUrl } from '~/utils/index'

const ethereum = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 1,
	name: 'Ethereum',
	symbol: 'ETH',
	logoURI: chainIconUrl('ethereum'),
	decimals: 18
}

const binance = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 56,
	name: 'Binance',
	symbol: 'BNB',
	logoURI: chainIconUrl('binance'),
	decimals: 18
}

const arbitrum = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 42161,
	name: 'Ethereum',
	symbol: 'ETH',
	logoURI: chainIconUrl('ethereum'),
	decimals: 18
}

const optimism = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 10,
	name: 'Ethereum',
	symbol: 'ETH',
	logoURI: chainIconUrl('ethereum'),
	decimals: 18
}

const okx = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 66,
	name: 'OKX',
	symbol: 'OKX',
	logoURI: chainIconUrl('okexchain'),
	decimals: 18
}

const boba = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 288,
	logoURI: chainIconUrl('ethereum'),
	name: 'Ethereum',
	symbol: 'ETH',
	decimals: 18
}

const harmony = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 1666600000,
	logoURI: chainIconUrl('harmony'),
	decimals: 18,
	name: 'Harmony',
	symbol: 'ONE'
}

const heco = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 128,
	logoURI: chainIconUrl('heco'),
	name: 'Huobi Token',
	symbol: 'HT'
}

const velas = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 106,
	logoURI: chainIconUrl('velas'),
	name: 'Velas',
	symbol: 'VLX'
}

const oasis = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 24462,
	name: 'Oasis',
	symbol: 'ROSE',
	logoURI: chainIconUrl('oasis'),
	decimals: 18
}

const bttc = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 199,
	name: 'BitTorrent',
	logoURI: chainIconUrl('bittorrent'),
	symbol: 'BTT',
	decimals: 18
}

const moonriver = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 1285,
	name: 'MoonRiver',
	logoURI: chainIconUrl('moonriver'),
	symbol: 'MOVR',
	decimals: 18
}

const dogechain = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 2000,
	name: 'Doge',
	symbol: 'DOGE',
	decimals: 18,
	logoURI: chainIconUrl('dogechain')
}

const cronos = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 25,
	name: 'Cronos',
	symbol: 'CRO',
	logoURI: chainIconUrl('cronos'),
	decimals: 18
}
const celo = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 42220,
	name: 'Celo',
	symbol: 'CELO',
	logoURI: chainIconUrl('celo'),
	decimals: 18
}
const aurora = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 1313161554,
	name: 'Ethereum',
	symbol: 'ETH',
	logoURI: chainIconUrl('ethereum'),
	decimals: 18
}
const avax = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 43114,
	logoURI: chainIconUrl('avalanche'),
	name: 'Avalanche',
	symbol: 'AVAX',
	decimals: 18
}

const klaytn = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 8217,
	name: 'Klaytn',
	symbol: 'KLAY',
	logoURI: chainIconUrl('klaytn'),
	decimals: 18
}
const fantom = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 250,
	logoURI: chainIconUrl('fantom'),
	name: 'Fantom',
	symbol: 'FTM',
	decimals: 18
}

const gnosis = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 100,
	name: 'xDai',
	symbol: 'xDai',
	logoURI: chainIconUrl('gnosis'),
	decimals: 18
}
const polygon = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 137,
	name: 'Matic',
	symbol: 'MATIC',
	logoURI: chainIconUrl('polygon'),
	decimals: 18
}

export const nativeTokens = [
	ethereum,
	arbitrum,
	binance,
	optimism,
	polygon,
	oasis,
	oasis,
	fantom,
	velas,
	harmony,
	gnosis,
	klaytn,
	avax,
	aurora,
	cronos,
	celo,
	dogechain,
	moonriver,
	bttc,
	heco,
	boba,
	okx
]
