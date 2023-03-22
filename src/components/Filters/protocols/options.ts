import { DEFI_SETTINGS } from '~/contexts/LocalStorage'

export const protocolsAndChainsOptions = [
	{
		name: 'Staking',
		key: DEFI_SETTINGS.STAKING,
		help: 'Include governance tokens staked in the protocol'
	},
	{
		name: 'Pool2',
		key: DEFI_SETTINGS.POOL2,
		help: 'Include staked lp tokens where one of the coins in the pair is the governance token'
	},
	{
		name: 'Borrows',
		key: DEFI_SETTINGS.BORROWED,
		help: 'Include borrowed coins in lending protocols'
	},
	{
		name: 'Double Count',
		key: DEFI_SETTINGS.DOUBLE_COUNT,
		help: 'Include TVL of protocols which TVL feeds into another protocol'
	},
	{
		name: 'Liquid Staking',
		key: DEFI_SETTINGS.LIQUID_STAKING,
		help: 'Include Rewards/Liquidity for staked assets'
	},
	{
		name: 'Vesting',
		key: DEFI_SETTINGS.VESTING
	},
	{
		name: 'Offers',
		key: DEFI_SETTINGS.OFFERS
	}
]
