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
	iconUrl: chainIconUrl('boba'),
	name: 'Ethereum',
	symbol: 'ETH',
	decimals: 18
}

const harmony = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 1666600000,
	iconUrl: chainIconUrl('harmony'),
	decimals: 18,
	name: 'Harmony',
	symbol: 'ONE'
}

const heco = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 128,
	iconUrl: chainIconUrl('heco'),
	name: 'Huobi Token',
	symbol: 'HT'
}

const velas = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 106,
	iconUrl: chainIconUrl('velas'),
	name: 'Velas',
	symbol: 'VLX'
}

const oasis = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 24462,
	name: 'Oasis',
	symbol: 'ROSE',
	decimals: 18
}

const bttc = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 199,
	name: 'BitTorrent',
	iconUrl: chainIconUrl('bittorrent'),
	symbol: 'BTT',
	decimals: 18
}

const moonriver = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 1285,
	name: 'MoonRiver',
	iconUrl: chainIconUrl('moonriver'),
	symbol: 'MOVR',
	decimals: 18
}

const dogechain = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 2000,
	name: 'Doge',
	symbol: 'DOGE',
	decimals: 18
}

const cronos = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 25,
	name: 'Cronos',
	symbol: 'CRO',
	iconUrl: chainIconUrl('cronos'),
	decimals: 18
}
const celo = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 42220,
	name: 'Celo',
	symbol: 'CELO',
	decimals: 18
}
const aurora = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 1313161554,
	name: 'Ethereum',
	symbol: 'ETH',
	decimals: 18
}
const avax = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 43114,
	iconUrl: chainIconUrl('avalanche'),
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
	decimals: 18
}
const fantom = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 250,
	iconUrl: chainIconUrl('fantom'),
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
	decimals: 18
}
const polygon = {
	mcap: Number.MAX_SAFE_INTEGER,
	address: ethers.constants.AddressZero,
	chainId: 137,
	name: 'Matic',
	symbol: 'MATIC',
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
