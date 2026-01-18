import { TVL_SETTINGS, FEES_SETTINGS, type TvlSettingsKey, type FeesSettingKey } from '~/contexts/LocalStorage'
import type { ToggleOption } from './types'

export const tvlOptions: Array<ToggleOption<TvlSettingsKey>> = [
	{
		name: 'Staking',
		key: TVL_SETTINGS.STAKING,
		help: 'Include governance tokens staked in the protocol'
	},
	{
		name: 'Pool2',
		key: TVL_SETTINGS.POOL2,
		help: 'Include staked lp tokens where one of the coins in the pair is the governance token'
	},
	{
		name: 'Gov Tokens',
		key: TVL_SETTINGS.GOV_TOKENS,
		help: 'Include governance tokens'
	},
	{
		name: 'Borrows',
		key: TVL_SETTINGS.BORROWED,
		help: 'Include borrowed coins in lending protocols'
	},
	{
		name: 'Double Count',
		key: TVL_SETTINGS.DOUBLE_COUNT,
		help: 'Include TVL of protocols which TVL feeds into another protocol'
	},
	{
		name: 'Liquid Staking',
		key: TVL_SETTINGS.LIQUID_STAKING,
		help: 'Include Rewards/Liquidity for staked assets'
	},
	{
		name: 'Vesting',
		key: TVL_SETTINGS.VESTING,
		help: 'Include tokens that are not circulating or not issued yet'
	}
]

export const feesOptions: Array<ToggleOption<FeesSettingKey>> = [
	{ name: 'Bribes', key: FEES_SETTINGS.BRIBES, help: null },
	{ name: 'Token Tax', key: FEES_SETTINGS.TOKENTAX, help: null }
]

export const tvlOptionsMap = new Map(tvlOptions.map((option) => [option.key, option]))
export const feesOptionsMap = new Map(feesOptions.map((option) => [option.key, option]))
