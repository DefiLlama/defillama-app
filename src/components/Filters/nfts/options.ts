import { NFT_SETTINGS } from '~/contexts/LocalStorage'

export const nftOptions = [
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
