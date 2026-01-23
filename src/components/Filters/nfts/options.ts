import { NFT_SETTINGS, type NftSettingKey } from '~/contexts/LocalStorage'
import type { ToggleOption } from '../types'

export const nftOptions: Array<ToggleOption<NftSettingKey>> = [
	{
		name: 'Display in USD',
		key: NFT_SETTINGS.DISPLAY_USD,
		help: 'Display metrics in USD'
	},
	{
		name: 'Hide last day',
		key: NFT_SETTINGS.HIDE_LAST_DAY,
		help: 'Hide the last day of data'
	}
]
