import { ethers } from 'ethers'
import { SUBSCRIPTIONS_ABI } from './abi.subscriptions'

export const contractAddress = '0x543e186ae5c7fea674c489f50215ee8036e87897'

export const token = {
	address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
	name: 'DAI',
	decimals: 18,
	img: `https://token-icons.llamao.fi/icons/tokens/10/0xda10009cbd5d07dd0cecc66161fc93d7c9000da1`
}

export const optimism = {
	id: 10,
	name: 'Optimism',
	symbol: 'ETH'
}

function unscramble(str: string) {
	return str.split('').reduce(function (a, b) {
		return a + String.fromCharCode(b.charCodeAt(0) + 8)
	}, '')
}
const apiKey = unscramble('.[^+0](,0[+1,*\\YZY\\[(*+Z,][/**,]')

export const subgraphApi = `https://gateway-arbitrum.network.thegraph.com/api/${apiKey}/subgraphs/id/7SAiBm4sRAfPkHniw45Pw83GnyfE953p3LFr87N6XXwC`

export const periodDuration = 24 * 60 * 60

export const DIVISOR = 1e18

export const llamaAddress = '0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437'.toLowerCase()
export const subscriptionAmount = 300

export const SERVER_API = 'https://7zlw4f9i3e.execute-api.eu-central-1.amazonaws.com/prod'

export const SUBSCRIPTION_PERIOD = 30
export const SUBSCRIPTION_DURATION = SUBSCRIPTION_PERIOD * 24 * 60 * 60 // in seconds

export const SUBSCRIPTION_AMOUNT_DIVISOR = ethers.BigNumber.from(10).pow(18)

export const MAINNET_ENS_RESOLVER = '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C'

export const GH_CLIENT_ID = 'a4875845f837e731e0b4'

export const subsContractAddress = '0x8B6473801e466E543BAf0cB6c7Ea1C9321C3C816'

export const subsContract = new ethers.Contract(
	subsContractAddress,
	SUBSCRIPTIONS_ABI,
	new ethers.providers.JsonRpcProvider('https://mainnet.optimism.io/')
)

export const IS_PRO_API_ENABLED = false
