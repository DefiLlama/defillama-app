import { DEFI_SETTINGS } from '~/contexts/LocalStorage'

const { POOL2, STAKING, BORROWED, DOUBLE_COUNT, LIQUID_STAKING } = DEFI_SETTINGS

export const protocolsAndChainsOptions = [
	{
		name: 'Staking',
		key: STAKING,
		help: 'Include governance tokens staked in the protocol'
	},
	{
		name: 'Pool2',
		key: POOL2,
		help: 'Include staked lp tokens where one of the coins in the pair is the governance token'
	},
	{
		name: 'Borrows',
		key: BORROWED,
		help: 'Include borrowed coins in lending protocols'
	},
	{
		name: 'Double Count',
		key: DOUBLE_COUNT,
		help: 'Include TVL of protocols which TVL feeds into another protocol'
	},
	{
		name: 'Liquid Staking',
		key: LIQUID_STAKING,
		help: 'Include Rewards/Liquidity for staked assets'
	}
]
